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
}

type TapCardInput = Omit<TapCardRecord, "id" | "photo_url" | "edit_token_hash" | "view_count" | "save_count"> & { photo_url?: string | null };

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
    INSERT INTO tapcard_cards (id, label, grouping_id, name, title, company, phone, email, website, linkedin_url,
                               twitter_url, instagram_url, facebook_url, facebook_is_page, tiktok_url, photo_url,
                               edit_token_hash, creator_ip_hash)
    VALUES (${id}, ${input.label}, ${input.grouping_id}, ${input.name}, ${input.title}, ${input.company}, ${input.phone}, ${input.email}, ${input.website}, ${input.linkedin_url},
            ${input.twitter_url}, ${input.instagram_url}, ${input.facebook_url}, ${input.facebook_is_page}, ${input.tiktok_url}, ${input.photo_url ?? null},
            ${editTokenHash}, ${creatorIpHash})
  `;
  return id;
}

export async function updateCard(id: string, input: TapCardInput): Promise<boolean> {
  await ensureSchema();
  const rows = await sql`
    UPDATE tapcard_cards
    SET label = ${input.label}, grouping_id = ${input.grouping_id}, name = ${input.name}, title = ${input.title}, company = ${input.company},
        phone = ${input.phone}, email = ${input.email}, website = ${input.website},
        linkedin_url = ${input.linkedin_url},
        twitter_url = ${input.twitter_url}, instagram_url = ${input.instagram_url},
        facebook_url = ${input.facebook_url}, facebook_is_page = ${input.facebook_is_page},
        tiktok_url = ${input.tiktok_url},
        photo_url = COALESCE(${input.photo_url ?? null}, photo_url),
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
