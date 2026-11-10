// Comment as the AIERT LTD page on someone else's post. Everything is reviewed by Martin first; this module only enforces the
// safety rules: one comment per post, a small daily limit, no links, and only linkedin.com pages are ever fetched.
import sql from "@/lib/db";
import { replyAsPage } from "./linkedinApi";
import { parsePostLink, parsePreview, commentProblem, SHORT_HOSTS, LINKEDIN_HOSTS, MAX_OUTBOUND_PER_DAY, type Preview } from "./linkedinPostLink";

let ready: Promise<unknown> | null = null;
function ensureTable() {
  ready ??= sql`CREATE TABLE IF NOT EXISTS linkedin_outbound_comments (
    post_key text PRIMARY KEY, post_urn text NOT NULL, author text NOT NULL DEFAULT '', text text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`;
  return ready;
}

// lnkd.in short links redirect to the real post; follow one hop by hand so only linkedin.com is ever fetched.
export async function resolveLink(url: string): Promise<string> {
  let u: URL;
  try { u = new URL(url.trim()); } catch { throw new Error("That is not a link"); }
  if (SHORT_HOSTS.includes(u.hostname)) {
    const r = await fetch(u.toString(), { redirect: "manual", headers: { "user-agent": "Mozilla/5.0" } });
    const loc = r.headers.get("location");
    if (!loc) throw new Error("Could not open that short link");
    u = new URL(loc);
  }
  if (!LINKEDIN_HOSTS.includes(u.hostname)) throw new Error("Only linkedin.com post links are accepted");
  return u.toString();
}

export async function previewPost(url: string): Promise<{ resolved: string; key: string; preview: Preview; alreadyDone: boolean; usedToday: number }> {
  await ensureTable();
  const resolved = await resolveLink(url);
  const link = parsePostLink(resolved);
  if (!link) throw new Error("That does not look like a LinkedIn post link");
  let preview: Preview = { author: "", text: "" };
  try {
    const res = await fetch(resolved, { headers: { "user-agent": "Mozilla/5.0" }, redirect: "follow" });
    if (res.ok && LINKEDIN_HOSTS.includes(new URL(res.url).hostname)) preview = parsePreview(await res.text());
  } catch { /* a preview is a nice-to-have */ }
  const done = (await sql`SELECT 1 FROM linkedin_outbound_comments WHERE post_key = ${link.key}`) as unknown[];
  return { resolved, key: link.key, preview, alreadyDone: done.length > 0, usedToday: await usedToday() };
}

async function usedToday(): Promise<number> {
  const r = (await sql`SELECT COUNT(*)::int AS n FROM linkedin_outbound_comments WHERE created_at > now() - interval '24 hours'`) as { n: number }[];
  return r[0]?.n ?? 0;
}

export async function commentOnPost(url: string, text: string, author = ""): Promise<{ urn: string }> {
  await ensureTable();
  const bad = commentProblem(text);
  if (bad) throw new Error(bad);
  const link = parsePostLink(await resolveLink(url));
  if (!link) throw new Error("That does not look like a LinkedIn post link");
  if ((await usedToday()) >= MAX_OUTBOUND_PER_DAY) throw new Error(`Daily limit reached (${MAX_OUTBOUND_PER_DAY} comments on other people's posts a day)`);
  // Claim the post first so a double click cannot comment twice; released again if every candidate fails.
  const claim = (await sql`INSERT INTO linkedin_outbound_comments (post_key, post_urn, author, text) VALUES (${link.key}, '', ${author}, ${text.trim()}) ON CONFLICT DO NOTHING RETURNING post_key`) as unknown[];
  if (!claim.length) throw new Error("The page has already commented on this post");
  let lastErr = "";
  for (const urn of link.candidates) {
    try {
      await replyAsPage(urn, text);
      await sql`UPDATE linkedin_outbound_comments SET post_urn = ${urn} WHERE post_key = ${link.key}`;
      return { urn };
    } catch (e) {
      lastErr = e instanceof Error ? e.message : "failed";
      if (!lastErr.includes("(404)")) break; // a 404 means wrong kind of id: try the next; anything else is final
    }
  }
  await sql`DELETE FROM linkedin_outbound_comments WHERE post_key = ${link.key}`;
  throw new Error(lastErr.includes("(404)") ? "LinkedIn could not find that post (it may be private, deleted or not open to pages)" : lastErr);
}

export async function recentOutbound(limit = 10): Promise<{ post_key: string; post_urn: string; author: string; text: string; created_at: string }[]> {
  await ensureTable();
  return (await sql`SELECT post_key, post_urn, author, text, created_at FROM linkedin_outbound_comments WHERE post_urn <> '' ORDER BY created_at DESC LIMIT ${limit}`) as never;
}
