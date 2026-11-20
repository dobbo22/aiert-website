// The "listed universe": every share line on the London Stock Exchange (Main Market and AIM) that AIERT could approach, kept in the
// database so it can be sorted, checked and kept in step with the exchange's own stock lists. AIERT admin only (/admin/social/listed).
//
// Step 1 holds: the list itself, market cap and website as first loaded from the old ShareQuest data (website NOT yet validated), and
// the spreadsheet import with a preview. Later steps add website checks, investor pages and board names to the same table.
import sql from "@/lib/db";
import base from "@/lib/data/lse-equities.json";
import extra from "@/lib/data/lse-seed-extra.json";
import type { LseShare } from "@/lib/lseStockList";

export interface UniverseRow {
  isin: string; name: string; ticker: string; market: string; country: string; sector: string; segment: string; currency: string;
  status: "listed" | "delisted"; firstSeen: string; lastSeenInList: string; delistedAt: string | null;
  marketCap: number | null; marketCapSource: string; marketCapAt: string | null;
  website: string; websiteSource: string; notes: string; hasCard: boolean;
}

let ready: Promise<void> | null = null;
export function ensureUniverse(): Promise<void> {
  if (!ready) {
    ready = Promise.resolve()
      .then(
        () => sql`
        CREATE TABLE IF NOT EXISTS tapcard_lse_universe (
          isin TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          ticker TEXT NOT NULL DEFAULT '',
          market TEXT NOT NULL DEFAULT 'Main',
          country TEXT NOT NULL DEFAULT '',
          sector TEXT NOT NULL DEFAULT '',
          segment TEXT NOT NULL DEFAULT '',
          currency TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'listed',
          first_seen DATE NOT NULL DEFAULT CURRENT_DATE,
          last_seen_in_list DATE,
          delisted_at TIMESTAMPTZ,
          market_cap NUMERIC,
          market_cap_source TEXT NOT NULL DEFAULT '',
          market_cap_at DATE,
          website TEXT NOT NULL DEFAULT '',
          website_source TEXT NOT NULL DEFAULT '',
          notes TEXT NOT NULL DEFAULT '',
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )`,
      )
      .then(() => sql`CREATE INDEX IF NOT EXISTS tapcard_lse_universe_cap ON tapcard_lse_universe (market_cap DESC NULLS LAST)`)
      .then(() => undefined)
      .catch((e) => { ready = null; throw e; });
  }
  return ready;
}

const iso = (d: unknown): string => (d ? new Date(d as string).toISOString().slice(0, 10) : "");

export async function listUniverse(): Promise<UniverseRow[]> {
  await ensureUniverse();
  // tapcard_listed_cards may not exist yet on a fresh database: treat "no table" as "no cards".
  const cards = await sql`SELECT isin FROM tapcard_listed_cards WHERE isin <> ''`.catch(() => [] as Record<string, unknown>[]);
  const hasCard = new Set(cards.map((c) => String(c.isin)));
  const rows = await sql`SELECT * FROM tapcard_lse_universe ORDER BY market_cap DESC NULLS LAST, name`;
  return rows.map((r) => ({
    isin: String(r.isin), name: String(r.name), ticker: String(r.ticker), market: String(r.market), country: String(r.country), sector: String(r.sector),
    segment: String(r.segment), currency: String(r.currency), status: r.status === "delisted" ? "delisted" : "listed",
    firstSeen: iso(r.first_seen), lastSeenInList: iso(r.last_seen_in_list), delistedAt: r.delisted_at ? new Date(r.delisted_at as string).toISOString() : null,
    marketCap: r.market_cap === null ? null : Number(r.market_cap), marketCapSource: String(r.market_cap_source), marketCapAt: r.market_cap_at ? iso(r.market_cap_at) : null,
    website: String(r.website), websiteSource: String(r.website_source), notes: String(r.notes), hasCard: hasCard.has(String(r.isin)),
  }));
}

/// Loads the starting list (the 1,488 the app has used since 12 Nov plus the old ShareQuest market caps, websites and sectors) into an EMPTY
/// table. Refuses when there are already rows, so it can never overwrite checked data.
export async function loadStartingList(): Promise<{ ok: true; added: number } | { ok: false; error: string }> {
  await ensureUniverse();
  const n = Number((await sql`SELECT count(*)::int AS n FROM tapcard_lse_universe`)[0].n);
  if (n > 0) return { ok: false, error: `The table already holds ${n} companies. The starting list only loads into an empty table.` };
  const list = (base as { companies: { n: string; t: string; i: string; m: string; c: string }[]; asOf: string }).companies;
  const asOf = (base as { asOf: string }).asOf;
  const vals = (extra as { values: Record<string, { cap?: number; at?: string; web?: string; sec?: string }> }).values;
  let added = 0;
  for (const c of list) {
    const x = vals[c.i] ?? {};
    await sql`
      INSERT INTO tapcard_lse_universe (isin, name, ticker, market, country, sector, last_seen_in_list, market_cap, market_cap_source, market_cap_at, website, website_source)
      VALUES (${c.i}, ${c.n}, ${c.t}, ${c.m}, ${c.c}, ${x.sec ?? ""}, ${asOf}, ${x.cap ?? null}, ${x.cap ? "old ShareQuest data" : ""}, ${x.at ?? null}, ${x.web ?? ""}, ${x.web ? "old ShareQuest data (not checked)" : ""})
      ON CONFLICT (isin) DO NOTHING`;
    added++;
  }
  return { ok: true, added };
}

export interface ImportDiff {
  asOf: string;
  total: number;
  added: LseShare[];
  returned: { isin: string; name: string }[];
  /// Same company under a new ISIN (matched by ticker and first word of the name): updated in place, not treated as a delisting plus a new company.
  isinChanged: { oldIsin: string; newIsin: string; name: string; ticker: string }[];
  removed: { isin: string; name: string; ticker: string; hasCard: boolean }[];
  changed: { isin: string; name: string; changes: string[] }[];
  unchanged: number;
}

/// Smallest combined list that can be a real set of LSE lists (the three files together hold about 1,500 shares). A single file would
/// make every other file's companies look delisted, so a short list is refused outright.
export const MIN_FULL_LIST = 1000;

export async function diffImport(items: LseShare[], asOf: string): Promise<ImportDiff> {
  await ensureUniverse();
  // An empty table is first given the starting list, so a first import compares with it and keeps its market caps and websites.
  await loadStartingList();
  const rows = await sql`SELECT isin, name, ticker, market, status FROM tapcard_lse_universe`;
  const have = new Map(rows.map((r) => [String(r.isin), r]));
  const incoming = new Map(items.map((i) => [i.isin, i]));
  let added: LseShare[] = [];
  const returned: ImportDiff["returned"] = [];
  const changed: ImportDiff["changed"] = [];
  let unchanged = 0;
  for (const it of items) {
    const r = have.get(it.isin);
    if (!r) { added.push(it); continue; }
    if (r.status === "delisted") returned.push({ isin: it.isin, name: String(r.name) });
    const changes: string[] = [];
    if (String(r.ticker) !== it.ticker) changes.push(`ticker ${r.ticker} → ${it.ticker}`);
    if (String(r.market) !== it.market) changes.push(`market ${r.market} → ${it.market}`);
    if (changes.length) changed.push({ isin: it.isin, name: String(r.name), changes }); else unchanged++;
  }
  const cards = await sql`SELECT isin FROM tapcard_listed_cards WHERE isin <> ''`.catch(() => [] as Record<string, unknown>[]);
  const carded = new Set(cards.map((c) => String(c.isin)));
  let removed = rows
    .filter((r) => r.status === "listed" && !incoming.has(String(r.isin)))
    .map((r) => ({ isin: String(r.isin), name: String(r.name), ticker: String(r.ticker), hasCard: carded.has(String(r.isin)) }));
  // A share whose ISIN changed (a consolidation or re-domiciling) shows up as one removed and one added line with the same ticker.
  const first = (n: string) => n.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").trim().split(/\s+/)[0] ?? "";
  const isinChanged: ImportDiff["isinChanged"] = [];
  const usedOld = new Set<string>();
  const stillAdded: LseShare[] = [];
  for (const a of added) {
    const match = a.ticker ? removed.find((r) => !usedOld.has(r.isin) && r.ticker.toLowerCase() === a.ticker.toLowerCase() && first(r.name) === first(a.name)) : undefined;
    if (match) { usedOld.add(match.isin); isinChanged.push({ oldIsin: match.isin, newIsin: a.isin, name: match.name, ticker: a.ticker }); } else stillAdded.push(a);
  }
  added = stillAdded;
  removed = removed.filter((r) => !usedOld.has(r.isin));
  return { asOf, total: items.length, added, returned, isinChanged, removed, changed, unchanged };
}

/// Applies the same comparison: adds new shares, moves a changed ISIN across in place, marks missing ones delisted (never deleting here), re-lists ones that came back,
/// and updates changed tickers and markets. The list's name for an existing company is left alone (names here may have been tidied by hand).
export async function applyImport(items: LseShare[], asOf: string, alsoDelete = false): Promise<{ ok: true; diff: ImportDiff; deleted: number; kept: number } | { ok: false; error: string }> {
  if (items.length < MIN_FULL_LIST) return { ok: false, error: `Only ${items.length} shares were found. A full set of the three LSE lists holds about 1,500, so this looks incomplete. Nothing was changed. Upload all three files together.` };
  const diff = await diffImport(items, asOf);
  const asOfDate = asOf || null;
  for (const c of diff.isinChanged) {
    await sql`UPDATE tapcard_lse_universe SET isin = ${c.newIsin}, notes = trim(notes || ' ISIN was ' || ${c.oldIsin} || '.'), updated_at = now() WHERE isin = ${c.oldIsin}`;
    // A TapCard listed-company card holds the ISIN too: keep it in step. (Absent table on a fresh database is fine.)
    await sql`UPDATE tapcard_listed_cards SET isin = ${c.newIsin} WHERE isin = ${c.oldIsin}`.catch(() => undefined);
  }
  for (const it of diff.added) {
    await sql`
      INSERT INTO tapcard_lse_universe (isin, name, ticker, market, country, sector, segment, currency, last_seen_in_list)
      VALUES (${it.isin}, ${it.name}, ${it.ticker}, ${it.market}, ${it.country}, '', ${it.segment}, ${it.currency}, ${asOfDate})
      ON CONFLICT (isin) DO NOTHING`;
  }
  // Everything on the new list: stamp the date, re-list returns, refresh ticker, market, segment and currency.
  for (const it of items) {
    await sql`
      UPDATE tapcard_lse_universe SET last_seen_in_list = ${asOfDate}, status = 'listed', delisted_at = NULL,
        ticker = ${it.ticker}, market = ${it.market}, segment = ${it.segment}, currency = ${it.currency}, updated_at = now()
      WHERE isin = ${it.isin}`;
  }
  for (const r of diff.removed) {
    await sql`UPDATE tapcard_lse_universe SET status = 'delisted', delisted_at = now(), updated_at = now() WHERE isin = ${r.isin} AND status = 'listed'`;
  }
  // Optionally delete the ones just marked delisted (those with a TapCard card are always kept).
  const del = alsoDelete ? await removeDelisted() : { deleted: 0, kept: 0 };
  return { ok: true, diff, deleted: del.deleted, kept: del.kept };
}

/// Deletes the rows marked delisted. A company that has a TapCard listed-company card is kept (its history matters more than tidiness).
export async function removeDelisted(): Promise<{ deleted: number; kept: number }> {
  await ensureUniverse();
  const kept = await sql`
    SELECT u.isin FROM tapcard_lse_universe u WHERE u.status = 'delisted'
      AND EXISTS (SELECT 1 FROM tapcard_listed_cards c WHERE c.isin = u.isin)`.catch(() => [] as Record<string, unknown>[]);
  const keepSet = kept.map((k) => String(k.isin));
  const gone = await sql`DELETE FROM tapcard_lse_universe WHERE status = 'delisted' AND NOT (isin = ANY(${keepSet})) RETURNING isin`;
  return { deleted: gone.length, kept: keepSet.length };
}

/// Hand-editing from the table: notes, and a website that is set by hand (that always wins in later steps).
export async function setWebsite(isin: string, website: string): Promise<boolean> {
  await ensureUniverse();
  const w = website.trim();
  if (w && !/^https?:\/\/[^\s]+\.[^\s]+$/i.test(w)) return false;
  await sql`UPDATE tapcard_lse_universe SET website = ${w}, website_source = ${w ? "set by hand" : ""}, updated_at = now() WHERE isin = ${isin.toUpperCase()}`;
  return true;
}
