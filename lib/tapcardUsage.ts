// Usage figures for one TapCard for Business company: how many cards are issued and in use, followers, scans, offers and news. Counts only:
// no names, emails or other fan details appear here, so the same figures can go to the company's admin, to AIERT for billing, and to anyone
// the company gives a read-only link to. A link is revocable and shows nothing but this report.
import sql from "@/lib/db";
import { createHash, randomBytes } from "node:crypto";

export interface UsageReport {
  asOf: string;
  company: string;
  cards: { issued: number; limit: number; locations: number; staff: number; inUse: number };
  followers: { total: number; last30: number };
  reach: { views: number; qrScans: number; saves: number; installs: number };
  offers: { liveNow: number; posted: number; claims: number; claimsLast30: number; used: number };
  news: { posted: number; postedLast30: number };
  groups: { label: string; cards: number; followers: number }[];
}

const n = (v: unknown) => Number(v ?? 0) || 0;
/// Each count is asked on its own, so a table that does not exist yet (nothing was ever posted, say) counts as zero rather than failing the report.
async function safe<T>(q: Promise<T>, fallback: T): Promise<T> {
  try { return await q; } catch { return fallback; }
}

export async function orgUsage(orgId: string, now = new Date()): Promise<UsageReport | null> {
  const org = ((await safe(sql`SELECT name, seat_limit, locations FROM tapcard_biz_orgs WHERE id = ${orgId}`, [] as Record<string, unknown>[])) as Record<string, unknown>[])[0];
  if (!org) return null;
  const cards = (await safe(sql`SELECT id, card_kind, view_count, qr_view_count, save_count FROM tapcard_cards WHERE org_id = ${orgId}`, [] as Record<string, unknown>[])) as Record<string, unknown>[];
  const ids = cards.map((c) => String(c.id));
  const count = async (q: Promise<Record<string, unknown>[]>, key = "n") => n(((await safe(q, [] as Record<string, unknown>[]))[0] ?? {})[key]);

  const perCard = (await safe(sql`SELECT card_id, count(*)::int AS n, count(*) FILTER (WHERE created_at > ${new Date(now.getTime() - 30 * 86_400_000).toISOString()})::int AS n30 FROM tapcard_followers WHERE card_id = ANY(${ids}) GROUP BY card_id`, [] as Record<string, unknown>[])) as Record<string, unknown>[];
  const followersOf = new Map(perCard.map((r) => [String(r.card_id), n(r.n)]));
  const since = new Date(now.getTime() - 30 * 86_400_000).toISOString();

  const claims = await count(sql`SELECT count(*)::int AS n FROM tapcard_offer_claims cl JOIN tapcard_offers o ON o.id = cl.offer_id WHERE o.card_id = ANY(${ids})`);
  const claims30 = await count(sql`SELECT count(*)::int AS n FROM tapcard_offer_claims cl JOIN tapcard_offers o ON o.id = cl.offer_id WHERE o.card_id = ANY(${ids}) AND cl.claimed_at > ${since}`);
  const used = await count(sql`SELECT (count(cl.redeemed_at) + COALESCE(sum(cl.rewards_given), 0))::int AS n FROM tapcard_offer_claims cl JOIN tapcard_offers o ON o.id = cl.offer_id WHERE o.card_id = ANY(${ids})`);
  const posted = await count(sql`SELECT count(*)::int AS n FROM tapcard_offers WHERE card_id = ANY(${ids})`);
  // One live offer per card and audience: the latest of each, if it has not ended or been withdrawn.
  const liveNow = await count(sql`SELECT count(*)::int AS n FROM (SELECT DISTINCT ON (card_id, audience) expires_at FROM tapcard_offers WHERE card_id = ANY(${ids}) ORDER BY card_id, audience, id DESC) o WHERE o.expires_at IS NULL OR o.expires_at > now()`);
  const newsPosted = await count(sql`SELECT count(*)::int AS n FROM tapcard_announcements WHERE card_id = ANY(${ids})`);
  const news30 = await count(sql`SELECT count(*)::int AS n FROM tapcard_announcements WHERE card_id = ANY(${ids}) AND created_at > ${since}`);
  const installs = await count(sql`SELECT count(*)::int AS n FROM tapcard_card_installs WHERE card_id = ANY(${ids})`);
  const groups = ((await safe(sql`
    SELECT g.label, count(DISTINCT g.card_id)::int AS cards, count(fg.follower_hash)::int AS followers
    FROM tapcard_card_groups g LEFT JOIN tapcard_follower_groups fg ON fg.card_id = g.card_id AND fg.slug = g.slug
    WHERE g.card_id = ANY(${ids}) GROUP BY g.label ORDER BY followers DESC, g.label`, [] as Record<string, unknown>[])) as Record<string, unknown>[])
    .map((r) => ({ label: String(r.label), cards: n(r.cards), followers: n(r.followers) }));

  return {
    asOf: now.toISOString(),
    company: String(org.name ?? ""),
    cards: {
      issued: cards.length,
      limit: n(org.seat_limit),
      locations: cards.filter((c) => c.card_kind === "business").length,
      staff: cards.filter((c) => c.card_kind !== "business").length,
      // In use: opened, scanned, saved or followed at least once.
      inUse: cards.filter((c) => n(c.view_count) > 0 || n(c.save_count) > 0 || (followersOf.get(String(c.id)) ?? 0) > 0).length,
    },
    followers: { total: perCard.reduce((s, r) => s + n(r.n), 0), last30: perCard.reduce((s, r) => s + n(r.n30), 0) },
    reach: { views: cards.reduce((s, c) => s + n(c.view_count), 0), qrScans: cards.reduce((s, c) => s + n(c.qr_view_count), 0), saves: cards.reduce((s, c) => s + n(c.save_count), 0), installs },
    offers: { liveNow, posted, claims, claimsLast30: claims30, used },
    news: { posted: newsPosted, postedLast30: news30 },
    groups,
  };
}

const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
/// The report as a two-column CSV (metric, value), group rows last.
export function usageCsv(r: UsageReport): string {
  const rows: [string, string | number][] = [
    ["Company", r.company], ["As of", r.asOf],
    ["Cards issued", r.cards.issued], ["Card limit", r.cards.limit], ["Location cards", r.cards.locations], ["Staff cards", r.cards.staff], ["Cards in use", r.cards.inUse],
    ["Followers", r.followers.total], ["New followers, last 30 days", r.followers.last30],
    ["Card views", r.reach.views], ["QR scans", r.reach.qrScans], ["Saves", r.reach.saves], ["Installs from your cards", r.reach.installs],
    ["Offers live now", r.offers.liveNow], ["Offers posted", r.offers.posted], ["Offers claimed", r.offers.claims], ["Offers claimed, last 30 days", r.offers.claimsLast30], ["Offers used", r.offers.used],
    ["News posted", r.news.posted], ["News posted, last 30 days", r.news.postedLast30],
    ...r.groups.map((g) => [`Group: ${g.label} (followers)`, g.followers] as [string, number]),
  ];
  return ["Metric,Value", ...rows.map(([k, v]) => `${q(k)},${q(v)}`)].join("\n");
}

// ---- Read-only usage links: the company creates one (the address is shown once), can see when it was last used, and can revoke it.
let ready: Promise<unknown> | null = null;
function ensureLinks(): Promise<unknown> {
  if (!ready) {
    ready = sql`CREATE TABLE IF NOT EXISTS tapcard_usage_links (
      id BIGSERIAL PRIMARY KEY, org_id TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE, label TEXT NOT NULL DEFAULT '', created_by TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(), last_used_at TIMESTAMPTZ, revoked_at TIMESTAMPTZ)`
      .then(() => sql`CREATE INDEX IF NOT EXISTS tapcard_usage_links_org ON tapcard_usage_links (org_id)`)
      .catch((e) => { ready = null; throw e; });
  }
  return ready;
}
const hashToken = (t: string) => createHash("sha256").update(`tapcard-usage-link:${t}`).digest("hex");

export const MAX_USAGE_LINKS = 5;

export async function createUsageLink(orgId: string, by: string, label = ""): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  await ensureLinks();
  const live = ((await sql`SELECT count(*)::int AS n FROM tapcard_usage_links WHERE org_id = ${orgId} AND revoked_at IS NULL`) as { n: number }[])[0];
  if (n(live?.n) >= MAX_USAGE_LINKS) return { ok: false, error: `A company can have ${MAX_USAGE_LINKS} usage links at a time. Revoke one first.` };
  const token = randomBytes(24).toString("base64url");
  await sql`INSERT INTO tapcard_usage_links (org_id, token_hash, label, created_by) VALUES (${orgId}, ${hashToken(token)}, ${label.slice(0, 60)}, ${by.slice(0, 120)})`;
  return { ok: true, token };
}

export interface UsageLinkRow { id: number; label: string; createdBy: string; createdAt: string; lastUsedAt: string | null; revokedAt: string | null }
export async function listUsageLinks(orgId: string): Promise<UsageLinkRow[]> {
  await ensureLinks();
  const rows = (await sql`SELECT id, label, created_by, created_at, last_used_at, revoked_at FROM tapcard_usage_links WHERE org_id = ${orgId} ORDER BY id DESC LIMIT 20`) as Record<string, unknown>[];
  const iso = (d: unknown) => (d ? new Date(d as string).toISOString() : null);
  return rows.map((r) => ({ id: n(r.id), label: String(r.label), createdBy: String(r.created_by), createdAt: iso(r.created_at) ?? "", lastUsedAt: iso(r.last_used_at), revokedAt: iso(r.revoked_at) }));
}

export async function revokeUsageLink(orgId: string, id: number): Promise<boolean> {
  await ensureLinks();
  const r = (await sql`UPDATE tapcard_usage_links SET revoked_at = now() WHERE id = ${id} AND org_id = ${orgId} AND revoked_at IS NULL RETURNING id`) as unknown[];
  return r.length > 0;
}

/// The report for a link's address, or null when the link is unknown or revoked. Records when it was last used.
export async function usageForToken(token: string): Promise<UsageReport | null> {
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(token)) return null;
  await ensureLinks();
  const row = ((await sql`SELECT id, org_id FROM tapcard_usage_links WHERE token_hash = ${hashToken(token)} AND revoked_at IS NULL`) as { id: number; org_id: string }[])[0];
  if (!row) return null;
  await sql`UPDATE tapcard_usage_links SET last_used_at = now() WHERE id = ${row.id}`.catch(() => undefined);
  return orgUsage(row.org_id);
}
