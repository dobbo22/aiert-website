// Shared low-level helper for the Facebook/Instagram Graph API — both use
// the same Page access token and REST conventions.
export const GRAPH_VERSION = "v26.0";
export const API_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export function pageToken(): string {
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!token) throw new Error("Missing FACEBOOK_PAGE_ACCESS_TOKEN environment variable");
  return token;
}

export async function graphFetch(
  path: string,
  params: Record<string, string>,
  method: "GET" | "POST" = "GET"
) {
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
