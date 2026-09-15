const GRAPH_VERSION = "v26.0";
const API_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

function pageId(): string {
  const id = process.env.FACEBOOK_PAGE_ID;
  if (!id) throw new Error("Missing FACEBOOK_PAGE_ID environment variable");
  return id;
}

function pageToken(): string {
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!token) throw new Error("Missing FACEBOOK_PAGE_ACCESS_TOKEN environment variable");
  return token;
}

async function graphFetch(path: string, params: Record<string, string>, method: "GET" | "POST" = "GET") {
  const url = new URL(`${API_BASE}${path}`);
  if (method === "GET") {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error?.message || `Graph API request failed (${res.status})`);
    return json;
  }
  url.searchParams.set("access_token", params.access_token);
  const body = new URLSearchParams(params);
  const res = await fetch(url, { method: "POST", body });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `Graph API request failed (${res.status})`);
  return json;
}

export type FacebookPost = {
  id: string;
  message?: string;
  created_time: string;
  permalink_url?: string;
  full_picture?: string;
  comments?: { summary: { total_count: number } };
};

export async function listPagePosts(limit = 10): Promise<FacebookPost[]> {
  const json = await graphFetch(`/${pageId()}/posts`, {
    fields: "message,created_time,permalink_url,full_picture,comments.summary(true)",
    limit: String(limit),
    access_token: pageToken(),
  });
  return json.data ?? [];
}

export async function createTextPost(message: string): Promise<string> {
  const json = await graphFetch(`/${pageId()}/feed`, { message, access_token: pageToken() }, "POST");
  return json.id as string;
}

export async function createPhotoPost(message: string, imageBytes: Buffer, filename: string): Promise<string> {
  const form = new FormData();
  form.append("caption", message);
  form.append("access_token", pageToken());
  form.append("source", new Blob([new Uint8Array(imageBytes)]), filename);

  const res = await fetch(`${API_BASE}/${pageId()}/photos`, { method: "POST", body: form });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `Photo post failed (${res.status})`);
  return json.post_id as string;
}

export type FacebookComment = {
  id: string;
  message: string;
  created_time: string;
  like_count: number;
  from?: { name: string };
};

export async function listComments(postId: string): Promise<FacebookComment[]> {
  const json = await graphFetch(`/${postId}/comments`, {
    fields: "message,from,created_time,like_count",
    limit: "25",
    access_token: pageToken(),
  });
  return json.data ?? [];
}

export async function replyToComment(commentId: string, message: string): Promise<string> {
  const json = await graphFetch(`/${commentId}/comments`, { message, access_token: pageToken() }, "POST");
  return json.id as string;
}

export async function likeComment(commentId: string): Promise<void> {
  await graphFetch(`/${commentId}/likes`, { access_token: pageToken() }, "POST");
}
