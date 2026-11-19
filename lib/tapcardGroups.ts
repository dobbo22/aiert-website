// Groups on a card (#Kefi, #IPO Clients): a company or adviser names the audiences of one card, each with its own QR code or link.
// A follower who comes through a group's link joins it (and the app tags the saved card with #label). A news post or offer can then
// be sent to chosen groups only. A group is a label against the same hashed follower id the follow already uses: no name, no email.
import sql from "@/lib/db";

export const MAX_GROUPS_PER_CARD = 20;

let ready: Promise<unknown> | null = null;
export function ensureGroupSchema(): Promise<unknown> {
  if (!ready) {
    ready = sql`
      CREATE TABLE IF NOT EXISTS tapcard_card_groups (
        card_id TEXT NOT NULL,
        slug TEXT NOT NULL,
        label TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (card_id, slug)
      )
    `
      .then(() => sql`
        CREATE TABLE IF NOT EXISTS tapcard_follower_groups (
          card_id TEXT NOT NULL,
          follower_hash TEXT NOT NULL,
          slug TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          PRIMARY KEY (card_id, follower_hash, slug)
        )
      `)
      .catch((e) => {
        ready = null;
        throw e;
      });
  }
  return ready;
}

/// "#IPO Clients" / "IPO  clients" -> label "IPO Clients", slug "ipo-clients". Null when nothing usable is left.
export function cleanGroupLabel(input: unknown): { label: string; slug: string } | null {
  if (typeof input !== "string") return null;
  const label = input.replace(/^#+/, "").replace(/\s+/g, " ").trim().slice(0, 40);
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return label && slug ? { label, slug } : null;
}

export interface CardGroup { slug: string; label: string }

export async function listGroups(cardId: string): Promise<CardGroup[]> {
  await ensureGroupSchema();
  return (await sql`SELECT slug, label FROM tapcard_card_groups WHERE card_id = ${cardId} ORDER BY created_at, slug`) as CardGroup[];
}

/// Same list with how many followers are in each, and how many of those a news notification can reach now (News on and a push token). Admin only.
export async function listGroupsWithCounts(cardId: string): Promise<(CardGroup & { members: number; reachable: number })[]> {
  await ensureGroupSchema();
  await (await import("@/lib/tapcardPush")).ensureSchema();
  const rows = (await sql`
    SELECT g.slug, g.label,
      (SELECT COUNT(*)::int FROM tapcard_follower_groups f
        JOIN tapcard_followers t ON t.card_id = f.card_id AND t.follower_hash = f.follower_hash
        WHERE f.card_id = g.card_id AND f.slug = g.slug) AS members,
      (SELECT COUNT(*)::int FROM tapcard_follower_groups f
        JOIN tapcard_followers t ON t.card_id = f.card_id AND t.follower_hash = f.follower_hash
        JOIN tapcard_push_prefs p ON p.card_id = f.card_id AND p.follower_hash = f.follower_hash AND p.news
        JOIN tapcard_push_devices d ON d.follower_hash = f.follower_hash
        WHERE f.card_id = g.card_id AND f.slug = g.slug) AS reachable
    FROM tapcard_card_groups g WHERE g.card_id = ${cardId} ORDER BY g.created_at, g.slug
  `) as (CardGroup & { members: number; reachable: number })[];
  return rows.map((r) => ({ ...r, members: Number(r.members), reachable: Number(r.reachable) }));
}

export async function addGroup(cardId: string, input: unknown): Promise<{ ok: true; group: CardGroup } | { ok: false; error: string }> {
  const g = cleanGroupLabel(input);
  if (!g) return { ok: false, error: "A group needs a name, for example #Kefi." };
  await ensureGroupSchema();
  const existing = await listGroups(cardId);
  const same = existing.find((e) => e.slug === g.slug);
  if (same) return { ok: true, group: same };
  if (existing.length >= MAX_GROUPS_PER_CARD) return { ok: false, error: `A card can have up to ${MAX_GROUPS_PER_CARD} groups.` };
  await sql`INSERT INTO tapcard_card_groups (card_id, slug, label) VALUES (${cardId}, ${g.slug}, ${g.label}) ON CONFLICT DO NOTHING`;
  return { ok: true, group: g };
}

/// Removing a group removes the label from its followers; they keep following the card.
export async function removeGroup(cardId: string, slug: string): Promise<void> {
  await ensureGroupSchema();
  await sql`DELETE FROM tapcard_follower_groups WHERE card_id = ${cardId} AND slug = ${slug}`;
  await sql`DELETE FROM tapcard_card_groups WHERE card_id = ${cardId} AND slug = ${slug}`;
}

/// A follower joins a group the card really has (an unknown slug is ignored, so a made-up link adds nothing). Returns the group, or null.
export async function joinGroup(cardId: string, followerHash: string, slug: unknown): Promise<CardGroup | null> {
  if (typeof slug !== "string" || !slug) return null;
  await ensureGroupSchema();
  const g = ((await sql`SELECT slug, label FROM tapcard_card_groups WHERE card_id = ${cardId} AND slug = ${slug}`) as CardGroup[])[0];
  if (!g) return null;
  await sql`INSERT INTO tapcard_follower_groups (card_id, follower_hash, slug) VALUES (${cardId}, ${followerHash}, ${g.slug}) ON CONFLICT DO NOTHING`;
  return g;
}

/// Unfollowing a card clears every group label for that follower on it.
export async function leaveAllGroups(cardId: string, followerHash: string): Promise<void> {
  await ensureGroupSchema();
  await sql`DELETE FROM tapcard_follower_groups WHERE card_id = ${cardId} AND follower_hash = ${followerHash}`;
}

/// Keeps only slugs the card really has (an audience of nothing valid must not turn into "everyone").
export async function validAudience(cardId: string, slugs: unknown): Promise<{ ok: true; groups: string[] } | { ok: false; error: string }> {
  if (slugs === undefined || slugs === null) return { ok: true, groups: [] };
  if (!Array.isArray(slugs)) return { ok: false, error: "groups must be a list" };
  if (!slugs.length) return { ok: true, groups: [] };
  const have = new Set((await listGroups(cardId)).map((g) => g.slug));
  const want = [...new Set(slugs.filter((s): s is string => typeof s === "string"))];
  if (!want.length || want.some((s) => !have.has(s))) return { ok: false, error: "One of the chosen groups does not exist on this card." };
  return { ok: true, groups: want };
}
