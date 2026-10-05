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
                               twitter_url, instagram_url, facebook_url, facebook_is_page, tiktok_url, photo_url,
                               edit_token_hash, creator_ip_hash, pass_style)
    VALUES (${id}, ${input.label}, ${input.grouping_id}, ${input.name}, ${input.title}, ${input.company}, ${input.phone}, ${input.email}, ${input.website}, ${input.address}, ${input.linkedin_url},
            ${input.twitter_url}, ${input.instagram_url}, ${input.facebook_url}, ${input.facebook_is_page}, ${input.tiktok_url}, ${input.photo_url ?? null},
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
