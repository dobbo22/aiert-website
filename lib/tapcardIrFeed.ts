import sql from "@/lib/db";
import { readLimited, safeFetch } from "@/lib/siteIcon";
import { parseAnnouncements, type FeedItem } from "@/lib/tapcardIrParse";

// A listed company's own announcements page, read so the admin can offer each new announcement as a one-tap post. Only the company's
// own page (or its RSS feed) is read: never Investegate or the London Stock Exchange.

let ready: Promise<unknown> | null = null;
function ensureFeedSchema(): Promise<unknown> {
  if (!ready) {
    ready = sql`
      CREATE TABLE IF NOT EXISTS tapcard_ir_feed (
        card_id TEXT PRIMARY KEY,
        page_url TEXT NOT NULL,
        started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        last_checked_at TIMESTAMPTZ,
        last_error TEXT NOT NULL DEFAULT ''
      )`
      .then(() => sql`
        CREATE TABLE IF NOT EXISTS tapcard_ir_items (
          card_id TEXT NOT NULL,
          url TEXT NOT NULL,
          title TEXT NOT NULL,
          published DATE,
          status TEXT NOT NULL DEFAULT 'new',
          first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          PRIMARY KEY (card_id, url)
        )`)
      .catch((e) => { ready = null; throw e; });
  }
  return ready;
}

export interface FeedConfig { pageUrl: string; lastCheckedAt: string | null; lastError: string }
export interface FeedRow { url: string; title: string; date: string | null; status: "new" | "earlier" | "ignored"; posted: boolean }

export function cleanPageUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  try {
    const u = new URL(/^[a-z]+:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`);
    if (u.hostname.indexOf(".") < 1) return null;
    u.protocol = "https:";
    u.hash = "";
    const s = u.toString();
    return s.length <= 300 ? s : null;
  } catch { return null; }
}

export async function getFeedConfig(cardId: string): Promise<FeedConfig | null> {
  await ensureFeedSchema();
  const r = (await sql`SELECT page_url, last_checked_at, last_error FROM tapcard_ir_feed WHERE card_id = ${cardId}`) as { page_url: string; last_checked_at: string | null; last_error: string }[];
  return r[0] ? { pageUrl: r[0].page_url, lastCheckedAt: r[0].last_checked_at ? new Date(r[0].last_checked_at).toISOString() : null, lastError: r[0].last_error } : null;
}

/// Saves the announcements page and reads it once. What is on the page now is marked "earlier" (a baseline); only items that appear
/// afterwards are "new".
export async function saveFeedPage(cardId: string, pageUrl: string): Promise<{ ok: true; found: number } | { ok: false; error: string }> {
  await ensureFeedSchema();
  const fetched = await readPage(pageUrl);
  if (!fetched.ok) return fetched;
  if (!fetched.items.length) return { ok: false, error: "No dated announcements were found on that page. Check the address, or tell us which page lists your RNS announcements." };
  await sql`
    INSERT INTO tapcard_ir_feed (card_id, page_url, started_at, last_checked_at, last_error) VALUES (${cardId}, ${pageUrl}, now(), now(), '')
    ON CONFLICT (card_id) DO UPDATE SET page_url = EXCLUDED.page_url, started_at = now(), last_checked_at = now(), last_error = ''`;
  await sql`DELETE FROM tapcard_ir_items WHERE card_id = ${cardId}`;
  for (const i of fetched.items) {
    await sql`INSERT INTO tapcard_ir_items (card_id, url, title, published, status) VALUES (${cardId}, ${i.url}, ${i.title}, ${i.date}, 'earlier') ON CONFLICT DO NOTHING`;
  }
  return { ok: true, found: fetched.items.length };
}

async function readPage(pageUrl: string): Promise<{ ok: true; items: FeedItem[] } | { ok: false; error: string }> {
  try {
    const page = await safeFetch(pageUrl);
    if (!page || !page.res.ok) return { ok: false, error: "We couldn't open that page." };
    const buf = await readLimited(page.res, 2 * 1024 * 1024);
    if (!buf) return { ok: false, error: "That page is too large to read." };
    return { ok: true, items: parseAnnouncements(buf.toString("utf8"), page.url.toString()) };
  } catch {
    return { ok: false, error: "We couldn't read that page." };
  }
}

/// Re-reads the page (at most once a minute per card) and records anything new. Returns the saved configuration.
export async function syncFeed(cardId: string): Promise<FeedConfig | null> {
  const cfg = await getFeedConfig(cardId);
  if (!cfg) return null;
  if (cfg.lastCheckedAt && Date.now() - new Date(cfg.lastCheckedAt).getTime() < 60_000) return cfg;
  const fetched = await readPage(cfg.pageUrl);
  if (!fetched.ok) {
    await sql`UPDATE tapcard_ir_feed SET last_checked_at = now(), last_error = ${fetched.error} WHERE card_id = ${cardId}`;
    return { ...cfg, lastCheckedAt: new Date().toISOString(), lastError: fetched.error };
  }
  // A page that suddenly lists many unseen items (a redesign) is not offered as "new": it becomes the new baseline.
  const known = new Set(((await sql`SELECT url FROM tapcard_ir_items WHERE card_id = ${cardId}`) as { url: string }[]).map((r) => r.url));
  const unseen = fetched.items.filter((i) => !known.has(i.url));
  const status = unseen.length > 5 ? "earlier" : "new";
  for (const i of unseen) {
    await sql`INSERT INTO tapcard_ir_items (card_id, url, title, published, status) VALUES (${cardId}, ${i.url}, ${i.title}, ${i.date}, ${status}) ON CONFLICT DO NOTHING`;
  }
  await sql`UPDATE tapcard_ir_feed SET last_checked_at = now(), last_error = '' WHERE card_id = ${cardId}`;
  return { ...cfg, lastCheckedAt: new Date().toISOString(), lastError: "" };
}

/// The recent announcements with whether each has been posted (matched by its link) and whether it was ignored.
export async function listFeedRows(cardId: string, limit = 15): Promise<FeedRow[]> {
  await ensureFeedSchema();
  const rows = (await sql`
    SELECT i.url, i.title, i.published, i.status,
      EXISTS (SELECT 1 FROM tapcard_announcements a WHERE a.card_id = i.card_id AND a.link = i.url) AS posted
    FROM tapcard_ir_items i WHERE i.card_id = ${cardId}
    ORDER BY i.published DESC NULLS LAST, i.first_seen_at DESC LIMIT ${limit}`) as { url: string; title: string; published: string | null; status: string; posted: boolean }[];
  return rows.map((r) => ({ url: r.url, title: r.title, date: r.published ? new Date(r.published).toISOString().slice(0, 10) : null, status: (r.status === "ignored" ? "ignored" : r.status === "new" ? "new" : "earlier") as FeedRow["status"], posted: !!r.posted }));
}

export async function setItemStatus(cardId: string, url: string, status: "ignored" | "new" | "earlier"): Promise<void> {
  await ensureFeedSchema();
  await sql`UPDATE tapcard_ir_items SET status = ${status} WHERE card_id = ${cardId} AND url = ${url}`;
}
