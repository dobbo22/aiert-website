// The "listed universe": every share line on the London Stock Exchange (Main Market and AIM) that AIERT could approach, kept in the
// database so it can be sorted, checked and kept in step with the exchange's own stock lists. AIERT admin only (/admin/social/listed).
//
// Step 1 holds: the list itself, market cap and website as first loaded from the old ShareQuest data (website NOT yet validated), and
// the spreadsheet import with a preview. Later steps add website checks, investor pages and board names to the same table.
import sql from "@/lib/db";
import base from "@/lib/data/lse-equities.json";
import extra from "@/lib/data/lse-seed-extra.json";
import type { LseShare } from "@/lib/lseStockList";
import { checkCompanyWebsite, type SiteResult, type Tried } from "@/lib/tapcardListedSite";
import { checkInvestorPages, type InvestorResult } from "@/lib/tapcardListedInvestor";
import { checkBoard, type BoardResult } from "@/lib/tapcardListedBoard";

export interface UniverseRow {
  isin: string; name: string; ticker: string; market: string; country: string; sector: string; segment: string; currency: string;
  status: "listed" | "delisted"; firstSeen: string; lastSeenInList: string; delistedAt: string | null;
  marketCap: number | null; marketCapSource: string; marketCapAt: string | null;
  website: string; websiteSource: string; websiteStatus: string; websiteCheckedAt: string | null; websiteTitle: string; notes: string; hasCard: boolean;
  irStatus: string; irUrl: string; rnsUrl: string; reportsUrl: string; priceUrl: string; shareholderUrl: string; irProvider: string; irNote: string; manualAt: string | null; rnsItems: number; publishesPrice: string; publishesCap: string; irCheckedAt: string | null;
  chNumber: string; boardStatus: string; boardUrl: string; boardCount: number; boardConfirmed: number; boardCheckedAt: string | null;
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
      // Step 2: website check results (status: unchecked, ok, unsure, wrong, parked, dead, none).
      .then(() => sql`ALTER TABLE tapcard_lse_universe ADD COLUMN IF NOT EXISTS website_status TEXT NOT NULL DEFAULT 'unchecked'`)
      .then(() => sql`ALTER TABLE tapcard_lse_universe ADD COLUMN IF NOT EXISTS website_checked_at TIMESTAMPTZ`)
      .then(() => sql`ALTER TABLE tapcard_lse_universe ADD COLUMN IF NOT EXISTS website_title TEXT NOT NULL DEFAULT ''`)
      .then(() => sql`ALTER TABLE tapcard_lse_universe ADD COLUMN IF NOT EXISTS website_evidence JSONB NOT NULL DEFAULT '[]'::jsonb`)
      // Step 3: investor pages (ir_status: unchecked, found, partial, none; publishes_*: yes, widget, no, unknown).
      .then(() => sql`ALTER TABLE tapcard_lse_universe ADD COLUMN IF NOT EXISTS ir_status TEXT NOT NULL DEFAULT 'unchecked'`)
      .then(() => sql`ALTER TABLE tapcard_lse_universe ADD COLUMN IF NOT EXISTS ir_url TEXT NOT NULL DEFAULT ''`)
      .then(() => sql`ALTER TABLE tapcard_lse_universe ADD COLUMN IF NOT EXISTS rns_url TEXT NOT NULL DEFAULT ''`)
      .then(() => sql`ALTER TABLE tapcard_lse_universe ADD COLUMN IF NOT EXISTS reports_url TEXT NOT NULL DEFAULT ''`)
      .then(() => sql`ALTER TABLE tapcard_lse_universe ADD COLUMN IF NOT EXISTS price_url TEXT NOT NULL DEFAULT ''`)
      .then(() => sql`ALTER TABLE tapcard_lse_universe ADD COLUMN IF NOT EXISTS shareholder_url TEXT NOT NULL DEFAULT ''`)
      .then(() => sql`ALTER TABLE tapcard_lse_universe ADD COLUMN IF NOT EXISTS ir_provider TEXT NOT NULL DEFAULT ''`)
      .then(() => sql`ALTER TABLE tapcard_lse_universe ADD COLUMN IF NOT EXISTS ir_note TEXT NOT NULL DEFAULT ''`)
      .then(() => sql`ALTER TABLE tapcard_lse_universe ADD COLUMN IF NOT EXISTS ir_hand JSONB NOT NULL DEFAULT '{}'::jsonb`)
      .then(() => sql`ALTER TABLE tapcard_lse_universe ADD COLUMN IF NOT EXISTS manual_at TIMESTAMPTZ`)
      .then(() => sql`ALTER TABLE tapcard_lse_universe ADD COLUMN IF NOT EXISTS rns_items INT NOT NULL DEFAULT 0`)
      .then(() => sql`ALTER TABLE tapcard_lse_universe ADD COLUMN IF NOT EXISTS publishes_price TEXT NOT NULL DEFAULT 'unknown'`)
      .then(() => sql`ALTER TABLE tapcard_lse_universe ADD COLUMN IF NOT EXISTS publishes_cap TEXT NOT NULL DEFAULT 'unknown'`)
      .then(() => sql`ALTER TABLE tapcard_lse_universe ADD COLUMN IF NOT EXISTS ir_checked_at TIMESTAMPTZ`)
      .then(() => sql`ALTER TABLE tapcard_lse_universe ADD COLUMN IF NOT EXISTS ir_evidence JSONB NOT NULL DEFAULT '{}'::jsonb`)
      // Step 4: board (board_status: unchecked, confirmed, ch_only, site_only, none, no_key). Directors are public record: name, role, source.
      .then(() => sql`ALTER TABLE tapcard_lse_universe ADD COLUMN IF NOT EXISTS ch_number TEXT NOT NULL DEFAULT ''`)
      .then(() => sql`ALTER TABLE tapcard_lse_universe ADD COLUMN IF NOT EXISTS board_status TEXT NOT NULL DEFAULT 'unchecked'`)
      .then(() => sql`ALTER TABLE tapcard_lse_universe ADD COLUMN IF NOT EXISTS board_url TEXT NOT NULL DEFAULT ''`)
      .then(() => sql`ALTER TABLE tapcard_lse_universe ADD COLUMN IF NOT EXISTS board_checked_at TIMESTAMPTZ`)
      .then(() => sql`ALTER TABLE tapcard_lse_universe ADD COLUMN IF NOT EXISTS board_evidence JSONB NOT NULL DEFAULT '{}'::jsonb`)
      .then(() => sql`
        CREATE TABLE IF NOT EXISTS tapcard_lse_board (
          isin TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT '',
          appointed_on TEXT NOT NULL DEFAULT '',
          on_ch BOOLEAN NOT NULL DEFAULT FALSE,
          on_site BOOLEAN NOT NULL DEFAULT FALSE,
          checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          PRIMARY KEY (isin, name)
        )`)
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
  const counts = await sql`SELECT isin, count(*)::int AS n, count(*) FILTER (WHERE on_ch AND on_site)::int AS both FROM tapcard_lse_board GROUP BY isin`;
  const board = new Map(counts.map((c) => [String(c.isin), { n: Number(c.n), both: Number(c.both) }]));
  return rows.map((r) => ({
    isin: String(r.isin), name: String(r.name), ticker: String(r.ticker), market: String(r.market), country: String(r.country), sector: String(r.sector),
    segment: String(r.segment), currency: String(r.currency), status: r.status === "delisted" ? "delisted" : "listed",
    firstSeen: iso(r.first_seen), lastSeenInList: iso(r.last_seen_in_list), delistedAt: r.delisted_at ? new Date(r.delisted_at as string).toISOString() : null,
    marketCap: r.market_cap === null ? null : Number(r.market_cap), marketCapSource: String(r.market_cap_source), marketCapAt: r.market_cap_at ? iso(r.market_cap_at) : null,
    website: String(r.website), websiteSource: String(r.website_source), websiteStatus: String(r.website_status ?? "unchecked"), websiteCheckedAt: r.website_checked_at ? new Date(r.website_checked_at as string).toISOString() : null, websiteTitle: String(r.website_title ?? ""), notes: String(r.notes), hasCard: hasCard.has(String(r.isin)),
    irStatus: String(r.ir_status ?? "unchecked"), irUrl: String(r.ir_url ?? ""), rnsUrl: String(r.rns_url ?? ""), reportsUrl: String(r.reports_url ?? ""), priceUrl: String(r.price_url ?? ""), shareholderUrl: String(r.shareholder_url ?? ""), irProvider: String(r.ir_provider ?? ""), irNote: String(r.ir_note ?? ""), manualAt: r.manual_at ? new Date(r.manual_at as string).toISOString() : null, rnsItems: Number(r.rns_items ?? 0),
    publishesPrice: String(r.publishes_price ?? "unknown"), publishesCap: String(r.publishes_cap ?? "unknown"), irCheckedAt: r.ir_checked_at ? new Date(r.ir_checked_at as string).toISOString() : null,
    chNumber: String(r.ch_number ?? ""), boardStatus: String(r.board_status ?? "unchecked"), boardUrl: String(r.board_url ?? ""), boardCount: board.get(String(r.isin))?.n ?? 0, boardConfirmed: board.get(String(r.isin))?.both ?? 0,
    boardCheckedAt: r.board_checked_at ? new Date(r.board_checked_at as string).toISOString() : null,
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

/// Step 2: checks one company's website now (about 5 to 40 seconds), saves the result and the evidence, and returns them.
export async function runWebsiteCheck(isin: string): Promise<{ ok: true; result: SiteResult; name: string } | { ok: false; error: string }> {
  await ensureUniverse();
  const rows = await sql`SELECT isin, name, ticker, website, website_source FROM tapcard_lse_universe WHERE isin = ${isin.toUpperCase()}`;
  if (!rows.length) return { ok: false, error: "No such company." };
  const r = rows[0];
  const result = await checkCompanyWebsite({ isin: String(r.isin), name: String(r.name), ticker: String(r.ticker), website: String(r.website), websiteSource: String(r.website_source) });
  const passing = result.tried.find((t) => t.verdict === "ok");
  if (result.status === "ok" && !result.kept) {
    await sql`
      UPDATE tapcard_lse_universe SET website = ${result.website}, website_source = ${`checked (${passing?.source ?? "found"})`}, website_status = 'ok',
        website_checked_at = now(), website_title = ${result.title}, website_evidence = ${JSON.stringify(result.tried)}::jsonb, updated_at = now()
      WHERE isin = ${result.isin}`;
  } else {
    // Not confirmed (or set by hand): keep the address as it is, record what was found.
    await sql`
      UPDATE tapcard_lse_universe SET website_status = ${result.status}, website_checked_at = now(), website_title = ${result.title},
        website_evidence = ${JSON.stringify(result.tried)}::jsonb, updated_at = now()
      WHERE isin = ${result.isin}`;
  }
  return { ok: true, result, name: String(r.name) };
}

/// The biggest listed company that has not been checked yet.
export async function nextUnchecked(): Promise<string | null> {
  await ensureUniverse();
  const r = await sql`SELECT isin FROM tapcard_lse_universe WHERE status = 'listed' AND website_status = 'unchecked' ORDER BY market_cap DESC NULLS LAST, name LIMIT 1`;
  return r.length ? String(r[0].isin) : null;
}

export async function storedEvidence(isin: string): Promise<{ tried: Tried[]; checkedAt: string | null }> {
  await ensureUniverse();
  const r = await sql`SELECT website_evidence, website_checked_at FROM tapcard_lse_universe WHERE isin = ${isin.toUpperCase()}`;
  if (!r.length) return { tried: [], checkedAt: null };
  const ev = typeof r[0].website_evidence === "string" ? JSON.parse(r[0].website_evidence as string) : r[0].website_evidence;
  return { tried: (ev as Tried[]) ?? [], checkedAt: r[0].website_checked_at ? new Date(r[0].website_checked_at as string).toISOString() : null };
}

/// Step 3: checks one company's investor pages now (up to about 45 seconds), saves the result and the evidence, and returns them.
export async function runInvestorCheck(isin: string): Promise<{ ok: true; result: InvestorResult; name: string } | { ok: false; error: string }> {
  await ensureUniverse();
  const rows = await sql`SELECT isin, name, website, website_status, ir_hand FROM tapcard_lse_universe WHERE isin = ${isin.toUpperCase()}`;
  if (!rows.length) return { ok: false, error: "No such company." };
  const r = rows[0];
  const handSet = (typeof r.ir_hand === "string" ? JSON.parse(r.ir_hand as string) : r.ir_hand ?? {}) as Partial<Record<"ir" | "rns" | "reports" | "price" | "shareholder", string>>;
  delete (handSet as Record<string, string>).board;
  if (!String(r.website) && !Object.keys(handSet).length) return { ok: false, error: "This company has no website yet. Check or set the website first." };
  const result = await checkInvestorPages({ isin: String(r.isin), name: String(r.name), website: String(r.website), handSet });
  await sql`
    UPDATE tapcard_lse_universe SET ir_status = ${result.status}, ir_url = ${result.urls.ir ?? ""}, rns_url = ${result.urls.rns ?? ""}, reports_url = ${result.urls.reports ?? ""},
      price_url = ${result.urls.price ?? ""}, shareholder_url = ${result.urls.shareholder ?? ""}, ir_provider = ${result.rnsRead.provider ?? ""}, ir_note = ${result.rnsRead.note ? result.rnsRead.note[0].toUpperCase() + result.rnsRead.note.slice(1) + "." : ""}, rns_items = ${result.rnsRead.count}, publishes_price = ${result.price.state}, publishes_cap = ${result.cap.state},
      ir_checked_at = now(), ir_evidence = ${JSON.stringify(result)}::jsonb, updated_at = now()
    WHERE isin = ${result.isin}`;
  return { ok: true, result, name: String(r.name) };
}

export async function storedInvestorEvidence(isin: string): Promise<InvestorResult | null> {
  await ensureUniverse();
  const r = await sql`SELECT ir_evidence, ir_checked_at FROM tapcard_lse_universe WHERE isin = ${isin.toUpperCase()}`;
  if (!r.length || !r[0].ir_checked_at) return null;
  const ev = typeof r[0].ir_evidence === "string" ? JSON.parse(r[0].ir_evidence as string) : r[0].ir_evidence;
  return ev && Object.keys(ev as object).length ? (ev as InvestorResult) : null;
}

/// Step 4: reads one company's board now (up to about 45 seconds): Companies House directors and the website's board page. Saves the
/// names (public record: name, role, where each was seen) and returns them.
export async function runBoardCheck(isin: string): Promise<{ ok: true; result: BoardResult; name: string } | { ok: false; error: string }> {
  await ensureUniverse();
  const rows = await sql`SELECT isin, name, website, ir_url, ir_hand FROM tapcard_lse_universe WHERE isin = ${isin.toUpperCase()}`;
  if (!rows.length) return { ok: false, error: "No such company." };
  const r = rows[0];
  const hand = (typeof r.ir_hand === "string" ? JSON.parse(r.ir_hand as string) : r.ir_hand ?? {}) as Record<string, string>;
  const result = await checkBoard({ isin: String(r.isin), name: String(r.name), website: String(r.website), irUrl: String(r.ir_url ?? ""), boardUrl: hand.board ?? "" });
  await sql`DELETE FROM tapcard_lse_board WHERE isin = ${result.isin}`;
  for (const p of result.people) {
    await sql`INSERT INTO tapcard_lse_board (isin, name, role, appointed_on, on_ch, on_site) VALUES (${result.isin}, ${p.display}, ${p.role}, ${p.appointedOn}, ${p.onCh}, ${p.onSite}) ON CONFLICT (isin, name) DO NOTHING`;
  }
  await sql`
    UPDATE tapcard_lse_universe SET ch_number = ${result.company?.number ?? ""}, board_status = ${result.status}, board_url = ${result.boardPage?.url ?? ""},
      board_checked_at = now(), board_evidence = ${JSON.stringify(result)}::jsonb, updated_at = now()
    WHERE isin = ${result.isin}`;
  return { ok: true, result, name: String(r.name) };
}

export async function storedBoardEvidence(isin: string): Promise<BoardResult | null> {
  await ensureUniverse();
  const r = await sql`SELECT board_evidence, board_checked_at FROM tapcard_lse_universe WHERE isin = ${isin.toUpperCase()}`;
  if (!r.length || !r[0].board_checked_at) return null;
  const ev = typeof r[0].board_evidence === "string" ? JSON.parse(r[0].board_evidence as string) : r[0].board_evidence;
  return ev && Object.keys(ev as object).length ? (ev as BoardResult) : null;
}

/// Investor links set by hand (for sites that draw their menus by script, so the links cannot be found). They win over anything found.
/// An empty address clears that link. The investor check is then run again by the page.
export async function setInvestorUrls(isin: string, urls: Record<string, string>): Promise<boolean> {
  await ensureUniverse();
  const roles = ["ir", "rns", "reports", "shareholder", "price", "board"];
  const clean: Record<string, string> = {};
  const clear: string[] = [];
  for (const [k, v] of Object.entries(urls)) {
    if (!roles.includes(k)) continue;
    const u = String(v ?? "").trim();
    if (!u) { clear.push(k); continue; }
    if (!/^https:\/\/[^\s]+\.[^\s]+$/i.test(u)) return false;
    clean[k] = u;
  }
  const rows = await sql`SELECT ir_hand FROM tapcard_lse_universe WHERE isin = ${isin.toUpperCase()}`;
  if (!rows.length) return false;
  const cur = (typeof rows[0].ir_hand === "string" ? JSON.parse(rows[0].ir_hand as string) : rows[0].ir_hand ?? {}) as Record<string, string>;
  for (const k of clear) delete cur[k];
  const next = { ...cur, ...clean };
  await sql`UPDATE tapcard_lse_universe SET ir_hand = ${JSON.stringify(next)}::jsonb, updated_at = now() WHERE isin = ${isin.toUpperCase()}`;
  return true;
}

export async function storedInvestorHand(isin: string): Promise<Record<string, string>> {
  await ensureUniverse();
  const rows = await sql`SELECT ir_hand FROM tapcard_lse_universe WHERE isin = ${isin.toUpperCase()}`;
  if (!rows.length) return {};
  return (typeof rows[0].ir_hand === "string" ? JSON.parse(rows[0].ir_hand as string) : rows[0].ir_hand ?? {}) as Record<string, string>;
}

export interface ManualRecord { website: string; urls: Record<string, string>; notes: string; verified: boolean; verifiedAt: string | null }

export async function getManual(isin: string): Promise<ManualRecord | null> {
  await ensureUniverse();
  const rows = await sql`SELECT website, ir_hand, notes, manual_at, ir_url, rns_url, reports_url, shareholder_url, price_url FROM tapcard_lse_universe WHERE isin = ${isin.toUpperCase()}`;
  if (!rows.length) return null;
  const r = rows[0];
  const hand = (typeof r.ir_hand === "string" ? JSON.parse(r.ir_hand as string) : r.ir_hand ?? {}) as Record<string, string>;
  // The form shows what is stored now: a hand-set link, else the one the check found.
  const urls = { ir: hand.ir ?? String(r.ir_url ?? ""), rns: hand.rns ?? String(r.rns_url ?? ""), reports: hand.reports ?? String(r.reports_url ?? ""), shareholder: hand.shareholder ?? String(r.shareholder_url ?? ""), price: hand.price ?? String(r.price_url ?? ""), board: hand.board ?? "" };
  return { website: String(r.website), urls, notes: String(r.notes), verified: !!r.manual_at, verifiedAt: r.manual_at ? new Date(r.manual_at as string).toISOString() : null };
}

/// The Edit panel: everything for one company set by hand in one go. Links given are stored as hand-set (they win over anything the checks
/// find, and the investor check reads them); the website is stored as "set by hand"; "verified" stamps the date. Empty clears.
export async function saveManual(isin: string, m: { website: string; urls: Record<string, string>; notes: string; verified: boolean }): Promise<{ ok: true } | { ok: false; error: string }> {
  await ensureUniverse();
  const web = m.website.trim();
  if (web && !/^https?:\/\/[^\s]+\.[^\s]+$/i.test(web)) return { ok: false, error: "The website must start with https:// (or http://)." };
  const roles = ["ir", "rns", "reports", "shareholder", "price", "board"];
  const hand: Record<string, string> = {};
  for (const k of roles) {
    const u = String(m.urls[k] ?? "").trim();
    if (!u) continue;
    if (!/^https?:\/\/[^\s]+\.[^\s]+$/i.test(u)) return { ok: false, error: `The ${k === "ir" ? "investor relations" : k} link must be a full web address.` };
    hand[k] = u;
  }
  const id = isin.toUpperCase();
  const own = await sql`SELECT 1 FROM tapcard_lse_universe WHERE isin = ${id}`;
  if (!own.length) return { ok: false, error: "No such company." };
  await sql`
    UPDATE tapcard_lse_universe SET website = ${web}, website_source = ${web ? "set by hand" : ""}, website_status = CASE WHEN ${web} = '' THEN 'unchecked' ELSE website_status END,
      ir_hand = ${JSON.stringify(hand)}::jsonb, notes = ${m.notes.slice(0, 2000)},
      ir_url = CASE WHEN ${hand.ir ?? ""} <> '' THEN ${hand.ir ?? ""} ELSE ir_url END, rns_url = CASE WHEN ${hand.rns ?? ""} <> '' THEN ${hand.rns ?? ""} ELSE rns_url END,
      reports_url = CASE WHEN ${hand.reports ?? ""} <> '' THEN ${hand.reports ?? ""} ELSE reports_url END, shareholder_url = CASE WHEN ${hand.shareholder ?? ""} <> '' THEN ${hand.shareholder ?? ""} ELSE shareholder_url END,
      price_url = CASE WHEN ${hand.price ?? ""} <> '' THEN ${hand.price ?? ""} ELSE price_url END,
      board_url = CASE WHEN ${hand.board ?? ""} <> '' THEN ${hand.board ?? ""} ELSE board_url END,
      manual_at = ${m.verified ? new Date().toISOString() : null}, updated_at = now()
    WHERE isin = ${id}`;
  return { ok: true };
}
