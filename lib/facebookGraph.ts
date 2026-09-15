import { API_BASE, graphFetch, pageToken } from "./metaGraph";

function pageId(): string {
  const id = process.env.FACEBOOK_PAGE_ID;
  if (!id) throw new Error("Missing FACEBOOK_PAGE_ID environment variable");
  return id;
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
