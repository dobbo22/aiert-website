import sql from "@/lib/db";
import crypto from "crypto";

export interface TapCardRecord {
  id: string;
  label: string;
  grouping_id: string;
  name: string;
  title: string;
  company: string;
  phone: string;
  email: string;
  website: string;
  /// A postal address — same as the other contact fields: shown on the
  /// card, editable by the app. Auto-filled once, in the background, from
  /// the website's own schema.org markup if the card doesn't already have
  /// one when the website is set (lib/siteBrandColor.ts); never overwrites
  /// an address the person typed themselves.
  address: string;
  linkedin_url: string;
  twitter_url: string;
  instagram_url: string;
  facebook_url: string;
  facebook_is_page: boolean;
  tiktok_url: string;
  whatsapp_url: string;
  photo_url: string | null;
  /// SHA-256 of the app's secret edit token — see lib/tapcardAuth.ts. Null
  /// only for cards shared before tokens existed, until the app claims them.
  edit_token_hash: string | null;
  view_count: number;
  save_count: number;
  /// Wallet pass design: "artwork" (default), "photo" or "brand" — lib/tapcardPassArt.ts.
  pass_style: string;
  /// The "brand" style's gradient/accent colour, e.g. "#1a73e8" — extracted
  /// from the card's own website (lib/siteBrandColor.ts) rather than set by
  /// the apps. Empty until a background job resolves it; "brand" style
  /// falls back to the default TapCard gradient until then.
  brand_color: string;
  updated_at: Date | string;
}

/// pass_style is optional: app builds that predate it don't send one, and
/// an update without it keeps the card's current style. brand_color is
/// never accepted from the client at all — see lib/siteBrandColor.ts.
type TapCardInput = Omit<TapCardRecord, "id" | "photo_url" | "edit_token_hash" | "view_count" | "save_count" | "pass_style" | "brand_color" | "updated_at"> & {
  photo_url?: string | null;
  pass_style?: string;
};

// Self-healing schema: Vercel's DATABASE_URL is a hidden "Secret" env var,
// so it can't be read out to run scripts/migrate-tapcard.mjs against
// production from outside the running app — the app creates its own table
// on first use instead. Cheap (IF NOT EXISTS) and cached per warm instance.
// The ADD COLUMN IF NOT EXISTS covers evolving the schema later without a
// separate migration step, same reasoning — label/grouping_id were added
// after the table already existed in production.
let schemaReady: Promise<unknown> | null = null;
function ensureSchema(): Promise<unknown> {
  if (!schemaReady) {
    schemaReady = sql`
      CREATE TABLE IF NOT EXISTS tapcard_cards (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL DEFAULT '',
        title TEXT NOT NULL DEFAULT '',
        company TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL DEFAULT '',
        website TEXT NOT NULL DEFAULT '',
        linkedin_url TEXT NOT NULL DEFAULT '',
        photo_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `
      .then(() => sql`ALTER TABLE tapcard_cards ADD COLUMN IF NOT EXISTS label TEXT NOT NULL DEFAULT ''`)
      .then(() => sql`ALTER TABLE tapcard_cards ADD COLUMN IF NOT EXISTS grouping_id TEXT NOT NULL DEFAULT ''`)
      .then(() => sql`ALTER TABLE tapcard_cards ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0`)
      .then(() => sql`ALTER TABLE tapcard_cards ADD COLUMN IF NOT EXISTS save_count INTEGER NOT NULL DEFAULT 0`)
      .then(() => sql`ALTER TABLE tapcard_cards ADD COLUMN IF NOT EXISTS twitter_url TEXT NOT NULL DEFAULT ''`)
      .then(() => sql`ALTER TABLE tapcard_cards ADD COLUMN IF NOT EXISTS instagram_url TEXT NOT NULL DEFAULT ''`)
      .then(() => sql`ALTER TABLE tapcard_cards ADD COLUMN IF NOT EXISTS facebook_url TEXT NOT NULL DEFAULT ''`)
      .then(() => sql`ALTER TABLE tapcard_cards ADD COLUMN IF NOT EXISTS tiktok_url TEXT NOT NULL DEFAULT ''`)
      .then(() => sql`ALTER TABLE tapcard_cards ADD COLUMN IF NOT EXISTS whatsapp_url TEXT NOT NULL DEFAULT ''`)
      .then(() => sql`ALTER TABLE tapcard_cards ADD COLUMN IF NOT EXISTS facebook_is_page BOOLEAN NOT NULL DEFAULT false`)
      .then(() => sql`ALTER TABLE tapcard_cards ADD COLUMN IF NOT EXISTS edit_token_hash TEXT`)
      .then(() => sql`ALTER TABLE tapcard_cards ADD COLUMN IF NOT EXISTS creator_ip_hash TEXT NOT NULL DEFAULT ''`)
      .then(() => sql`ALTER TABLE tapcard_cards ADD COLUMN IF NOT EXISTS pass_style TEXT NOT NULL DEFAULT 'artwork'`)
      .then(() => sql`ALTER TABLE tapcard_cards ADD COLUMN IF NOT EXISTS brand_color TEXT NOT NULL DEFAULT ''`)
      .then(() => sql`ALTER TABLE tapcard_cards ADD COLUMN IF NOT EXISTS address TEXT NOT NULL DEFAULT ''`)
      // "Send your card back": a receiver's app returning its own (already
      // public) card to the card it scanned. Only the two ids are stored —
      // the returned details are read live from tapcard_cards, so nothing is
      // copied, and a "Stop sharing" on either side makes it disappear.
      .then(() => sql`
        CREATE TABLE IF NOT EXISTS tapcard_exchanges (
          id BIGSERIAL PRIMARY KEY,
          to_card_id TEXT NOT NULL,
          from_card_id TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (to_card_id, from_card_id)
        )
      `)
      // People the owner picked from their phone's Contacts and sent their
      // card to directly (see app/api/tapcard/cards/[id]/recipients) — kept
      // so a later edit to a watched field (lib/tapcardRecipientEmail.ts)
      // can quietly notify them, the same unsubscribe-token pattern as
      // tapcard_invite_sends.
      .then(() => sql`
        CREATE TABLE IF NOT EXISTS tapcard_card_recipients (
          id BIGSERIAL PRIMARY KEY,
          card_id TEXT NOT NULL,
          name TEXT NOT NULL DEFAULT '',
          phone TEXT NOT NULL DEFAULT '',
          email TEXT NOT NULL DEFAULT '',
          unsubscribe_token TEXT NOT NULL UNIQUE,
          do_not_contact BOOLEAN NOT NULL DEFAULT false,
          last_notified_at TIMESTAMPTZ,
          last_notified_snapshot JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (card_id, phone, email)
        )
      `)
      // Separate from unsubscribe_token on purpose: one identifies "stop
      // emailing me" (destructive, single action), the other identifies
      // "fill in my details" (a page load + form) — reusing one token for
      // both would let an unsubscribe click double as an accept. Nullable
      // because rows created before this existed have none; addCardRecipient
      // always sets it for new rows.
      .then(() => sql`ALTER TABLE tapcard_card_recipients ADD COLUMN IF NOT EXISTS accept_token TEXT UNIQUE`)
      .then(() => sql`ALTER TABLE tapcard_card_recipients ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ`)
      .then(() => sql`ALTER TABLE tapcard_card_recipients ADD COLUMN IF NOT EXISTS accepted_name TEXT NOT NULL DEFAULT ''`)
      .then(() => sql`ALTER TABLE tapcard_card_recipients ADD COLUMN IF NOT EXISTS accepted_phone TEXT NOT NULL DEFAULT ''`)
      .then(() => sql`ALTER TABLE tapcard_card_recipients ADD COLUMN IF NOT EXISTS accepted_email TEXT NOT NULL DEFAULT ''`)
      .catch((err) => {
        schemaReady = null; // let the next call retry rather than caching a failure
        throw err;
      });
  }
  return schemaReady;
}

export function newCardId(): string {
  // URL-safe, unguessable — this id is the only thing standing between a
  // card and the public internet (see the plan's privacy section: no auth,
  // security is obscurity of the id). 22 base64url chars ~= 128 bits.
  return crypto.randomBytes(16).toString("base64url");
}

export async function createCard(input: TapCardInput, editTokenHash: string, creatorIpHash: string): Promise<string> {
  await ensureSchema();
  const id = newCardId();
  await sql`
    INSERT INTO tapcard_cards (id, label, grouping_id, name, title, company, phone, email, website, address, linkedin_url,
                               twitter_url, instagram_url, facebook_url, facebook_is_page, tiktok_url, whatsapp_url, photo_url,
                               edit_token_hash, creator_ip_hash, pass_style)
    VALUES (${id}, ${input.label}, ${input.grouping_id}, ${input.name}, ${input.title}, ${input.company}, ${input.phone}, ${input.email}, ${input.website}, ${input.address}, ${input.linkedin_url},
            ${input.twitter_url}, ${input.instagram_url}, ${input.facebook_url}, ${input.facebook_is_page}, ${input.tiktok_url}, ${input.whatsapp_url}, ${input.photo_url ?? null},
            ${editTokenHash}, ${creatorIpHash}, ${input.pass_style ?? "artwork"})
  `;
  return id;
}

export async function updateCard(id: string, input: TapCardInput): Promise<boolean> {
  await ensureSchema();
  const rows = await sql`
    UPDATE tapcard_cards
    SET label = ${input.label}, grouping_id = ${input.grouping_id}, name = ${input.name}, title = ${input.title}, company = ${input.company},
        phone = ${input.phone}, email = ${input.email}, website = ${input.website}, address = ${input.address},
        linkedin_url = ${input.linkedin_url},
        twitter_url = ${input.twitter_url}, instagram_url = ${input.instagram_url},
        facebook_url = ${input.facebook_url}, facebook_is_page = ${input.facebook_is_page},
        tiktok_url = ${input.tiktok_url},
        whatsapp_url = ${input.whatsapp_url},
        photo_url = COALESCE(${input.photo_url ?? null}, photo_url),
        pass_style = COALESCE(${input.pass_style ?? null}, pass_style),
        updated_at = now()
    WHERE id = ${id}
    RETURNING id
  `;
  return rows.length > 0;
}

export async function getCard(id: string): Promise<TapCardRecord | null> {
  await ensureSchema();
  const rows = (await sql`SELECT * FROM tapcard_cards WHERE id = ${id}`) as TapCardRecord[];
  return rows[0] ?? null;
}

/// Only sets the hash when there isn't one yet (a card shared before edit
/// tokens existed) — the first token-bearing request claims it. Returns
/// false if another request claimed it first.
export async function claimEditToken(id: string, editTokenHash: string): Promise<boolean> {
  await ensureSchema();
  const rows = await sql`
    UPDATE tapcard_cards SET edit_token_hash = ${editTokenHash}
    WHERE id = ${id} AND edit_token_hash IS NULL
    RETURNING id
  `;
  return rows.length > 0;
}

export async function countRecentCreates(creatorIpHash: string): Promise<number> {
  await ensureSchema();
  const rows = (await sql`
    SELECT count(*)::int AS n FROM tapcard_cards
    WHERE creator_ip_hash = ${creatorIpHash} AND created_at > now() - interval '1 hour'
  `) as { n: number }[];
  return rows[0]?.n ?? 0;
}

export async function deleteCard(id: string): Promise<boolean> {
  await ensureSchema();
  const rows = await sql`DELETE FROM tapcard_cards WHERE id = ${id} RETURNING id`;
  await sql`DELETE FROM tapcard_exchanges WHERE to_card_id = ${id} OR from_card_id = ${id}`;
  return rows.length > 0;
}

// Fire-and-forget from the public page/vcard routes (see app/tapcard/c/[id]) —
// callers wrap these in next/server's after() so the visitor's response isn't
// held up by the write, and a failed increment never breaks the page itself.
export async function incrementViewCount(id: string): Promise<void> {
  await ensureSchema();
  await sql`UPDATE tapcard_cards SET view_count = view_count + 1 WHERE id = ${id}`;
}

export async function incrementSaveCount(id: string): Promise<void> {
  await ensureSchema();
  await sql`UPDATE tapcard_cards SET save_count = save_count + 1 WHERE id = ${id}`;
}

/// The card fields anyone with the link can already see on the public page —
/// never the edit-token hash, IP hash or counts. Keys match the iOS app's
/// BusinessCard so it can decode them directly.
export function publicCardJSON(card: TapCardRecord) {
  return {
    id: card.id,
    label: card.label,
    name: card.name,
    title: card.title,
    company: card.company,
    phone: card.phone,
    email: card.email,
    website: card.website,
    address: card.address,
    linkedInURL: card.linkedin_url,
    twitterURL: card.twitter_url,
    instagramURL: card.instagram_url,
    facebookURL: card.facebook_url,
    facebookIsPage: card.facebook_is_page,
    tiktokURL: card.tiktok_url,
    whatsAppURL: card.whatsapp_url,
    photoURL: card.photo_url,
    // null rather than "" while nothing's been resolved yet, or nothing
    // suitable was found — lets the apps tell "no brand colour" apart from
    // an actual (if unlikely) colour hex string without a sentinel value.
    brandColor: card.brand_color || null,
  };
}

/// Set once a background job (lib/siteBrandColor.ts) resolves the card's
/// website to a colour — never from client input, and never blocked on by
/// the request that triggered it (see app/api/tapcard/cards/route.ts).
export async function setBrandColor(id: string, color: string | null): Promise<void> {
  await ensureSchema();
  await sql`UPDATE tapcard_cards SET brand_color = ${color ?? ""} WHERE id = ${id}`;
}

/// Same background-job pattern as setBrandColor, but guarded: only writes
/// if the card's address is still empty, so this can never overwrite one
/// the person typed themselves — including a blank they deliberately set
/// after the auto-fill ran once (this only ever runs once per website
/// change anyway, but the guard is what actually makes that safe).
export async function setAddressIfEmpty(id: string, address: string | null): Promise<void> {
  if (!address) return;
  await ensureSchema();
  await sql`UPDATE tapcard_cards SET address = ${address} WHERE id = ${id} AND address = ''`;
}

/// Re-sending the same card just refreshes the timestamp, so it's delivered
/// once rather than piling up duplicates.
export async function addExchange(toCardId: string, fromCardId: string): Promise<void> {
  await ensureSchema();
  // Normally a row lives only until the owner's app collects it (see
  // deleteExchanges). One that's never collected — the app was deleted —
  // is purged after 30 days rather than kept forever.
  await sql`DELETE FROM tapcard_exchanges WHERE created_at < now() - interval '30 days'`;
  await sql`
    INSERT INTO tapcard_exchanges (to_card_id, from_card_id) VALUES (${toCardId}, ${fromCardId})
    ON CONFLICT (to_card_id, from_card_id) DO UPDATE SET created_at = now()
  `;
}

export async function countRecentExchangesFrom(fromCardId: string): Promise<number> {
  await ensureSchema();
  const rows = (await sql`
    SELECT count(*)::int AS n FROM tapcard_exchanges
    WHERE from_card_id = ${fromCardId} AND created_at > now() - interval '1 hour'
  `) as { n: number }[];
  return rows[0]?.n ?? 0;
}

/// Cards sent back to `toCardId` that its owner's app hasn't collected yet.
export async function listExchanges(toCardId: string): Promise<{ exchangeId: number; card: TapCardRecord }[]> {
  await ensureSchema();
  const rows = (await sql`
    SELECT e.id AS exchange_id, c.* FROM tapcard_exchanges e
    JOIN tapcard_cards c ON c.id = e.from_card_id
    WHERE e.to_card_id = ${toCardId}
    ORDER BY e.created_at
    LIMIT 100
  `) as (TapCardRecord & { exchange_id: string | number })[];
  return rows.map(({ exchange_id, ...card }) => ({ exchangeId: Number(exchange_id), card }));
}

/// The app acknowledges what it has stored, so the server keeps nothing
/// once the card has been delivered.
export async function deleteExchanges(toCardId: string, exchangeIds: number[]): Promise<void> {
  if (exchangeIds.length === 0) return;
  await ensureSchema();
  await sql`DELETE FROM tapcard_exchanges WHERE to_card_id = ${toCardId} AND id = ANY(${exchangeIds})`;
}

export interface TapCardRecipient {
  id: number;
  card_id: string;
  name: string;
  phone: string;
  email: string;
  unsubscribe_token: string;
  accept_token: string | null;
  do_not_contact: boolean;
  last_notified_at: Date | string | null;
  last_notified_snapshot: Record<string, string> | null;
  accepted_at: Date | string | null;
  accepted_name: string;
  accepted_phone: string;
  accepted_email: string;
}

/// Re-sending to the same person (same card + phone/email) just refreshes
/// the name rather than creating a duplicate row — see the UNIQUE constraint
/// in ensureSchema.
export async function addCardRecipient(cardId: string, name: string, phone: string, email: string): Promise<TapCardRecipient> {
  await ensureSchema();
  const token = crypto.randomBytes(6).toString("base64url");
  const acceptToken = crypto.randomBytes(6).toString("base64url");
  const rows = (await sql`
    INSERT INTO tapcard_card_recipients (card_id, name, phone, email, unsubscribe_token, accept_token)
    VALUES (${cardId}, ${name}, ${phone}, ${email}, ${token}, ${acceptToken})
    ON CONFLICT (card_id, phone, email) DO UPDATE SET name = EXCLUDED.name
    RETURNING *
  `) as TapCardRecipient[];
  return rows[0];
}

/// The owner's view of everyone they've sent this card to directly —
/// unfiltered (unlike listNotifiableRecipients, which only returns people
/// worth emailing about a change).
export async function listRecipients(cardId: string): Promise<TapCardRecipient[]> {
  await ensureSchema();
  return (await sql`SELECT * FROM tapcard_card_recipients WHERE card_id = ${cardId} ORDER BY created_at`) as TapCardRecipient[];
}

/// A recipient sharing their own details back — see app/tapcard/AcceptRecipientForm.tsx.
/// Returns the card_id they're a recipient of, or null if the token doesn't
/// match anyone (expired/garbled link).
export async function acceptRecipient(acceptToken: string, name: string, phone: string, email: string): Promise<string | null> {
  await ensureSchema();
  const rows = (await sql`
    UPDATE tapcard_card_recipients
    SET accepted_at = now(), accepted_name = ${name}, accepted_phone = ${phone}, accepted_email = ${email}
    WHERE accept_token = ${acceptToken}
    RETURNING card_id
  `) as { card_id: string }[];
  return rows[0]?.card_id ?? null;
}

/// Recipients worth emailing about a change: haven't unsubscribed and gave
/// an email address (phone-only recipients have no notification channel in
/// v1 — see app/api/tapcard/cards/route.ts).
export async function listNotifiableRecipients(cardId: string): Promise<TapCardRecipient[]> {
  await ensureSchema();
  return (await sql`
    SELECT * FROM tapcard_card_recipients
    WHERE card_id = ${cardId} AND do_not_contact = false AND email <> ''
  `) as TapCardRecipient[];
}

export async function markRecipientNotified(id: number, snapshot: Record<string, string>): Promise<void> {
  await ensureSchema();
  await sql`
    UPDATE tapcard_card_recipients
    SET last_notified_at = now(), last_notified_snapshot = ${JSON.stringify(snapshot)}
    WHERE id = ${id}
  `;
}

export async function unsubscribeCardRecipient(token: string): Promise<void> {
  await ensureSchema();
  await sql`UPDATE tapcard_card_recipients SET do_not_contact = true WHERE unsubscribe_token = ${token}`;
}
