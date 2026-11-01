import sql from "@/lib/db";
import { funnelTotals } from "@/lib/tapcardFunnel";
import { mailshotStats, type MailshotStats } from "@/lib/mailshot";
import { TRACKED_LINKS } from "@/lib/trackedLinks";

export interface CardRow { id: string; name: string; company: string; kind: string; views: number; qr: number; saves: number; followers: number; installs: number; claims: number; used: number; created: string }
export interface LinkRow { slug: string; label: string; n: number }
export interface Numbers {
  days: number;
  totals: { cards: number; newCards: number; views: number; qr: number; saves: number; followers: number; installs: number; claims: number; used: number };
  cards: CardRow[] | null;
  funnel: { step: string; n: number }[] | null;
  links: LinkRow[] | null;
  mailshots: { campaign: string; stats: MailshotStats }[] | null;
}

// Each block fails on its own: one missing table never blanks the whole page.
const safe = async <T,>(p: Promise<T>): Promise<T | null> => p.catch(() => null);

export async function weeklyNumbers(days: number): Promise<Numbers> {
  const since = `${days} days`;
  const cards = (await safe(sql`
    SELECT c.id, c.name, c.company, c.card_kind AS kind, c.view_count AS views, c.qr_view_count AS qr, c.save_count AS saves, c.created_at,
      (SELECT COUNT(*)::int FROM tapcard_followers f WHERE f.card_id = c.id) AS followers,
      (SELECT COUNT(*)::int FROM tapcard_card_installs i WHERE i.card_id = c.id) AS installs,
      (SELECT COUNT(*)::int FROM tapcard_offer_claims k JOIN tapcard_offers o ON o.id = k.offer_id WHERE o.card_id = c.id) AS claims,
      (SELECT COUNT(*)::int FROM tapcard_offer_claims k JOIN tapcard_offers o ON o.id = k.offer_id WHERE o.card_id = c.id AND k.redeemed_at IS NOT NULL) AS used
    FROM tapcard_cards c
    WHERE c.card_kind <> 'person' AND (c.view_count > 0 OR c.company <> '')
    ORDER BY c.view_count DESC LIMIT 60`)) as Record<string, unknown>[] | null;
  const rows: CardRow[] | null = cards && cards.map((r) => ({
    id: String(r.id), name: String(r.name || ""), company: String(r.company || ""), kind: String(r.kind || ""),
    views: Number(r.views), qr: Number(r.qr), saves: Number(r.saves), followers: Number(r.followers), installs: Number(r.installs),
    claims: Number(r.claims), used: Number(r.used), created: new Date(r.created_at as string).toISOString().slice(0, 10),
  }));
  const all = await safe(sql`SELECT COUNT(*)::int AS cards, COUNT(*) FILTER (WHERE created_at > now() - ${since}::interval)::int AS new_cards,
      COALESCE(SUM(view_count),0)::int AS views, COALESCE(SUM(qr_view_count),0)::int AS qr, COALESCE(SUM(save_count),0)::int AS saves FROM tapcard_cards`);
  const one = async (q: Promise<unknown>) => ((await safe(q as Promise<{ n: number }[]>)) ?? [{ n: 0 }])[0].n;
  const followers = await one(sql`SELECT COUNT(*)::int AS n FROM tapcard_followers`);
  const installs = await one(sql`SELECT COUNT(*)::int AS n FROM tapcard_card_installs`);
  const claims = await one(sql`SELECT COUNT(*)::int AS n FROM tapcard_offer_claims`);
  const used = await one(sql`SELECT COUNT(*)::int AS n FROM tapcard_offer_claims WHERE redeemed_at IS NOT NULL`);
  const a = ((all ?? [{}]) as Record<string, number>[])[0];

  const f = await safe(funnelTotals(days));
  const funnel = f && Object.entries(f.reduce<Record<string, number>>((m, r) => ((m[r.step] = (m[r.step] ?? 0) + r.n), m), {})).map(([step, n]) => ({ step, n }));

  const lk = await safe(sql`SELECT slug, COUNT(*)::int AS n FROM link_clicks WHERE clicked_at > now() - ${since}::interval GROUP BY slug ORDER BY n DESC LIMIT 25`) as { slug: string; n: number }[] | null;
  const links = lk && lk.map((r) => ({ slug: r.slug, n: r.n, label: TRACKED_LINKS[r.slug]?.label ?? r.slug }));

  const camps = await safe(sql`SELECT DISTINCT campaign FROM tapcard_mailshot_list ORDER BY campaign`) as { campaign: string }[] | null;
  const mailshots = camps && (await Promise.all(camps.map(async (c) => ({ campaign: c.campaign, stats: await mailshotStats(c.campaign) }))));

  return {
    days, cards: rows, funnel, links, mailshots,
    totals: { cards: a.cards ?? 0, newCards: a.new_cards ?? 0, views: a.views ?? 0, qr: a.qr ?? 0, saves: a.saves ?? 0, followers, installs, claims, used },
  };
}
