import sql from "@/lib/db";
import { hashSecret } from "@/lib/tapcardAuth";
import type { ShareDetails } from "@/lib/tapcardShareRules";
export { validateShare } from "@/lib/tapcardShareRules";
export type { ShareDetails } from "@/lib/tapcardShareRules";

// "Follow and share" for LISTED-COMPANY (investor relations) cards only. A shareholder who follows such a card may choose, by tapping a
// button, to share a name and email (and optionally a phone number) with the company. Ordinary business cards never take this: their
// followers stay anonymous. Consent is the tap; withdrawing (or unfollowing, or deleting the card) removes the details.
//
// The card is marked listed by AIERT (a row in tapcard_listed_cards), never by client input.

let ready: Promise<unknown> | null = null;
function ensureShareSchema(): Promise<unknown> {
  if (!ready) {
    ready = sql`
      CREATE TABLE IF NOT EXISTS tapcard_listed_cards (
        card_id TEXT PRIMARY KEY,
        isin TEXT NOT NULL DEFAULT '',
        ticker TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`
      .then(() => sql`CREATE TABLE IF NOT EXISTS tapcard_listed_events (code TEXT PRIMARY KEY, org_id TEXT NOT NULL, label TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`)
      .then(
        () => sql`
        CREATE TABLE IF NOT EXISTS tapcard_follower_details (
          card_id TEXT NOT NULL,
          follower_hash TEXT NOT NULL,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          phone TEXT NOT NULL DEFAULT '',
          consented_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          PRIMARY KEY (card_id, follower_hash)
        )`,
      )
      // Which card the person actually followed through (a CEO's card, say); empty means the company card itself.
      .then(() => sql`ALTER TABLE tapcard_follower_details ADD COLUMN IF NOT EXISTS via_card_id TEXT NOT NULL DEFAULT ''`)
      .then(() => sql`ALTER TABLE tapcard_follower_details ADD COLUMN IF NOT EXISTS event_code TEXT NOT NULL DEFAULT ''`)
      .catch((e) => {
        ready = null;
        throw e;
      });
  }
  return ready;
}

const followerHash = (follower: string) => hashSecret(`tapcard-follower:${follower}`);

export async function isListedCard(cardId: string): Promise<boolean> {
  await ensureShareSchema();
  return ((await sql`SELECT 1 FROM tapcard_listed_cards WHERE card_id = ${cardId}`) as unknown[]).length > 0;
}

/// Where a follow on this card goes. A listed company's card follows itself. A person's card (CEO, IR contact) in a company that has a
/// listed card follows the company card, so there is one follower list, one set of shared details and one RNS feed. Anything else follows itself.
export async function followTargetFor(cardId: string): Promise<string> {
  await ensureShareSchema();
  if (await isListedCard(cardId)) return cardId;
  const rows = (await sql`
    SELECT l.card_id FROM tapcard_cards me
    JOIN tapcard_cards c ON c.org_id = me.org_id
    JOIN tapcard_listed_cards l ON l.card_id = c.id
    WHERE me.id = ${cardId} AND me.org_id IS NOT NULL
    ORDER BY c.created_at LIMIT 1`) as { card_id: string }[];
  return rows[0]?.card_id ?? cardId;
}

/// AIERT marks a card as a listed company's. (Run from the admin side or SQL; the apps cannot do this.)
export async function markListedCard(cardId: string, isin = "", ticker = ""): Promise<void> {
  await ensureShareSchema();
  await sql`INSERT INTO tapcard_listed_cards (card_id, isin, ticker) VALUES (${cardId}, ${isin.slice(0, 20)}, ${ticker.slice(0, 12)})
            ON CONFLICT (card_id) DO UPDATE SET isin = EXCLUDED.isin, ticker = EXCLUDED.ticker`;
}

/// Stores the details a follower chose to share. Only for a listed card; returns false (stores nothing) otherwise.
export async function saveFollowerDetails(cardId: string, follower: string, d: ShareDetails, viaCardId = "", eventCode = ""): Promise<boolean> {
  if (!(await isListedCard(cardId))) return false;
  const via = viaCardId && viaCardId !== cardId ? viaCardId : "";
  await sql`
    INSERT INTO tapcard_follower_details (card_id, follower_hash, name, email, phone, via_card_id, event_code) VALUES (${cardId}, ${followerHash(follower)}, ${d.name}, ${d.email}, ${d.phone}, ${via}, ${eventCode})
    ON CONFLICT (card_id, follower_hash) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, phone = EXCLUDED.phone, via_card_id = EXCLUDED.via_card_id, event_code = CASE WHEN EXCLUDED.event_code <> '' THEN EXCLUDED.event_code ELSE tapcard_follower_details.event_code END, consented_at = now()`;
  return true;
}

/// Consent withdrawn, or the person stopped following: their details are removed.
export async function withdrawFollowerDetails(cardId: string, follower: string): Promise<void> {
  await ensureShareSchema();
  await sql`DELETE FROM tapcard_follower_details WHERE card_id = ${cardId} AND follower_hash = ${followerHash(follower)}`;
}

/// Everything the card's own page and exports need: the people who opted in, newest first.
export interface SharedFollower {
  cardId: string;
  company: string;
  name: string;
  email: string;
  phone: string;
  consentedAt: string;
  /// Where the contact was made: the person's card they followed through ("Jane Smith, Chief Executive"), or "Company card" (QR code or link).
  followedThrough: string;
  /// The event QR code the follow came through ("AGM 2026"), or empty.
  event: string;
}

export async function listSharedFollowers(orgId: string): Promise<SharedFollower[]> {
  await ensureShareSchema();
  const rows = (await sql`
    SELECT d.card_id, c.company, c.name AS card_name, d.name, d.email, d.phone, d.consented_at, v.name AS via_name, v.title AS via_title, ev.label AS event_label
    FROM tapcard_follower_details d
    JOIN tapcard_listed_cards l ON l.card_id = d.card_id
    JOIN tapcard_cards c ON c.id = d.card_id
    LEFT JOIN tapcard_cards v ON v.id = NULLIF(d.via_card_id, '')
    LEFT JOIN tapcard_listed_events ev ON ev.code = NULLIF(d.event_code, '') AND ev.org_id = c.org_id
    WHERE c.org_id = ${orgId}
    ORDER BY d.consented_at DESC`) as { card_id: string; company: string; card_name: string; name: string; email: string; phone: string; consented_at: string; via_name: string | null; via_title: string | null; event_label: string | null }[];
  return rows.map((r) => ({ cardId: r.card_id, company: r.company || r.card_name, name: r.name, email: r.email, phone: r.phone, consentedAt: new Date(r.consented_at).toISOString(), followedThrough: r.via_name ? [r.via_name, r.via_title].filter(Boolean).join(", ") : "Company card", event: r.event_label ?? "" }));
}

/// How many of the card's followers have chosen to share (for the admin page and the follower numbers).
export async function sharedFollowerCount(cardId: string): Promise<number> {
  await ensureShareSchema();
  const r = (await sql`SELECT COUNT(*)::int AS n FROM tapcard_follower_details WHERE card_id = ${cardId}`) as { n: number }[];
  return Number(r[0]?.n ?? 0);
}

/// Called when a card is deleted: its listing mark and every shared detail go with it.
export async function deleteShareDataForCard(cardId: string): Promise<void> {
  await ensureShareSchema();
  await sql`DELETE FROM tapcard_follower_details WHERE card_id = ${cardId}`;
  await sql`DELETE FROM tapcard_listed_cards WHERE card_id = ${cardId}`;
}

/// The person's own copy (CEO / IR contact) of what a follower shared with the company: saved and removed together with the company copy.
export async function saveOwnerCopy(personCardId: string, follower: string, d: ShareDetails): Promise<boolean> {
  const { addFollowShareCopy } = await import("@/lib/tapcardDb");
  return addFollowShareCopy(personCardId, followerHash(follower), d);
}
export async function removeOwnerCopy(personCardId: string, follower: string): Promise<void> {
  const { removeFollowShareCopy } = await import("@/lib/tapcardDb");
  await removeFollowShareCopy(personCardId, followerHash(follower));
}
