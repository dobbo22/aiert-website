import { graphFetch, pageToken } from "./metaGraph";

function igUserId(): string {
  const id = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  if (!id) throw new Error("Missing INSTAGRAM_BUSINESS_ACCOUNT_ID environment variable");
  return id;
}

export type InstagramMedia = {
  id: string;
  caption?: string;
  media_url?: string;
  permalink?: string;
  timestamp: string;
  comments_count?: number;
};

export async function listMedia(limit = 12): Promise<InstagramMedia[]> {
  const json = await graphFetch(`/${igUserId()}/media`, {
    fields: "caption,media_url,permalink,timestamp,comments_count",
    limit: String(limit),
    access_token: pageToken(),
  });
  return json.data ?? [];
}

export async function createMediaContainer(caption: string, imageUrl: string): Promise<string> {
  const json = await graphFetch(
    `/${igUserId()}/media`,
    { image_url: imageUrl, caption, access_token: pageToken() },
    "POST"
  );
  return json.id as string;
}

export async function publishMediaContainer(containerId: string): Promise<string> {
  const json = await graphFetch(
    `/${igUserId()}/media_publish`,
    { creation_id: containerId, access_token: pageToken() },
    "POST"
  );
  return json.id as string;
}

export type InstagramComment = {
  id: string;
  text: string;
  timestamp: string;
  username?: string;
};

export async function listInstagramComments(mediaId: string): Promise<InstagramComment[]> {
  const json = await graphFetch(`/${mediaId}/comments`, {
    fields: "text,timestamp,username",
    limit: "25",
    access_token: pageToken(),
  });
  return json.data ?? [];
}

export async function replyToInstagramComment(commentId: string, message: string): Promise<string> {
  const json = await graphFetch(`/${commentId}/replies`, { message, access_token: pageToken() }, "POST");
  return json.id as string;
}
