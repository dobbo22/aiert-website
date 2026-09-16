import crypto from "crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API_BASE = "https://www.googleapis.com/webmasters/v3";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} environment variable`);
  return value;
}

function siteUrl(): string {
  return process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL || "sc-domain:mailbroom.app";
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.value;
  }

  const email = requireEnv("GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL");
  const privateKey = requireEnv("GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY").replace(/\\n/g, "\n");

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: email,
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };

  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  const signature = crypto.createSign("RSA-SHA256").update(unsigned).sign(privateKey);
  const jwt = `${unsigned}.${base64url(signature)}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error_description || json?.error || `Google token exchange failed (${res.status})`);
  }

  cachedToken = { value: json.access_token as string, expiresAt: Date.now() + json.expires_in * 1000 };
  return cachedToken.value;
}

export type SearchAnalyticsRow = {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

async function queryAnalytics(opts: {
  startDate: string;
  endDate: string;
  dimensions?: string[];
  rowLimit?: number;
}): Promise<SearchAnalyticsRow[]> {
  const token = await getAccessToken();
  const res = await fetch(
    `${API_BASE}/sites/${encodeURIComponent(siteUrl())}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: opts.startDate,
        endDate: opts.endDate,
        dimensions: opts.dimensions ?? [],
        rowLimit: opts.rowLimit ?? 1000,
      }),
    }
  );
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message || `Search Console query failed (${res.status})`);
  }
  return json.rows ?? [];
}

export type SubdomainBreakdown = {
  host: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

function groupByHost(rows: SearchAnalyticsRow[]): SubdomainBreakdown[] {
  const byHost = new Map<string, { clicks: number; impressions: number; weightedPosition: number }>();
  for (const row of rows) {
    let host: string;
    try {
      host = new URL(row.keys[0]).hostname;
    } catch {
      host = "unknown";
    }
    const entry = byHost.get(host) ?? { clicks: 0, impressions: 0, weightedPosition: 0 };
    entry.clicks += row.clicks;
    entry.impressions += row.impressions;
    entry.weightedPosition += row.position * row.impressions;
    byHost.set(host, entry);
  }
  return Array.from(byHost.entries())
    .map(([host, e]) => ({
      host,
      clicks: e.clicks,
      impressions: e.impressions,
      ctr: e.impressions ? e.clicks / e.impressions : 0,
      position: e.impressions ? e.weightedPosition / e.impressions : 0,
    }))
    .sort((a, b) => b.impressions - a.impressions);
}

export type SearchPerformance = {
  siteUrl: string;
  startDate: string;
  endDate: string;
  totals: { clicks: number; impressions: number; ctr: number; position: number };
  topQueries: SearchAnalyticsRow[];
  topPages: SearchAnalyticsRow[];
  bySubdomain: SubdomainBreakdown[];
};

export async function getSearchPerformance(days = 28): Promise<SearchPerformance> {
  const end = new Date();
  end.setDate(end.getDate() - 3); // GSC data typically lags 2-3 days
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const startDate = fmt(start);
  const endDate = fmt(end);

  const [totalsRows, topQueries, allPages] = await Promise.all([
    queryAnalytics({ startDate, endDate }),
    queryAnalytics({ startDate, endDate, dimensions: ["query"], rowLimit: 10 }),
    queryAnalytics({ startDate, endDate, dimensions: ["page"], rowLimit: 5000 }),
  ]);

  const totals = totalsRows[0] ?? { clicks: 0, impressions: 0, ctr: 0, position: 0 };
  const topPages = [...allPages].sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions).slice(0, 10);

  return {
    siteUrl: siteUrl(),
    startDate,
    endDate,
    totals: {
      clicks: totals.clicks ?? 0,
      impressions: totals.impressions ?? 0,
      ctr: totals.ctr ?? 0,
      position: totals.position ?? 0,
    },
    topQueries,
    topPages,
    bySubdomain: groupByHost(allPages),
  };
}

export type DailySnapshot = {
  date: string;
  overall: { clicks: number; impressions: number; ctr: number; position: number };
  byHost: SubdomainBreakdown[];
};

export async function getDailySnapshot(date: string): Promise<DailySnapshot> {
  const [totalsRows, pages] = await Promise.all([
    queryAnalytics({ startDate: date, endDate: date }),
    queryAnalytics({ startDate: date, endDate: date, dimensions: ["page"], rowLimit: 5000 }),
  ]);
  const t = totalsRows[0] ?? { clicks: 0, impressions: 0, ctr: 0, position: 0 };
  return {
    date,
    overall: {
      clicks: t.clicks ?? 0,
      impressions: t.impressions ?? 0,
      ctr: t.ctr ?? 0,
      position: t.position ?? 0,
    },
    byHost: groupByHost(pages),
  };
}
