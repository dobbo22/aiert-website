// One special offer per card (cards are public; the owner's edit token sets it).
// Anyone with the card can claim it and gets a one-off code (shown as a QR code
// in the app, opening tapcard.aiert.co.uk/o/<code>). The business marks the
// code as used by entering the offer's staff PIN on that page — no accounts.
import crypto from "crypto";
import sql from "@/lib/db";
import { hashSecret } from "@/lib/tapcardAuth";

export interface OfferRow {
  id: number;
  card_id: string;
  text: string;
  expires_at: string | null;
  max_claims: number | null;
  pin_hash: string;
  pin_fails: number;
  created_at: string;
}

let ready: Promise<unknown> | null = null;
function ensureOfferSchema(): Promise<unknown> {
  if (!ready) {
    ready = sql`
      CREATE TABLE IF NOT EXISTS tapcard_offers (
        id BIGSERIAL PRIMARY KEY,
        card_id TEXT NOT NULL,
        text TEXT NOT NULL,
        expires_at TIMESTAMPTZ,
        max_claims INTEGER,
        pin_hash TEXT NOT NULL,
        pin_fails INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `
      .then(() => sql`CREATE INDEX IF NOT EXISTS tapcard_offers_card ON tapcard_offers (card_id)`)
      .then(() => sql`
        CREATE TABLE IF NOT EXISTS tapcard_offer_claims (
          id BIGSERIAL PRIMARY KEY,
          offer_id BIGINT NOT NULL,
          claimant_hash TEXT NOT NULL,
          code TEXT NOT NULL UNIQUE,
          claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          redeemed_at TIMESTAMPTZ,
          UNIQUE (offer_id, claimant_hash)
        )
      `)
      .then(() => sql`
        CREATE TABLE IF NOT EXISTS tapcard_announcements (
          id BIGSERIAL PRIMARY KEY,
          card_id TEXT NOT NULL,
          text TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          withdrawn BOOLEAN NOT NULL DEFAULT false
        )
      `)
      .then(() => sql`CREATE INDEX IF NOT EXISTS tapcard_announcements_card ON tapcard_announcements (card_id)`)
      .then(() => sql`
        CREATE TABLE IF NOT EXISTS tapcard_followers (
          card_id TEXT NOT NULL,
          follower_hash TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          PRIMARY KEY (card_id, follower_hash)
        )
      `)
      .catch((err) => {
        ready = null;
        throw err;
      });
  }
  return ready;
}

export const MAX_OFFER_TEXT = 140;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function newCode(): string {
  const bytes = crypto.randomBytes(10);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

function pinHash(offerSalt: string, pin: string): string {
  return hashSecret(`tapcard-offer-pin:${offerSalt}:${pin}`);
}

export function isValidPin(pin: unknown): pin is string {
  return typeof pin === "string" && /^\d{4,6}$/.test(pin);
}

/// The card's offer, or null if none / expired.
export async function currentOffer(cardId: string, includeExpired = false): Promise<OfferRow | null> {
  await ensureOfferSchema();
  const row = ((await sql`
    SELECT * FROM tapcard_offers WHERE card_id = ${cardId} ORDER BY id DESC LIMIT 1
  `) as OfferRow[])[0];
  if (!row) return null;
  if (!includeExpired && row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return null;
  return row;
}

export async function offerCounts(offerId: number): Promise<{ claimed: number; redeemed: number }> {
  const r = ((await sql`
    SELECT COUNT(*)::int AS claimed, COUNT(redeemed_at)::int AS redeemed
    FROM tapcard_offer_claims WHERE offer_id = ${offerId}
  `) as { claimed: number; redeemed: number }[])[0];
  return r ?? { claimed: 0, redeemed: 0 };
}

/// What the public card JSON carries: no PIN, nothing about who claimed.
export async function publicOffer(cardId: string) {
  const o = await currentOffer(cardId);
  if (!o) return null;
  const { claimed } = await offerCounts(o.id);
  return {
    id: Number(o.id),
    text: o.text,
    expiresAt: o.expires_at,
    claimsLeft: o.max_claims == null ? null : Math.max(0, o.max_claims - claimed),
    postedAt: o.created_at ? new Date(o.created_at).toISOString() : null,
  };
}

export interface OfferInput {
  text: unknown;
  expiresAt?: unknown;
  maxClaims?: unknown;
  pin: unknown;
}

/// Replaces the card's offer. Old claims stay on the old offer row, so they stop
/// working the moment a new offer is posted.
export async function setOffer(cardId: string, input: OfferInput): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  await ensureOfferSchema();
  const text = typeof input.text === "string" ? input.text.trim().slice(0, MAX_OFFER_TEXT) : "";
  if (!text) return { ok: false, error: "offer text is required" };
  if (!isValidPin(input.pin)) return { ok: false, error: "pin must be 4 to 6 digits" };
  let expires: string | null = null;
  if (typeof input.expiresAt === "string" && input.expiresAt) {
    const t = new Date(input.expiresAt);
    if (Number.isNaN(t.getTime())) return { ok: false, error: "expiresAt is not a date" };
    if (t.getTime() < Date.now()) return { ok: false, error: "expiresAt is in the past" };
    expires = t.toISOString();
  }
  let max: number | null = null;
  if (input.maxClaims != null && input.maxClaims !== "") {
    const n = Number(input.maxClaims);
    if (!Number.isInteger(n) || n < 1 || n > 100000) return { ok: false, error: "maxClaims must be a whole number from 1" };
    max = n;
  }
  const salt = crypto.randomBytes(8).toString("hex");
  const hash = `${salt}:${pinHash(salt, input.pin)}`;
  const row = ((await sql`
    INSERT INTO tapcard_offers (card_id, text, expires_at, max_claims, pin_hash)
    VALUES (${cardId}, ${text}, ${expires}, ${max}, ${hash})
    RETURNING id
  `) as { id: number }[])[0];
  return { ok: true, id: row.id };
}

export async function clearOffers(cardId: string): Promise<void> {
  await ensureOfferSchema();
  // Offer rows are kept (so old codes read "no longer valid"); a cleared state is an expired marker.
  await sql`UPDATE tapcard_offers SET expires_at = now() - interval '1 second' WHERE card_id = ${cardId}`;
}

export type ClaimResult =
  | { ok: true; code: string; redeemed: boolean }
  | { ok: false; error: "no_offer" | "sold_out" };

/// Same claimant (a random id the app keeps) always gets the same code back.
export async function claimOffer(cardId: string, claimant: string): Promise<ClaimResult> {
  await ensureOfferSchema();
  const offer = await currentOffer(cardId);
  if (!offer) return { ok: false, error: "no_offer" };
  const who = hashSecret(`tapcard-claimant:${claimant}`);
  const existing = ((await sql`
    SELECT code, redeemed_at FROM tapcard_offer_claims WHERE offer_id = ${offer.id} AND claimant_hash = ${who}
  `) as { code: string; redeemed_at: string | null }[])[0];
  if (existing) return { ok: true, code: existing.code, redeemed: !!existing.redeemed_at };
  if (offer.max_claims != null) {
    const { claimed } = await offerCounts(offer.id);
    if (claimed >= offer.max_claims) return { ok: false, error: "sold_out" };
  }
  const code = newCode();
  const inserted = (await sql`
    INSERT INTO tapcard_offer_claims (offer_id, claimant_hash, code)
    VALUES (${offer.id}, ${who}, ${code})
    ON CONFLICT (offer_id, claimant_hash) DO NOTHING
    RETURNING code
  `) as { code: string }[];
  if (inserted.length) return { ok: true, code, redeemed: false };
  const again = ((await sql`
    SELECT code, redeemed_at FROM tapcard_offer_claims WHERE offer_id = ${offer.id} AND claimant_hash = ${who}
  `) as { code: string; redeemed_at: string | null }[])[0];
  return { ok: true, code: again.code, redeemed: !!again.redeemed_at };
}

/// Followers are only ever a count: a one-way hash of a random per-install id, never shown or listed.
export async function setFollower(cardId: string, follower: string, follow: boolean): Promise<void> {
  await ensureOfferSchema();
  const who = hashSecret(`tapcard-follower:${follower}`);
  if (follow) await sql`INSERT INTO tapcard_followers (card_id, follower_hash) VALUES (${cardId}, ${who}) ON CONFLICT DO NOTHING`;
  else await sql`DELETE FROM tapcard_followers WHERE card_id = ${cardId} AND follower_hash = ${who}`;
}

export async function followerCount(cardId: string): Promise<number> {
  await ensureOfferSchema();
  const r = (await sql`SELECT COUNT(*)::int AS n FROM tapcard_followers WHERE card_id = ${cardId}`) as { n: number }[];
  return Number(r[0]?.n ?? 0);
}

export interface CodeStatus {
  state: "valid" | "used" | "expired" | "replaced" | "unknown";
  offerText?: string;
  cardId?: string;
  cardName?: string;
  expiresAt?: string | null;
  redeemedAt?: string | null;
}

export async function codeStatus(code: string): Promise<CodeStatus> {
  await ensureOfferSchema();
  if (!/^[A-Z0-9]{10}$/.test(code)) return { state: "unknown" };
  const row = ((await sql`
    SELECT c.redeemed_at, o.id AS offer_id, o.card_id, o.text, o.expires_at,
           (SELECT MAX(id) FROM tapcard_offers WHERE card_id = o.card_id) AS latest_id,
           (SELECT COALESCE(NULLIF(company, ''), name) FROM tapcard_cards WHERE id = o.card_id) AS card_name
    FROM tapcard_offer_claims c JOIN tapcard_offers o ON o.id = c.offer_id
    WHERE c.code = ${code}
  `) as {
    redeemed_at: string | null; offer_id: number; card_id: string; text: string;
    expires_at: string | null; latest_id: number; card_name: string | null;
  }[])[0];
  if (!row) return { state: "unknown" };
  const base = { offerText: row.text, cardId: row.card_id, cardName: row.card_name ?? "", expiresAt: row.expires_at, redeemedAt: row.redeemed_at };
  if (row.redeemed_at) return { state: "used", ...base };
  if (Number(row.latest_id) !== Number(row.offer_id)) return { state: "replaced", ...base };
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return { state: "expired", ...base };
  return { state: "valid", ...base };
}

const MAX_PIN_FAILS = 10;

export type RedeemResult =
  | { ok: true; offerText: string }
  | { ok: false; error: "bad_pin" | "locked" | "not_valid"; state?: CodeStatus["state"] };

export async function redeemCode(code: string, pin: unknown): Promise<RedeemResult> {
  const status = await codeStatus(code);
  if (status.state !== "valid") return { ok: false, error: "not_valid", state: status.state };
  const o = ((await sql`
    SELECT o.id, o.pin_hash, o.pin_fails FROM tapcard_offers o
    JOIN tapcard_offer_claims c ON c.offer_id = o.id WHERE c.code = ${code}
  `) as { id: number; pin_hash: string; pin_fails: number }[])[0];
  if (!o) return { ok: false, error: "not_valid", state: "unknown" };
  if (o.pin_fails >= MAX_PIN_FAILS) return { ok: false, error: "locked" };
  const [salt, stored] = o.pin_hash.split(":");
  const given = isValidPin(pin) ? pinHash(salt, pin) : "";
  const match = given.length === stored.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(stored));
  if (!match) {
    await sql`UPDATE tapcard_offers SET pin_fails = pin_fails + 1 WHERE id = ${o.id}`;
    return { ok: false, error: "bad_pin" };
  }
  // Atomic: only the first redeem of a code succeeds.
  const done = (await sql`
    UPDATE tapcard_offer_claims SET redeemed_at = now() WHERE code = ${code} AND redeemed_at IS NULL RETURNING id
  `) as { id: number }[];
  if (!done.length) return { ok: false, error: "not_valid", state: "used" };
  await sql`UPDATE tapcard_offers SET pin_fails = 0 WHERE id = ${o.id}`;
  return { ok: true, offerText: status.offerText ?? "" };
}

// ---- Announcements ("New autumn menu", "Christmas bookings open"): one short line per card, newest wins.
export const MAX_ANNOUNCEMENT_TEXT = 140;
// A restaurant can post a new one at most this often (stops a card turning into a spam source).
const MIN_ANNOUNCEMENT_GAP_MS = 6 * 60 * 60 * 1000;

export async function publicAnnouncement(cardId: string) {
  await ensureOfferSchema();
  const row = ((await sql`
    SELECT id, text, created_at, withdrawn FROM tapcard_announcements WHERE card_id = ${cardId} ORDER BY id DESC LIMIT 1
  `) as { id: number; text: string; created_at: string; withdrawn: boolean }[])[0];
  if (!row || row.withdrawn) return null;
  return { id: Number(row.id), text: row.text, postedAt: new Date(row.created_at).toISOString() };
}

export async function setAnnouncement(cardId: string, textRaw: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  await ensureOfferSchema();
  const text = typeof textRaw === "string" ? textRaw.trim().slice(0, MAX_ANNOUNCEMENT_TEXT) : "";
  if (!text) return { ok: false, error: "announcement text is required" };
  const last = ((await sql`SELECT created_at FROM tapcard_announcements WHERE card_id = ${cardId} ORDER BY id DESC LIMIT 1`) as { created_at: string }[])[0];
  if (last && Date.now() - new Date(last.created_at).getTime() < MIN_ANNOUNCEMENT_GAP_MS) {
    return { ok: false, error: "You can post one announcement every 6 hours" };
  }
  await sql`INSERT INTO tapcard_announcements (card_id, text) VALUES (${cardId}, ${text})`;
  return { ok: true };
}

export async function clearAnnouncement(cardId: string): Promise<void> {
  await ensureOfferSchema();
  await sql`UPDATE tapcard_announcements SET withdrawn = true WHERE card_id = ${cardId}`;
}

// ---- TapCard for Business: one row per location (company card) for the admin dashboard.
export interface OrgPromoteRow {
  id: string;
  name: string;
  label: string;
  company: string;
  views: number;
  qrViews: number;
  saves: number;
  followers: number;
  offerText: string | null;
  offerExpires: string | null;
  offerClaimed: number;
  offerRedeemed: number;
  claimedTotal: number;
  redeemedTotal: number;
  news: string | null;
  newsAt: string | null;
}

export async function orgPromoteRows(orgId: string): Promise<OrgPromoteRow[]> {
  await ensureOfferSchema();
  const rows = (await sql`
    SELECT c.id, c.name, c.label, c.company, c.view_count, c.qr_view_count, c.save_count,
      o.text AS offer_text, o.expires_at AS offer_expires,
      (SELECT COUNT(*)::int FROM tapcard_offer_claims cl WHERE cl.offer_id = o.id) AS offer_claimed,
      (SELECT COUNT(*)::int FROM tapcard_offer_claims cl WHERE cl.offer_id = o.id AND cl.redeemed_at IS NOT NULL) AS offer_redeemed,
      (SELECT COUNT(*)::int FROM tapcard_offer_claims cl JOIN tapcard_offers oo ON oo.id = cl.offer_id WHERE oo.card_id = c.id) AS claimed_total,
      (SELECT COUNT(*)::int FROM tapcard_offer_claims cl JOIN tapcard_offers oo ON oo.id = cl.offer_id WHERE oo.card_id = c.id AND cl.redeemed_at IS NOT NULL) AS redeemed_total,
      (SELECT COUNT(*)::int FROM tapcard_followers f WHERE f.card_id = c.id) AS followers,
      a.text AS news, a.created_at AS news_at
    FROM tapcard_cards c
    LEFT JOIN LATERAL (SELECT id, text, expires_at FROM tapcard_offers WHERE card_id = c.id ORDER BY id DESC LIMIT 1) o ON true
    LEFT JOIN LATERAL (SELECT text, created_at FROM tapcard_announcements WHERE card_id = c.id AND NOT withdrawn ORDER BY id DESC LIMIT 1) a ON true
    WHERE c.org_id = ${orgId}
    ORDER BY c.company, c.name
  `) as Record<string, unknown>[];
  const live = (iso: string | null) => (iso && new Date(iso).getTime() < Date.now() ? null : iso);
  return rows.map((r) => ({
    id: String(r.id), name: String(r.name ?? ""), label: String(r.label ?? ""), company: String(r.company ?? ""),
    views: Number(r.view_count ?? 0), qrViews: Number(r.qr_view_count ?? 0), saves: Number(r.save_count ?? 0), followers: Number(r.followers ?? 0),
    offerText: r.offer_text && !(r.offer_expires && new Date(String(r.offer_expires)).getTime() < Date.now()) ? String(r.offer_text) : null,
    offerExpires: live(r.offer_expires ? new Date(String(r.offer_expires)).toISOString() : null),
    offerClaimed: Number(r.offer_claimed ?? 0), offerRedeemed: Number(r.offer_redeemed ?? 0),
    claimedTotal: Number(r.claimed_total ?? 0), redeemedTotal: Number(r.redeemed_total ?? 0),
    news: r.news ? String(r.news) : null, newsAt: r.news_at ? new Date(String(r.news_at)).toISOString() : null,
  }));
}
