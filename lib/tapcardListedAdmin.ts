import sql from "@/lib/db";
import { newsReach } from "@/lib/tapcardPush";
import { orgPromoteRows } from "@/lib/tapcardOffers";
import { sharedFollowerCount } from "@/lib/tapcardShare";

let ready: Promise<unknown> | null = null;
function ensureKindColumn(): Promise<unknown> {
  if (!ready) {
    ready = sql`ALTER TABLE tapcard_biz_orgs ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'business'`.catch((e) => { ready = null; throw e; });
  }
  return ready;
}

/// AIERT marks a company as a listed company's (investor relations) when it sets it up, or later from the Companies page.
export async function setOrgListed(orgId: string, on: boolean): Promise<void> {
  await ensureKindColumn();
  await sql`UPDATE tapcard_biz_orgs SET kind = ${on ? "listed" : "business"} WHERE id = ${orgId}`;
}

/// A company shows the investor relations admin when AIERT marked it listed, or when one of its cards has been marked listed.
export async function orgIsListed(orgId: string): Promise<boolean> {
  try {
    await ensureKindColumn();
    const rows = (await sql`
      SELECT 1 FROM tapcard_biz_orgs o WHERE o.id = ${orgId} AND (o.kind = 'listed' OR EXISTS (
        SELECT 1 FROM tapcard_listed_cards l JOIN tapcard_cards c ON c.id = l.card_id WHERE c.org_id = o.id)) LIMIT 1
    `) as unknown[];
    return rows.length > 0;
  } catch {
    return false;
  }
}

export interface ListedCard { id: string; name: string; title: string; company: string; isCompany: boolean }

export interface ListedSummary {
  cards: ListedCard[];
  primaryCardId: string | null;
  following: number;
  canBeNotified: number;
  shared: number;
  views: number;
  qrViews: number;
  latestNews: { text: string; at: string; card: string } | null;
}

/// What a listed company's overview and cards pages show: its cards (the listed company card first, then its people) and the numbers.
export async function listedSummary(orgId: string): Promise<ListedSummary> {
  const [cardRows, listedRows, promote] = await Promise.all([
    sql`SELECT id, name, title, company FROM tapcard_cards WHERE org_id = ${orgId} ORDER BY created_at`,
    sql`SELECT l.card_id FROM tapcard_listed_cards l JOIN tapcard_cards c ON c.id = l.card_id WHERE c.org_id = ${orgId}`,
    orgPromoteRows(orgId),
  ]) as [{ id: string; name: string; title: string; company: string }[], { card_id: string }[], Awaited<ReturnType<typeof orgPromoteRows>>];
  const listedIds = new Set(listedRows.map((r) => r.card_id));
  const cards: ListedCard[] = cardRows
    .map((c) => ({ id: c.id, name: c.name || "", title: c.title || "", company: c.company || "", isCompany: listedIds.has(c.id) }))
    .sort((a, b) => Number(b.isCompany) - Number(a.isCompany));
  const primary = cards.find((c) => c.isCompany)?.id ?? null;
  const reach = await Promise.all([...listedIds].map((id) => newsReach(id)));
  const shared = await Promise.all([...listedIds].map((id) => sharedFollowerCount(id)));
  const sum = (a: number[]) => a.reduce((n, x) => n + x, 0);
  const news = promote.filter((p) => p.news && p.newsAt).sort((a, b) => (b.newsAt! > a.newsAt! ? 1 : -1))[0];
  return {
    cards,
    primaryCardId: primary,
    following: sum(promote.filter((p) => listedIds.has(p.id)).map((p) => p.followers)),
    canBeNotified: sum(reach),
    shared: sum(shared),
    views: sum(promote.map((p) => p.views)),
    qrViews: sum(promote.map((p) => p.qrViews)),
    latestNews: news ? { text: news.news!, at: news.newsAt!, card: news.company || news.name } : null,
  };
}
