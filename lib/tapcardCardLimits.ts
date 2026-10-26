import sql from "@/lib/db";
import { deleteCard } from "@/lib/tapcardDb";

// Keeps the cards table tidy without ever getting in a real person's way.
//
// - One app install may have up to MAX_CARDS_PER_INSTALL live cards (personal, work, a side business...). Past that, an unused card of
//   that install is cleared to make room, and only if none is unused is the new card refused. The limit is by install, not by name or
//   email: an email on a card is only typed text, so a limit on it could be dodged by changing a letter, or used to lock someone else out.
// - A card is "unused" when nobody has opened or saved it, it has no recipients, offers, subscription or followers, it is not verified
//   and it is a personal-plan card (company cards are never touched here).

export const MAX_CARDS_PER_INSTALL = 5;
/// An unused card must be at least this old before it can be cleared to make room (a card just made may not have been shared yet).
const MIN_AGE_DAYS_TO_MAKE_ROOM = 7;

/// Called when a new card is about to be created for this install. Returns false when the install is at its limit and nothing can be cleared.
export async function makeRoomForInstall(groupingId: string): Promise<boolean> {
  const gid = groupingId.trim();
  if (!gid) return true; // older app builds send no install id: no limit to apply
  const count = async () => ((await sql`SELECT count(*)::int AS n FROM tapcard_cards WHERE grouping_id = ${gid} AND org_id IS NULL`) as { n: number }[])[0]?.n ?? 0;
  let n = await count();
  if (n < MAX_CARDS_PER_INSTALL) return true;
  const unused = (await sql`
    SELECT c.id FROM tapcard_cards c
    WHERE c.grouping_id = ${gid} AND c.created_at < now() - ${`${MIN_AGE_DAYS_TO_MAKE_ROOM} days`}::interval
      AND c.org_id IS NULL AND c.verified_at IS NULL
      AND c.view_count = 0 AND c.save_count = 0 AND c.qr_view_count = 0
      AND NOT EXISTS (SELECT 1 FROM tapcard_card_recipients r WHERE r.card_id = c.id)
      AND NOT EXISTS (SELECT 1 FROM tapcard_offers o WHERE o.card_id = c.id)
      AND NOT EXISTS (SELECT 1 FROM tapcard_promote p WHERE p.card_id = c.id)
      AND NOT EXISTS (SELECT 1 FROM tapcard_followers f WHERE f.card_id = c.id)
    ORDER BY c.created_at ASC LIMIT 10
  `) as { id: string }[];
  for (const row of unused) {
    if (n < MAX_CARDS_PER_INSTALL) break;
    await deleteCard(row.id);
    n--;
  }
  return n < MAX_CARDS_PER_INSTALL;
}

export interface StaleCard { id: string; name: string; company: string; created_at: string }

/// Personal-plan cards nobody has ever opened, saved or used, untouched for `days` days.
export async function staleCards(days: number, limit = 200): Promise<StaleCard[]> {
  return (await sql`
    SELECT c.id, c.name, c.company, c.created_at FROM tapcard_cards c
    WHERE GREATEST(c.created_at, c.updated_at) < now() - ${`${Math.max(30, Math.floor(days))} days`}::interval
      AND c.org_id IS NULL AND c.verified_at IS NULL
      AND c.view_count = 0 AND c.save_count = 0 AND c.qr_view_count = 0
      AND NOT EXISTS (SELECT 1 FROM tapcard_card_recipients r WHERE r.card_id = c.id)
      AND NOT EXISTS (SELECT 1 FROM tapcard_offers o WHERE o.card_id = c.id)
      AND NOT EXISTS (SELECT 1 FROM tapcard_promote p WHERE p.card_id = c.id)
      AND NOT EXISTS (SELECT 1 FROM tapcard_followers f WHERE f.card_id = c.id)
    ORDER BY c.created_at ASC LIMIT ${limit}
  `) as StaleCard[];
}
