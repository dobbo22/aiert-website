// Threads has its own API host and its own access token/App ID — distinct
// from the Facebook/Instagram Graph API and FACEBOOK_PAGE_ACCESS_TOKEN.
const API_BASE = "https://graph.threads.net/v1.0";

function accessToken(): string {
  const token = process.env.THREADS_ACCESS_TOKEN;
  if (!token) throw new Error("Missing THREADS_ACCESS_TOKEN environment variable");
  return token;
}

function userId(): string {
  const id = process.env.THREADS_USER_ID;
  if (!id) throw new Error("Missing THREADS_USER_ID environment variable");
  return id;
}

async function graphFetch(path: string, params: Record<string, string>, method: "GET" | "POST" = "GET") {
  const url = new URL(`${API_BASE}${path}`);
  if (method === "GET") {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error?.message || `Threads API request failed (${res.status})`);
    return json;
  }
  url.searchParams.set("access_token", params.access_token);
  const body = new URLSearchParams(params);
  const res = await fetch(url, { method: "POST", body });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `Threads API request failed (${res.status})`);
  return json;
}

export type ThreadsPost = {
  id: string;
  text?: string;
  permalink?: string;
  timestamp: string;
};

export async function listThreads(limit = 15): Promise<ThreadsPost[]> {
  const json = await graphFetch(`/${userId()}/threads`, {
    fields: "text,permalink,timestamp",
    limit: String(limit),
    access_token: accessToken(),
  });
  return json.data ?? [];
}

// Threads recommends waiting for the container to finish processing before
// publishing rather than publishing immediately — polling its status is
// faster in practice than the ~30s blind wait the docs suggest.
async function waitForContainerReady(containerId: string): Promise<void> {
  const deadline = Date.now() + 25_000;
  while (Date.now() < deadline) {
    const json = await graphFetch(`/${containerId}`, {
      fields: "status,error_message",
      access_token: accessToken(),
    });
    if (json.status === "FINISHED") return;
    if (json.status === "ERROR") throw new Error(json.error_message || "Threads container failed to process");
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("Timed out waiting for Threads container to finish processing");
}

export async function createTextThread(text: string): Promise<string> {
  const containerJson = await graphFetch(
    `/${userId()}/threads`,
    { media_type: "TEXT", text, access_token: accessToken() },
    "POST"
  );
  await waitForContainerReady(containerJson.id);
  const publishJson = await graphFetch(
    `/${userId()}/threads_publish`,
    { creation_id: containerJson.id, access_token: accessToken() },
    "POST"
  );
  return publishJson.id as string;
}

export type ThreadsReply = {
  id: string;
  text?: string;
  timestamp: string;
  username?: string;
};

export async function listReplies(threadId: string): Promise<ThreadsReply[]> {
  const json = await graphFetch(`/${threadId}/replies`, {
    fields: "text,timestamp,username",
    access_token: accessToken(),
  });
  return json.data ?? [];
}

export async function replyToThread(threadId: string, text: string): Promise<string> {
  const containerJson = await graphFetch(
    `/${userId()}/threads`,
    { media_type: "TEXT", text, reply_to_id: threadId, access_token: accessToken() },
    "POST"
  );
  await waitForContainerReady(containerJson.id);
  const publishJson = await graphFetch(
    `/${userId()}/threads_publish`,
    { creation_id: containerJson.id, access_token: accessToken() },
    "POST"
  );
  return publishJson.id as string;
}
