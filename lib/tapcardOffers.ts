// One special offer per card (cards are public; the owner's edit token sets it).
// Anyone with the card can claim it and gets a one-off code (shown as a QR code
// in the app, opening tapcard.aiert.co.uk/o/<code>). The business marks the
// code as used by entering the offer's staff PIN on that page — no accounts.
//
// An offer is either "once" (one code, used once) or a "stamps" card the owner configures: N stamps, then a reward of
// their own wording (3 meals then a free child's meal, 6 coffees then a free one...). The same claim code is the card:
// staff scan it and enter the PIN to add a stamp (never more often than the owner's minimum gap), and again to give the
// reward, which starts the card again.
import crypto from "crypto";
import sql from "@/lib/db";
import { hashSecret } from "@/lib/tapcardAuth";
import { moderate } from "@/lib/tapcardModeration";

export interface OfferRow {
  id: number;
  card_id: string;
  text: string;
  expires_at: string | null;
  max_claims: number | null;
  pin_hash: string;
  pin_fails: number;
  created_at: string;
  /// The card that posted it, or "admin" for the company's web admin.
  posted_by: string | null;
  /// "once" (a single-use code) or "stamps" (a stamp card the owner configures).
  kind: string;
  stamps_required: number | null;
  reward_text: string;
  stamp_gap_hours: number;
  /// A stamp card where the customer must hold the TapCard app from this many stamps on (null: no requirement).
  app_after: number | null;
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
      .then(() => sql`ALTER TABLE tapcard_offers ADD COLUMN IF NOT EXISTS posted_by TEXT`)
      .then(() => sql`ALTER TABLE tapcard_offers ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'once'`)
      .then(() => sql`ALTER TABLE tapcard_offers ADD COLUMN IF NOT EXISTS stamps_required INTEGER`)
      .then(() => sql`ALTER TABLE tapcard_offers ADD COLUMN IF NOT EXISTS reward_text TEXT NOT NULL DEFAULT ''`)
      .then(() => sql`ALTER TABLE tapcard_offers ADD COLUMN IF NOT EXISTS stamp_gap_hours INTEGER NOT NULL DEFAULT 0`)
      .then(() => sql`ALTER TABLE tapcard_offers ADD COLUMN IF NOT EXISTS app_after INTEGER`)
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
      .then(() => sql`ALTER TABLE tapcard_offer_claims ADD COLUMN IF NOT EXISTS stamps INTEGER NOT NULL DEFAULT 0`)
      .then(() => sql`ALTER TABLE tapcard_offer_claims ADD COLUMN IF NOT EXISTS last_stamp_at TIMESTAMPTZ`)
      .then(() => sql`ALTER TABLE tapcard_offer_claims ADD COLUMN IF NOT EXISTS rewards_given INTEGER NOT NULL DEFAULT 0`)
      // Where the claim was made: "web" (card page), "clip" (App Clip) or "app" (the TapCard app).
      .then(() => sql`ALTER TABLE tapcard_offer_claims ADD COLUMN IF NOT EXISTS via TEXT NOT NULL DEFAULT 'web'`)
      .then(() => sql`
        CREATE TABLE IF NOT EXISTS tapcard_announcements (
          id BIGSERIAL PRIMARY KEY,
          card_id TEXT NOT NULL,
          text TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          withdrawn BOOLEAN NOT NULL DEFAULT false
        )
      `)
      .then(() => sql`ALTER TABLE tapcard_announcements ADD COLUMN IF NOT EXISTS link TEXT`)
      .then(() => sql`CREATE INDEX IF NOT EXISTS tapcard_announcements_card ON tapcard_announcements (card_id)`)
      .then(() => sql`
        CREATE TABLE IF NOT EXISTS tapcard_followers (
          card_id TEXT NOT NULL,
          follower_hash TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          PRIMARY KEY (card_id, follower_hash)
        )
      `)
      .then(() => sql`
        CREATE TABLE IF NOT EXISTS tapcard_card_installs (
          card_id TEXT NOT NULL,
          install_hash TEXT NOT NULL,
          platform TEXT NOT NULL DEFAULT '',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          PRIMARY KEY (card_id, install_hash)
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
    SELECT COUNT(*)::int AS claimed, (COUNT(redeemed_at) + COALESCE(SUM(rewards_given), 0))::int AS redeemed
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
    kind: o.kind === "stamps" ? "stamps" : "once",
    ...(o.kind === "stamps" ? { stampsRequired: o.stamps_required ?? 0, rewardText: o.reward_text, stampGapHours: o.stamp_gap_hours, appRequiredAfter: o.app_after } : {}),
  };
}

export interface OfferInput {
  text: unknown;
  expiresAt?: unknown;
  maxClaims?: unknown;
  pin: unknown;
  /// "once" (default) or "stamps": N stamps, then a reward in the owner's own words.
  kind?: unknown;
  stampsRequired?: unknown;
  rewardText?: unknown;
  /// The least time between two stamps for one customer (0 = no limit).
  stampGapHours?: unknown;
  /// true: from the second stamp on the customer must hold the TapCard app (the first stamp needs no install).
  requireAppAfterFirst?: unknown;
}

export const MAX_STAMPS = 20;
export const MAX_REWARD_TEXT = 60;

/// Replaces the card's offer. Old claims stay on the old offer row, so they stop
/// working the moment a new offer is posted.
export async function setOffer(cardId: string, input: OfferInput, postedBy: string | null = null): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
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
  const kind = input.kind === "stamps" ? "stamps" : "once";
  // Nothing abusive or gambling-related reaches customers (this is the single place every offer is saved, whatever app or page posted it).
  const rewardForCheck = typeof input.rewardText === "string" ? input.rewardText : "";
  const moderated = await moderate(cardId, [{ kind: "offer", text }, { kind: "reward", text: rewardForCheck }]);
  if (!moderated.ok) return { ok: false, error: moderated.error };
  let stampsRequired: number | null = null;
  let rewardText = "";
  let gapHours = 0;
  let appAfter: number | null = null;
  if (kind === "stamps") {
    if (input.requireAppAfterFirst === true) appAfter = 1;
    const n = Number(input.stampsRequired ?? 5);
    if (!Number.isInteger(n) || n < 1 || n > MAX_STAMPS) return { ok: false, error: `stamps needed must be a whole number from 1 to ${MAX_STAMPS}` };
    stampsRequired = n;
    rewardText = typeof input.rewardText === "string" ? input.rewardText.trim().slice(0, MAX_REWARD_TEXT) : "";
    if (!rewardText) return { ok: false, error: "say what the reward is" };
    const g = Number(input.stampGapHours ?? 4);
    if (!Number.isInteger(g) || g < 0 || g > 72) return { ok: false, error: "the gap between stamps must be 0 to 72 hours" };
    gapHours = g;
  }
  const salt = crypto.randomBytes(8).toString("hex");
  const hash = `${salt}:${pinHash(salt, input.pin)}`;
  const row = ((await sql`
    INSERT INTO tapcard_offers (card_id, text, expires_at, max_claims, pin_hash, posted_by, kind, stamps_required, reward_text, stamp_gap_hours, app_after)
    VALUES (${cardId}, ${text}, ${expires}, ${max}, ${hash}, ${postedBy}, ${kind}, ${stampsRequired}, ${rewardText}, ${gapHours}, ${appAfter})
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
export async function claimOffer(cardId: string, claimant: string, viaRaw: unknown = "web"): Promise<ClaimResult> {
  const via = viaRaw === "app" || viaRaw === "clip" ? viaRaw : "web";
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
    INSERT INTO tapcard_offer_claims (offer_id, claimant_hash, code, via)
    VALUES (${offer.id}, ${who}, ${code}, ${via})
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

/// An install that came from scanning this business's QR code or link: the app was installed after a visit to the business's
/// card page and opened on that business. Counted once per install (a one-way hash of the app's random id), never listed.
export async function recordInstall(cardId: string, install: string, platform: string): Promise<void> {
  await ensureOfferSchema();
  const who = hashSecret(`tapcard-install:${install}`);
  const plat = platform === "ios" || platform === "android" ? platform : "";
  await sql`INSERT INTO tapcard_card_installs (card_id, install_hash, platform) VALUES (${cardId}, ${who}, ${plat}) ON CONFLICT DO NOTHING`;
}

export async function installCount(cardId: string): Promise<number> {
  await ensureOfferSchema();
  const r = (await sql`SELECT COUNT(*)::int AS n FROM tapcard_card_installs WHERE card_id = ${cardId}`) as { n: number }[];
  return Number(r[0]?.n ?? 0);
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
  /// A stamp card: how far along it is.
  kind?: "once" | "stamps";
  stamps?: number;
  stampsRequired?: number;
  rewardText?: string;
  rewardsGiven?: number;
  /// When the next stamp may be added (null: now).
  nextStampAt?: string | null;
  rewardReady?: boolean;
  /// Where this card was claimed ("web", "clip" or "app"), and whether the owner needs the app for the next stamp.
  via?: string;
  appRequiredAfter?: number | null;
  needsApp?: boolean;
}

export async function codeStatus(code: string): Promise<CodeStatus> {
  await ensureOfferSchema();
  if (!/^[A-Z0-9]{10}$/.test(code)) return { state: "unknown" };
  const row = ((await sql`
    SELECT c.redeemed_at, c.stamps, c.last_stamp_at, c.rewards_given, c.via, o.app_after, o.kind, o.stamps_required, o.reward_text, o.stamp_gap_hours,
           o.id AS offer_id, o.card_id, o.text, o.expires_at,
           (SELECT MAX(id) FROM tapcard_offers WHERE card_id = o.card_id) AS latest_id,
           (SELECT COALESCE(NULLIF(company, ''), name) FROM tapcard_cards WHERE id = o.card_id) AS card_name
    FROM tapcard_offer_claims c JOIN tapcard_offers o ON o.id = c.offer_id
    WHERE c.code = ${code}
  `) as {
    redeemed_at: string | null; offer_id: number; card_id: string; text: string;
    expires_at: string | null; latest_id: number; card_name: string | null;
    stamps: number; last_stamp_at: string | null; rewards_given: number; via: string; app_after: number | null; kind: string; stamps_required: number | null; reward_text: string; stamp_gap_hours: number;
  }[])[0];
  if (!row) return { state: "unknown" };
  const isStamps = row.kind === "stamps";
  let nextStampAt: string | null = null;
  if (isStamps && row.last_stamp_at && row.stamp_gap_hours > 0) {
    const t = new Date(row.last_stamp_at).getTime() + row.stamp_gap_hours * 3_600_000;
    if (t > Date.now()) nextStampAt = new Date(t).toISOString();
  }
  const base: Omit<CodeStatus, "state"> = {
    offerText: row.text, cardId: row.card_id, cardName: row.card_name ?? "", expiresAt: row.expires_at, redeemedAt: isStamps ? null : row.redeemed_at,
    kind: isStamps ? "stamps" : "once",
    ...(isStamps ? {
      stamps: Number(row.stamps), stampsRequired: row.stamps_required ?? 0, rewardText: row.reward_text, rewardsGiven: Number(row.rewards_given),
      nextStampAt, rewardReady: Number(row.stamps) >= (row.stamps_required ?? 0),
      via: row.via, appRequiredAfter: row.app_after,
      needsApp: row.app_after != null && row.via !== "app" && Number(row.stamps) >= row.app_after && Number(row.stamps) < (row.stamps_required ?? 0),
    } : {}),
  };
  if (!isStamps && row.redeemed_at) return { state: "used", ...base };
  if (Number(row.latest_id) !== Number(row.offer_id)) return { state: "replaced", ...base };
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return { state: "expired", ...base };
  return { state: "valid", ...base };
}

const MAX_PIN_FAILS = 10;

export type RedeemResult =
  | { ok: true; offerText: string }
  | { ok: false; error: "bad_pin" | "locked" | "not_valid" | "stamp_card"; state?: CodeStatus["state"] };

export async function redeemCode(code: string, pin: unknown): Promise<RedeemResult> {
  const status = await codeStatus(code);
  if (status.state !== "valid") return { ok: false, error: "not_valid", state: status.state };
  if (status.kind === "stamps") return { ok: false, error: "stamp_card", state: status.state };
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

/// The staff PIN check shared by the stamp and reward actions (same lockout as redeeming a one-off code).
async function checkStaffPin(code: string, pin: unknown): Promise<{ ok: true; status: CodeStatus; offerId: number } | { ok: false; error: "bad_pin" | "locked" | "not_valid" | "not_stamp_card"; state?: CodeStatus["state"] }> {
  const status = await codeStatus(code);
  if (status.state !== "valid") return { ok: false, error: "not_valid", state: status.state };
  if (status.kind !== "stamps") return { ok: false, error: "not_stamp_card" };
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
  await sql`UPDATE tapcard_offers SET pin_fails = 0 WHERE id = ${o.id}`;
  return { ok: true, status, offerId: Number(o.id) };
}

export type StampResult =
  | { ok: true; status: CodeStatus }
  | { ok: false; error: "bad_pin" | "locked" | "not_valid" | "not_stamp_card" | "full" | "too_soon" | "not_full" | "needs_app"; state?: CodeStatus["state"]; status?: CodeStatus };

/// Staff add one stamp: PIN checked, never past the card's size, never sooner than the owner's minimum gap.
export async function stampCode(code: string, pin: unknown): Promise<StampResult> {
  const c = await checkStaffPin(code, pin);
  if (!c.ok) return c;
  if (c.status.rewardReady) return { ok: false, error: "full", status: c.status };
  // The owner needs the customer to hold the app from the next stamp on (the first stamp needs no install).
  if (c.status.needsApp) return { ok: false, error: "needs_app", status: c.status };
  if (c.status.nextStampAt) return { ok: false, error: "too_soon", status: c.status };
  // Atomic: the size and the gap are re-checked in the UPDATE, so two scans at once add one stamp.
  const done = (await sql`
    UPDATE tapcard_offer_claims c SET stamps = c.stamps + 1, last_stamp_at = now()
    FROM tapcard_offers o
    WHERE c.code = ${code} AND o.id = c.offer_id AND c.stamps < o.stamps_required
      AND (o.app_after IS NULL OR c.via = 'app' OR c.stamps < o.app_after)
      AND (o.stamp_gap_hours = 0 OR c.last_stamp_at IS NULL OR c.last_stamp_at <= now() - (o.stamp_gap_hours * interval '1 hour'))
    RETURNING c.id
  `) as { id: number }[];
  if (!done.length) {
    const status = await codeStatus(code);
    return { ok: false, error: status.needsApp ? "needs_app" : "too_soon", status };
  }
  return { ok: true, status: await codeStatus(code) };
}

/// A claim made on the web or in the App Clip moves to the app that was installed after it: the app presents the claim code it
/// was handed, and the card (with its stamps) now belongs to the app's claimant. Nothing is lost by installing.
export async function adoptClaim(cardId: string, code: string, claimant: string): Promise<{ ok: true; code: string } | { ok: false; error: "not_found" | "not_valid" | "has_own_card" }> {
  await ensureOfferSchema();
  if (!/^[A-Z0-9]{10}$/.test(code)) return { ok: false, error: "not_found" };
  const status = await codeStatus(code);
  if (status.state === "unknown" || status.cardId !== cardId) return { ok: false, error: "not_found" };
  if (status.state !== "valid") return { ok: false, error: "not_valid" };
  const who = hashSecret(`tapcard-claimant:${claimant}`);
  const row = ((await sql`SELECT id, offer_id, claimant_hash FROM tapcard_offer_claims WHERE code = ${code}`) as { id: number; offer_id: number; claimant_hash: string }[])[0];
  if (!row) return { ok: false, error: "not_found" };
  if (row.claimant_hash === who) {
    await sql`UPDATE tapcard_offer_claims SET via = 'app' WHERE id = ${row.id}`;
    return { ok: true, code };
  }
  // The app may already have started its own empty card on this offer: that one is replaced by the claim being adopted.
  const own = ((await sql`SELECT id, stamps, rewards_given, redeemed_at FROM tapcard_offer_claims WHERE offer_id = ${row.offer_id} AND claimant_hash = ${who}`) as { id: number; stamps: number; rewards_given: number; redeemed_at: string | null }[])[0];
  if (own) {
    if (own.stamps > 0 || own.rewards_given > 0 || own.redeemed_at) return { ok: false, error: "has_own_card" };
    await sql`DELETE FROM tapcard_offer_claims WHERE id = ${own.id}`;
  }
  await sql`UPDATE tapcard_offer_claims SET claimant_hash = ${who}, via = 'app' WHERE id = ${row.id}`;
  return { ok: true, code };
}

/// Staff give the reward on a full card; the card starts again from no stamps.
export async function rewardCode(code: string, pin: unknown): Promise<StampResult> {
  const c = await checkStaffPin(code, pin);
  if (!c.ok) return c;
  const done = (await sql`
    UPDATE tapcard_offer_claims c SET stamps = 0, rewards_given = c.rewards_given + 1, last_stamp_at = now()
    FROM tapcard_offers o
    WHERE c.code = ${code} AND o.id = c.offer_id AND c.stamps >= o.stamps_required
    RETURNING c.id
  `) as { id: number }[];
  if (!done.length) return { ok: false, error: "not_full", status: c.status };
  return { ok: true, status: await codeStatus(code) };
}

// ---- Announcements ("New autumn menu", "Christmas bookings open"): one short line per card, newest wins.
export const MAX_ANNOUNCEMENT_TEXT = 140;
// A restaurant can post a new one at most this often (stops a card turning into a spam source).
const MIN_ANNOUNCEMENT_GAP_MS = 6 * 60 * 60 * 1000;

export async function publicAnnouncement(cardId: string) {
  await ensureOfferSchema();
  const row = ((await sql`
    SELECT id, text, link, created_at, withdrawn FROM tapcard_announcements WHERE card_id = ${cardId} ORDER BY id DESC LIMIT 1
  `) as { id: number; text: string; link: string | null; created_at: string; withdrawn: boolean }[])[0];
  if (!row || row.withdrawn) return null;
  return { id: Number(row.id), text: row.text, link: row.link || null, postedAt: new Date(row.created_at).toISOString() };
}

// An optional "read more" page for a news item: https only, no credentials, sensible length.
export function cleanNewsLink(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const u = new URL(/^[a-z]+:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`);
    if (u.protocol !== "https:" || u.username || u.password || !u.hostname.includes(".")) return null;
    const out = u.toString();
    return out.length <= 500 ? out : null;
  } catch { return null; }
}

export async function setAnnouncement(cardId: string, textRaw: unknown, linkRaw?: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  await ensureOfferSchema();
  const text = typeof textRaw === "string" ? textRaw.trim().slice(0, MAX_ANNOUNCEMENT_TEXT) : "";
  if (!text) return { ok: false, error: "announcement text is required" };
  const last = ((await sql`SELECT created_at FROM tapcard_announcements WHERE card_id = ${cardId} ORDER BY id DESC LIMIT 1`) as { created_at: string }[])[0];
  if (last && Date.now() - new Date(last.created_at).getTime() < MIN_ANNOUNCEMENT_GAP_MS) {
    return { ok: false, error: "You can post one announcement every 6 hours" };
  }
  const link = cleanNewsLink(linkRaw);
  if (typeof linkRaw === "string" && linkRaw.trim() && !link) return { ok: false, error: "The story link must be a secure https:// web address" };
  const moderated = await moderate(cardId, [{ kind: "news", text }, ...(link ? [{ kind: "link" as const, text: link }] : [])]);
  if (!moderated.ok) return { ok: false, error: moderated.error };
  await sql`INSERT INTO tapcard_announcements (card_id, text, link) VALUES (${cardId}, ${text}, ${link})`;
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
  /// Installs that came from this card's QR code or link.
  installs: number;
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
      (SELECT (COUNT(cl.redeemed_at) + COALESCE(SUM(cl.rewards_given), 0))::int FROM tapcard_offer_claims cl WHERE cl.offer_id = o.id) AS offer_redeemed,
      (SELECT COUNT(*)::int FROM tapcard_offer_claims cl JOIN tapcard_offers oo ON oo.id = cl.offer_id WHERE oo.card_id = c.id) AS claimed_total,
      (SELECT (COUNT(cl.redeemed_at) + COALESCE(SUM(cl.rewards_given), 0))::int FROM tapcard_offer_claims cl JOIN tapcard_offers oo ON oo.id = cl.offer_id WHERE oo.card_id = c.id) AS redeemed_total,
      (SELECT COUNT(*)::int FROM tapcard_followers f WHERE f.card_id = c.id) AS followers,
      (SELECT COUNT(*)::int FROM tapcard_card_installs i WHERE i.card_id = c.id) AS installs,
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
    views: Number(r.view_count ?? 0), qrViews: Number(r.qr_view_count ?? 0), saves: Number(r.save_count ?? 0), followers: Number(r.followers ?? 0), installs: Number(r.installs ?? 0),
    offerText: r.offer_text && !(r.offer_expires && new Date(String(r.offer_expires)).getTime() < Date.now()) ? String(r.offer_text) : null,
    offerExpires: live(r.offer_expires ? new Date(String(r.offer_expires)).toISOString() : null),
    offerClaimed: Number(r.offer_claimed ?? 0), offerRedeemed: Number(r.offer_redeemed ?? 0),
    claimedTotal: Number(r.claimed_total ?? 0), redeemedTotal: Number(r.redeemed_total ?? 0),
    news: r.news ? String(r.news) : null, newsAt: r.news_at ? new Date(String(r.news_at)).toISOString() : null,
  }));
}

// ---- One live offer per card: whoever posted it can change or withdraw it that day (UK time); anyone else allowed to
// post for the card has to wait until the next day, or until it ends or is withdrawn. The company admin (web) can always.
const londonDay = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Europe/London" });

export async function offerLock(cardId: string, posterId: string): Promise<{ locked: false } | { locked: true; postedBy: string }> {
  const live = await currentOffer(cardId);
  if (!live || !live.posted_by || live.posted_by === posterId) return { locked: false };
  if (londonDay(new Date(live.created_at)) !== londonDay(new Date())) return { locked: false };
  return { locked: true, postedBy: live.posted_by };
}
