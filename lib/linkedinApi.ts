// LinkedIn Posts API for the AIERT LTD company page (Community Management API).
// Needs env LINKEDIN_ACCESS_TOKEN (member token with w_organization_social,
// r_organization_social and rw_organization_admin; ~60 days, renew with
// `npm run linkedin:auth`) and LINKEDIN_ORG_URN (urn:li:organization:<id>).
//
// Gotcha: without rw_organization_admin every write returns 403.

import { unstable_cache } from "next/cache";

const API_BASE = "https://api.linkedin.com/rest";
const LINKEDIN_VERSION = "202604"; // YYYYMM; LinkedIn sunsets old versions, bump periodically
export const MAX_COMMENTARY_LENGTH = 3000;

function config() {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  const org = process.env.LINKEDIN_ORG_URN;
  if (!token || !org) throw new Error("Missing LINKEDIN_ACCESS_TOKEN or LINKEDIN_ORG_URN environment variable");
  return { token, org };
}

export function linkedinConfigured(): boolean {
  return Boolean(process.env.LINKEDIN_ACCESS_TOKEN && process.env.LINKEDIN_ORG_URN);
}

export async function linkedinGet(path: string): Promise<unknown> {
  const { token } = config();
  const res = await fetch(`${API_BASE}/${path}`, { headers: headers(token), cache: "no-store" });
  if (!res.ok) throw await failure(`LinkedIn ${path.split("?")[0]}`, res);
  return res.json();
}

export function orgUrn(): string {
  return config().org;
}

function headers(token: string, extra: Record<string, string> = {}) {
  return {
    Authorization: `Bearer ${token}`,
    "X-Restli-Protocol-Version": "2.0.0",
    "Linkedin-Version": LINKEDIN_VERSION,
    ...extra,
  };
}

async function failure(what: string, res: Response): Promise<Error> {
  const body = await res.text();
  if (res.status === 401) return new Error(`${what}: LinkedIn token expired or revoked. Run npm run linkedin:auth and update LINKEDIN_ACCESS_TOKEN.`);
  return new Error(`${what} failed (${res.status}): ${body.slice(0, 300)}`);
}

// LinkedIn parses post text as "little text": ( ) [ ] { } < > | @ \ # * _ ~ are markup,
// and an unescaped ( or [ can cut the post off at that point. Escape them all,
// but leave #hashtags alone so LinkedIn still turns them into hashtag links.
export function escapeCommentary(text: string): string {
  return text.replace(/#(?=\w)|[\\|{}@\[\]()<>#*_~]/g, (ch) => (ch === "#" ? "#" : `\\${ch}`));
}

async function uploadImage(token: string, org: string, bytes: Buffer): Promise<string> {
  const init = await fetch(`${API_BASE}/images?action=initializeUpload`, {
    method: "POST",
    headers: headers(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({ initializeUploadRequest: { owner: org } }),
  });
  if (!init.ok) throw await failure("LinkedIn image init", init);
  const { value } = await init.json();

  const put = await fetch(value.uploadUrl, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: new Uint8Array(bytes),
  });
  if (!put.ok) throw await failure("LinkedIn image upload", put);
  return value.image as string;
}

export type CreatePostResult = { urn: string; url: string };

export async function createLinkedInPost(text: string, image?: { bytes: Buffer }): Promise<CreatePostResult> {
  const { token, org } = config();
  const commentary = escapeCommentary(text.trim());
  if (!commentary) throw new Error("Post text is required");
  if (commentary.length > MAX_COMMENTARY_LENGTH) {
    throw new Error(`Post text is ${commentary.length} characters; LinkedIn's limit is ${MAX_COMMENTARY_LENGTH}`);
  }

  const body: Record<string, unknown> = {
    author: org,
    commentary,
    visibility: "PUBLIC",
    distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  };
  if (image) body.content = { media: { id: await uploadImage(token, org, image.bytes) } };

  const res = await fetch(`${API_BASE}/posts`, {
    method: "POST",
    headers: headers(token, { "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (res.status !== 201) throw await failure("LinkedIn post", res);
  const urn = res.headers.get("x-restli-id") ?? "";
  return { urn, url: `https://www.linkedin.com/feed/update/${urn}/` };
}

export type LinkedInPost = {
  urn: string;
  text: string;
  createdAt: string;
  url: string;
  hasMedia: boolean;
};

// Undo escapeCommentary / hashtag templates so the dashboard shows readable text.
function readable(commentary: string): string {
  return commentary
    .replace(/\{hashtag\|\\?#\|([^}]+)\}/g, "#$1")
    .replace(/\\([\\|{}@\[\]()<>#*_~])/g, "$1");
}

async function listLinkedInPostsUncached(count = 15): Promise<LinkedInPost[]> {
  const { token, org } = config();
  const url = `${API_BASE}/posts?author=${encodeURIComponent(org)}&q=author&count=${count}&sortBy=LAST_MODIFIED`;
  const res = await fetch(url, { headers: headers(token), cache: "no-store" });
  if (!res.ok) throw await failure("LinkedIn posts list", res);
  const json = await res.json();
  return (json.elements ?? []).map((p: { id: string; commentary?: string; createdAt?: number; content?: unknown }) => ({
    urn: p.id,
    text: readable(p.commentary ?? ""),
    createdAt: new Date(p.createdAt ?? Date.now()).toISOString(),
    url: `https://www.linkedin.com/feed/update/${p.id}/`,
    hasMedia: Boolean(p.content),
  }));
}

// Development Tier allows 100 calls a day per member, so the posts list is cached for 10 minutes.
export const listLinkedInPosts = unstable_cache(listLinkedInPostsUncached, ["linkedin-posts-list"], { revalidate: 600 });
