// LinkedIn analytics for the AIERT LTD page via the Community Management API.
// Needs the same token as lib/linkedinApi.ts (r_organization_social + rw_organization_admin).
// LinkedIn only returns breakdowns once there are enough viewers, so small pages show few rows.
import { linkedinGet, orgUrn } from "./linkedinApi";

export type PostStats = { impressions: number; uniqueImpressions: number; clicks: number; reactions: number; comments: number; shares: number; engagement: number };
export type Breakdown = { label: string; value: number };
export type PageOverview = {
  followers: number;
  pageViews: number;
  last30: { impressions: number; clicks: number; reactions: number; comments: number; shares: number };
  viewersBy: { industry: Breakdown[]; seniority: Breakdown[]; function: Breakdown[]; country: Breakdown[] };
  followersBy: { industry: Breakdown[]; seniority: Breakdown[]; function: Breakdown[]; country: Breakdown[] };
};

type Totals = { impressionCount?: number; uniqueImpressionsCount?: number; clickCount?: number; likeCount?: number; commentCount?: number; shareCount?: number; engagement?: number };
const toStats = (t: Totals = {}): PostStats => ({
  impressions: t.impressionCount ?? 0,
  uniqueImpressions: t.uniqueImpressionsCount ?? 0,
  clicks: t.clickCount ?? 0,
  reactions: t.likeCount ?? 0,
  comments: t.commentCount ?? 0,
  shares: t.shareCount ?? 0,
  engagement: t.engagement ?? 0,
});

const enc = encodeURIComponent;

// Stats per post. Plain posts are "share" URNs, video/media posts are "ugcPost" URNs; LinkedIn wants them in separate parameters.
export async function getPostStats(urns: string[]): Promise<Record<string, PostStats>> {
  const out: Record<string, PostStats> = {};
  const org = enc(orgUrn());
  const shares = urns.filter((u) => u.includes(":share:"));
  const ugc = urns.filter((u) => u.includes(":ugcPost:"));
  const run = async (param: string, list: string[], key: "share" | "ugcPost") => {
    if (!list.length) return;
    try {
      const json = (await linkedinGet(
        `organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${org}&${param}=List(${list.map(enc).join(",")})`,
      )) as { elements?: Array<Record<string, unknown> & { totalShareStatistics?: Totals }> };
      for (const e of json.elements ?? []) {
        const urn = e[key] as string | undefined;
        if (urn) out[urn] = toStats(e.totalShareStatistics);
      }
    } catch {
      /* stats are a nice-to-have; a failed lookup just leaves those posts blank */
    }
  };
  await Promise.all([run("shares", shares, "share"), run("ugcPosts", ugc, "ugcPost")]);
  return out;
}

const nameCache = new Map<string, string>();
async function nameOf(kind: "industries" | "functions" | "seniorities", urn: string): Promise<string> {
  const id = urn.split(":").pop() ?? urn;
  const key = `${kind}:${id}`;
  const hit = nameCache.get(key);
  if (hit) return hit;
  try {
    const j = (await linkedinGet(`${kind}/${id}?locale=(language:en,country:US)`)) as { name?: { localized?: Record<string, string> } };
    const name = Object.values(j.name?.localized ?? {})[0] ?? urn;
    nameCache.set(key, name);
    return name;
  } catch {
    return urn;
  }
}

async function geoNames(urns: string[]): Promise<Record<string, string>> {
  const ids = urns.map((u) => u.split(":").pop()).filter(Boolean);
  if (!ids.length) return {};
  try {
    const j = (await linkedinGet(`geo?ids=List(${ids.join(",")})&locale=(language:en,country:US)`)) as {
      results?: Record<string, { defaultLocalizedName?: { value?: string } }>;
    };
    return Object.fromEntries(urns.map((u) => [u, j.results?.[u.split(":").pop() ?? ""]?.defaultLocalizedName?.value ?? u]));
  } catch {
    return {};
  }
}

type Row = Record<string, unknown>;
async function toBreakdown(rows: Row[] | undefined, urnKey: string, valueOf: (r: Row) => number, kind: "industries" | "functions" | "seniorities" | "geo"): Promise<Breakdown[]> {
  const top = (rows ?? [])
    .map((r) => ({ urn: String(r[urnKey] ?? ""), value: valueOf(r) }))
    .filter((r) => r.urn && r.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  if (kind === "geo") {
    const names = await geoNames(top.map((t) => t.urn));
    return top.map((t) => ({ label: names[t.urn] ?? t.urn, value: t.value }));
  }
  return Promise.all(top.map(async (t) => ({ label: await nameOf(kind, t.urn), value: t.value })));
}

const viewsOf = (r: Row) => ((r.pageStatistics as { views?: { allPageViews?: { pageViews?: number } } } | undefined)?.views?.allPageViews?.pageViews) ?? 0;
const followersOf = (r: Row) => ((r.followerCounts as { organicFollowerCount?: number; paidFollowerCount?: number } | undefined)?.organicFollowerCount ?? 0) + ((r.followerCounts as { paidFollowerCount?: number } | undefined)?.paidFollowerCount ?? 0);

export async function getPageOverview(): Promise<PageOverview> {
  const org = enc(orgUrn());
  const now = Date.now();
  const start = now - 30 * 24 * 3600 * 1000;

  const [size, page, follow, series] = await Promise.all([
    linkedinGet(`networkSizes/${org}?edgeType=COMPANY_FOLLOWED_BY_MEMBER`).catch(() => ({})) as Promise<{ firstDegreeSize?: number }>,
    linkedinGet(`organizationPageStatistics?q=organization&organization=${org}`).catch(() => ({})) as Promise<{ elements?: Row[] }>,
    linkedinGet(`organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=${org}`).catch(() => ({})) as Promise<{ elements?: Row[] }>,
    linkedinGet(
      `organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${org}&timeIntervals=(timeGranularityType:DAY,timeRange:(start:${start},end:${now}))`,
    ).catch(() => ({})) as Promise<{ elements?: Array<{ totalShareStatistics?: Totals }> }>,
  ]);

  const p = (page.elements?.[0] ?? {}) as Row;
  const f = (follow.elements?.[0] ?? {}) as Row;
  const sum = (k: keyof Totals) => (series.elements ?? []).reduce((n, e) => n + (e.totalShareStatistics?.[k] ?? 0), 0);

  const [vi, vs, vf, vc, fi, fs, ff, fc] = await Promise.all([
    toBreakdown(p.pageStatisticsByIndustryV2 as Row[], "industryV2", viewsOf, "industries"),
    toBreakdown(p.pageStatisticsBySeniority as Row[], "seniority", viewsOf, "seniorities"),
    toBreakdown(p.pageStatisticsByFunction as Row[], "function", viewsOf, "functions"),
    toBreakdown(p.pageStatisticsByGeoCountry as Row[], "geo", viewsOf, "geo"),
    toBreakdown(f.followerCountsByIndustry as Row[], "industry", followersOf, "industries"),
    toBreakdown(f.followerCountsBySeniority as Row[], "seniority", followersOf, "seniorities"),
    toBreakdown(f.followerCountsByFunction as Row[], "function", followersOf, "functions"),
    toBreakdown(f.followerCountsByGeoCountry as Row[], "geo", followersOf, "geo"),
  ]);

  return {
    followers: size.firstDegreeSize ?? 0,
    pageViews: ((p.totalPageStatistics as { views?: { allPageViews?: { pageViews?: number } } } | undefined)?.views?.allPageViews?.pageViews) ?? 0,
    last30: { impressions: sum("impressionCount"), clicks: sum("clickCount"), reactions: sum("likeCount"), comments: sum("commentCount"), shares: sum("shareCount") },
    viewersBy: { industry: vi, seniority: vs, function: vf, country: vc },
    followersBy: { industry: fi, seniority: fs, function: ff, country: fc },
  };
}

// Totals over the last `days` completed days, for the Weekly numbers page.
export async function getWindowTotals(days: number): Promise<{ followers: number; pageViews: number; impressions: number; clicks: number; reactions: number; comments: number; shares: number }> {
  const org = enc(orgUrn());
  const now = Date.now();
  const start = now - days * 24 * 3600 * 1000;
  const [size, page, series] = await Promise.all([
    linkedinGet(`networkSizes/${org}?edgeType=COMPANY_FOLLOWED_BY_MEMBER`).catch(() => ({})) as Promise<{ firstDegreeSize?: number }>,
    linkedinGet(`organizationPageStatistics?q=organization&organization=${org}`).catch(() => ({})) as Promise<{ elements?: Row[] }>,
    linkedinGet(
      `organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${org}&timeIntervals=(timeGranularityType:DAY,timeRange:(start:${start},end:${now}))`,
    ).catch(() => ({})) as Promise<{ elements?: Array<{ totalShareStatistics?: Totals }> }>,
  ]);
  const sum = (k: keyof Totals) => (series.elements ?? []).reduce((n, e) => n + (e.totalShareStatistics?.[k] ?? 0), 0);
  const p = (page.elements?.[0] ?? {}) as Row;
  return {
    followers: size.firstDegreeSize ?? 0,
    pageViews: ((p.totalPageStatistics as { views?: { allPageViews?: { pageViews?: number } } } | undefined)?.views?.allPageViews?.pageViews) ?? 0,
    impressions: sum("impressionCount"),
    clicks: sum("clickCount"),
    reactions: sum("likeCount"),
    comments: sum("commentCount"),
    shares: sum("shareCount"),
  };
}
