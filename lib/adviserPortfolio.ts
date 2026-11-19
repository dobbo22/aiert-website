// The adviser's view across all its companies: one row each with what needs doing, and the search, filter and sort the portal uses.
// The pure parts (classify, filter, sort, totals) are tested on their own; `adviserPortfolio` gathers the rows.
import sql from "@/lib/db";
import { linksForAdviser } from "@/lib/tapcardAdvisers";
import { tierByNumber } from "@/lib/tapcardAdviserPricing";

import type { PortfolioRow } from "@/lib/adviserPortfolioRules";
export * from "@/lib/adviserPortfolioRules";

export async function adviserPortfolio(adviserId: string, me: { email: string; senior: boolean }): Promise<PortfolioRow[]> {
  const links = await linksForAdviser(adviserId);
  if (!links.length) return [];
  const orgIds = links.map((l) => l.orgId);
  await (await import("@/lib/tapcardIrFeed")).getFeedConfig("none").catch(() => null); // makes sure the feed tables exist
  await (await import("@/lib/tapcardNewsPolicy")).ensurePolicySchema();
  const cards = (await sql`
    SELECT c.org_id, c.id AS card_id,
      (SELECT COUNT(*)::int FROM tapcard_followers f WHERE f.card_id = c.id) AS followers,
      (SELECT a.text FROM tapcard_announcements a WHERE a.card_id = c.id AND NOT a.withdrawn ORDER BY a.id DESC LIMIT 1) AS last_text,
      (SELECT a.created_at FROM tapcard_announcements a WHERE a.card_id = c.id AND NOT a.withdrawn ORDER BY a.id DESC LIMIT 1) AS last_at,
      EXISTS (SELECT 1 FROM tapcard_ir_feed r WHERE r.card_id = c.id) AS has_feed
    FROM tapcard_cards c JOIN tapcard_listed_cards l ON l.card_id = c.id WHERE c.org_id = ANY(${orgIds})`) as { org_id: string; followers: number; last_text: string | null; last_at: string | null; has_feed: boolean }[];
  const drafts = (await sql`SELECT org_id, created_by FROM tapcard_news_drafts WHERE status = 'pending' AND org_id = ANY(${orgIds})`) as { org_id: string; created_by: string }[];
  const byOrg = new Map(cards.map((c) => [c.org_id, c]));
  return links.map((l) => {
    const c = byOrg.get(l.orgId);
    const mine = drafts.filter((d) => d.org_id === l.orgId && d.created_by === me.email.toLowerCase()).length;
    // Only drafts this person may approve count as waiting for them: senior staff of an adviser the company allowed regulatory news for.
    const waiting = l.status === "approved" && me.senior && l.canRegulatory ? drafts.filter((d) => d.org_id === l.orgId && d.created_by !== me.email.toLowerCase()).length : 0;
    const t = l.tier == null ? undefined : tierByNumber(l.tier);
    return {
      orgId: l.orgId, name: l.orgName, status: l.status, canRegulatory: l.canRegulatory, coverStatus: l.coverStatus, tierLabel: t?.label ?? "", monthlyPence: t?.monthlyPence ?? 0,
      committedUntil: l.committedUntil, coverEndsAt: l.coverEndsAt, followers: Number(c?.followers ?? 0), lastHeadline: c?.last_text ?? null, lastHeadlineAt: c?.last_at ? new Date(c.last_at).toISOString() : null,
      waitingForYou: waiting, yourDrafts: mine, noPage: l.status === "approved" && !!c && !c.has_feed,
    };
  });
}
