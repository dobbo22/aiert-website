const API_BASE = "https://oauth.reddit.com";
const TOKEN_URL = "https://www.reddit.com/api/v1/access_token";

function creds() {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  const refreshToken = process.env.REDDIT_REFRESH_TOKEN;
  const userAgent = process.env.REDDIT_USER_AGENT;
  if (!clientId || !clientSecret || !refreshToken || !userAgent) {
    throw new Error(
      "Missing REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_REFRESH_TOKEN, or REDDIT_USER_AGENT"
    );
  }
  return { clientId, clientSecret, refreshToken, userAgent };
}

export function redditConfigured(): boolean {
  return Boolean(
    process.env.REDDIT_CLIENT_ID &&
      process.env.REDDIT_CLIENT_SECRET &&
      process.env.REDDIT_REFRESH_TOKEN &&
      process.env.REDDIT_USER_AGENT
  );
}

// Reddit access tokens last ~1h; cached in-process so a burst of admin
// requests doesn't re-authenticate on every call.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;
  const { clientId, clientSecret, refreshToken, userAgent } = creds();

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "User-Agent": userAgent,
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || `Reddit token refresh failed (${res.status})`);

  cachedToken = { value: json.access_token, expiresAt: Date.now() + (json.expires_in - 60) * 1000 };
  return cachedToken.value;
}

async function redditFetch(path: string, params: Record<string, string> = {}, method: "GET" | "POST" = "GET") {
  const token = await accessToken();
  const { userAgent } = creds();
  const headers: Record<string, string> = { Authorization: `Bearer ${token}`, "User-Agent": userAgent };

  let url = `${API_BASE}${path}`;
  const init: RequestInit = { method, headers };

  if (method === "GET") {
    const qs = new URLSearchParams(params).toString();
    if (qs) url += `?${qs}`;
  } else {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    init.body = new URLSearchParams({ ...params, api_type: "json" });
  }

  const res = await fetch(url, init);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || `Reddit API error (${res.status})`);
  return json;
}

export type RedditIdentity = { username: string };

export async function whoami(): Promise<RedditIdentity> {
  const json = await redditFetch("/api/v1/me");
  return { username: json.name as string };
}

export type Subreddit = {
  name: string;
  displayNamePrefixed: string;
  subscribers: number;
  url: string;
};

export async function listSubscribedSubreddits(limit = 100): Promise<Subreddit[]> {
  const json = await redditFetch("/subreddits/mine/subscriber", { limit: String(limit) });
  type Child = {
    data: { display_name: string; display_name_prefixed: string; subscribers: number; url: string };
  };
  return ((json.data?.children ?? []) as Child[]).map((c) => ({
    name: c.data.display_name,
    displayNamePrefixed: c.data.display_name_prefixed,
    subscribers: c.data.subscribers,
    url: c.data.url,
  }));
}

export type RedditPost = {
  id: string;
  title: string;
  subreddit: string;
  createdUtc: number;
  permalink: string;
  numComments: number;
  score: number;
};

export async function listMyRecentPosts(limit = 10): Promise<RedditPost[]> {
  const { username } = await whoami();
  const json = await redditFetch(`/user/${username}/submitted`, { limit: String(limit), sort: "new" });
  type Child = {
    data: {
      id: string;
      title: string;
      subreddit_name_prefixed: string;
      created_utc: number;
      permalink: string;
      num_comments: number;
      score: number;
    };
  };
  return ((json.data?.children ?? []) as Child[]).map((c) => ({
    id: c.data.id,
    title: c.data.title,
    subreddit: c.data.subreddit_name_prefixed,
    createdUtc: c.data.created_utc,
    permalink: `https://reddit.com${c.data.permalink}`,
    numComments: c.data.num_comments,
    score: c.data.score,
  }));
}

// Posts a self (text) post as the authenticated account. Reddit's API
// returns HTTP 200 even on rejection (e.g. subreddit rules, rate limits,
// "already submitted"), so callers must check json.errors before trusting it.
export async function submitTextPost(subreddit: string, title: string, text: string): Promise<string> {
  const json = await redditFetch(
    "/api/submit",
    { sr: subreddit, kind: "self", title, text, resubmit: "true" },
    "POST"
  );
  const errors = json.json?.errors as [string, string, string][] | undefined;
  if (errors && errors.length > 0) {
    throw new Error(errors.map((e) => e.slice(0, 2).join(": ")).join("; "));
  }
  return (json.json?.data?.url as string) ?? (json.json?.data?.name as string) ?? "posted";
}
