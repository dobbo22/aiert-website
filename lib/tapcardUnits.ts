// The company tree: units (a lounge, a venue, a region, senior management) with a parent above and a named owner card.
// A unit's owner may post offers and news, and manage audiences, for every location card in that unit and in every unit below it.
// Moving a person to a different role is then one change by the admin (set a new owner); cards, followers and QR codes stay where they are.
// Only a web admin can change the tree. The owner is a card in the same company (a phone holding its own edit token).
import { randomBytes } from "node:crypto";
import sql from "@/lib/db";

export const MAX_UNITS_PER_ORG = 200;
export const MAX_UNIT_DEPTH = 8;

export interface Unit { id: string; name: string; parent_id: string | null; owner_card_id: string | null }

let ready: Promise<unknown> | null = null;
export function ensureUnitSchema(): Promise<unknown> {
  if (!ready) {
    ready = sql`
      CREATE TABLE IF NOT EXISTS tapcard_org_units (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        name TEXT NOT NULL,
        parent_id TEXT,
        owner_card_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `
      .then(() => sql`CREATE INDEX IF NOT EXISTS tapcard_org_units_org ON tapcard_org_units (org_id)`)
      .then(() => sql`
        CREATE TABLE IF NOT EXISTS tapcard_unit_cards (
          card_id TEXT PRIMARY KEY,
          unit_id TEXT NOT NULL,
          org_id TEXT NOT NULL
        )
      `)
      .then(() => sql`CREATE INDEX IF NOT EXISTS tapcard_unit_cards_unit ON tapcard_unit_cards (unit_id)`)
      .catch((e) => {
        ready = null;
        throw e;
      });
  }
  return ready;
}

// ---- Pure helpers (no database): the tree rules, tested on their own. ----

/// Ids from `unitId` upwards (itself first). Stops at a missing parent or a loop.
export function ancestorsOf(units: Pick<Unit, "id" | "parent_id">[], unitId: string): string[] {
  const byId = new Map(units.map((u) => [u.id, u]));
  const out: string[] = [];
  let cur = byId.get(unitId);
  while (cur && !out.includes(cur.id)) {
    out.push(cur.id);
    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
  }
  return out;
}

/// Ids of `unitId` and everything below it.
export function descendantsOf(units: Pick<Unit, "id" | "parent_id">[], unitId: string): string[] {
  const out = new Set<string>([unitId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const u of units) if (u.parent_id && out.has(u.parent_id) && !out.has(u.id)) { out.add(u.id); grew = true; }
  }
  return [...out];
}

/// Would putting `unitId` under `newParentId` make a loop, or the tree too deep? Null parent (top level) is always fine.
export function moveProblem(units: Pick<Unit, "id" | "parent_id">[], unitId: string, newParentId: string | null): string | null {
  if (newParentId === null) return null;
  if (newParentId === unitId || descendantsOf(units, unitId).includes(newParentId)) return "A group can't sit under itself or under one of its own groups.";
  const depthAbove = ancestorsOf(units, newParentId).length;
  const heightBelow = (() => {
    const byParent = new Map<string, string[]>();
    for (const u of units) if (u.parent_id) byParent.set(u.parent_id, [...(byParent.get(u.parent_id) ?? []), u.id]);
    const h = (id: string, seen: Set<string>): number => (seen.has(id) ? 0 : 1 + Math.max(0, ...(byParent.get(id) ?? []).map((c) => h(c, new Set([...seen, id])))));
    return h(unitId, new Set());
  })();
  return depthAbove + heightBelow > MAX_UNIT_DEPTH ? `The structure can be at most ${MAX_UNIT_DEPTH} levels deep.` : null;
}

export function cleanUnitName(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const n = input.replace(/\s+/g, " ").trim().slice(0, 60);
  return n || null;
}

/// True when the owner of any unit in `ownedUnitIds` sits at or above `targetUnitId`.
export function ownsAtOrAbove(units: Pick<Unit, "id" | "parent_id">[], ownedUnitIds: string[], targetUnitId: string): boolean {
  if (!ownedUnitIds.length) return false;
  const owned = new Set(ownedUnitIds);
  return ancestorsOf(units, targetUnitId).some((id) => owned.has(id));
}

// ---- Database ----

export async function listUnits(orgId: string): Promise<Unit[]> {
  await ensureUnitSchema();
  return (await sql`SELECT id, name, parent_id, owner_card_id FROM tapcard_org_units WHERE org_id = ${orgId} ORDER BY created_at, id`) as Unit[];
}

/// card id -> unit id, for the company.
export async function unitOfCards(orgId: string): Promise<Record<string, string>> {
  await ensureUnitSchema();
  const rows = (await sql`SELECT card_id, unit_id FROM tapcard_unit_cards WHERE org_id = ${orgId}`) as { card_id: string; unit_id: string }[];
  return Object.fromEntries(rows.map((r) => [r.card_id, r.unit_id]));
}

type Result = { ok: true } | { ok: false; error: string };

export async function createUnit(orgId: string, name: unknown, parentId: string | null): Promise<Result & { id?: string }> {
  const n = cleanUnitName(name);
  if (!n) return { ok: false, error: "Give the group a name." };
  const units = await listUnits(orgId);
  if (units.length >= MAX_UNITS_PER_ORG) return { ok: false, error: `A company can have up to ${MAX_UNITS_PER_ORG} groups.` };
  if (parentId && !units.some((u) => u.id === parentId)) return { ok: false, error: "That parent group isn't in your company." };
  if (parentId && ancestorsOf(units, parentId).length >= MAX_UNIT_DEPTH) return { ok: false, error: `The structure can be at most ${MAX_UNIT_DEPTH} levels deep.` };
  const id = randomBytes(9).toString("base64url");
  await sql`INSERT INTO tapcard_org_units (id, org_id, name, parent_id) VALUES (${id}, ${orgId}, ${n}, ${parentId})`;
  return { ok: true, id };
}

export async function renameUnit(orgId: string, unitId: string, name: unknown): Promise<Result> {
  const n = cleanUnitName(name);
  if (!n) return { ok: false, error: "Give the group a name." };
  const rows = await sql`UPDATE tapcard_org_units SET name = ${n} WHERE id = ${unitId} AND org_id = ${orgId} RETURNING id`;
  return rows.length ? { ok: true } : { ok: false, error: "Group not found." };
}

export async function moveUnit(orgId: string, unitId: string, newParentId: string | null): Promise<Result> {
  const units = await listUnits(orgId);
  if (!units.some((u) => u.id === unitId)) return { ok: false, error: "Group not found." };
  if (newParentId && !units.some((u) => u.id === newParentId)) return { ok: false, error: "That parent group isn't in your company." };
  const problem = moveProblem(units, unitId, newParentId);
  if (problem) return { ok: false, error: problem };
  await sql`UPDATE tapcard_org_units SET parent_id = ${newParentId} WHERE id = ${unitId} AND org_id = ${orgId}`;
  return { ok: true };
}

/// Set (or clear) the owner. The owner must be a card of the same company. The change takes effect at once for every request after it.
export async function setUnitOwner(orgId: string, unitId: string, cardId: string | null): Promise<Result> {
  await ensureUnitSchema();
  if (cardId) {
    const c = (await sql`SELECT id FROM tapcard_cards WHERE id = ${cardId} AND org_id = ${orgId}`) as unknown[];
    if (!c.length) return { ok: false, error: "That card isn't in your company." };
  }
  const rows = await sql`UPDATE tapcard_org_units SET owner_card_id = ${cardId} WHERE id = ${unitId} AND org_id = ${orgId} RETURNING id`;
  return rows.length ? { ok: true } : { ok: false, error: "Group not found." };
}

/// A group can be removed once nothing sits under it; its cards become unassigned and its owner loses the rights it gave.
export async function deleteUnit(orgId: string, unitId: string): Promise<Result> {
  const units = await listUnits(orgId);
  if (!units.some((u) => u.id === unitId)) return { ok: false, error: "Group not found." };
  if (units.some((u) => u.parent_id === unitId)) return { ok: false, error: "Move or remove the groups under it first." };
  await sql`DELETE FROM tapcard_unit_cards WHERE unit_id = ${unitId} AND org_id = ${orgId}`;
  await sql`DELETE FROM tapcard_org_units WHERE id = ${unitId} AND org_id = ${orgId}`;
  return { ok: true };
}

/// Put a card (a location, normally) in a group, or take it out with null. A card is in at most one group.
export async function assignCard(orgId: string, cardId: string, unitId: string | null): Promise<Result> {
  await ensureUnitSchema();
  const c = (await sql`SELECT id FROM tapcard_cards WHERE id = ${cardId} AND org_id = ${orgId}`) as unknown[];
  if (!c.length) return { ok: false, error: "That card isn't in your company." };
  if (unitId === null) {
    await sql`DELETE FROM tapcard_unit_cards WHERE card_id = ${cardId} AND org_id = ${orgId}`;
    return { ok: true };
  }
  const u = (await sql`SELECT id FROM tapcard_org_units WHERE id = ${unitId} AND org_id = ${orgId}`) as unknown[];
  if (!u.length) return { ok: false, error: "Group not found." };
  await sql`
    INSERT INTO tapcard_unit_cards (card_id, unit_id, org_id) VALUES (${cardId}, ${unitId}, ${orgId})
    ON CONFLICT (card_id) DO UPDATE SET unit_id = EXCLUDED.unit_id
  `;
  return { ok: true };
}

/// Does `posterId` own a group at or above the group that holds `targetId`? Both must be cards of the same company.
export async function unitOwnerMayPostFor(posterId: string, targetId: string): Promise<boolean> {
  await ensureUnitSchema();
  const t = (await sql`SELECT unit_id, org_id FROM tapcard_unit_cards WHERE card_id = ${targetId}`) as { unit_id: string; org_id: string }[];
  if (!t[0]) return false;
  const units = (await sql`SELECT id, name, parent_id, owner_card_id FROM tapcard_org_units WHERE org_id = ${t[0].org_id}`) as Unit[];
  const owned = units.filter((u) => u.owner_card_id === posterId).map((u) => u.id);
  return ownsAtOrAbove(units, owned, t[0].unit_id);
}

/// Every card this card may post for through the groups it owns (with names), for the app's "post for" choice.
export async function unitTargetsFor(cardId: string): Promise<{ id: string; name: string }[]> {
  await ensureUnitSchema();
  const me = (await sql`SELECT org_id FROM tapcard_cards WHERE id = ${cardId}`) as { org_id: string | null }[];
  if (!me[0]?.org_id) return [];
  const units = (await sql`SELECT id, name, parent_id, owner_card_id FROM tapcard_org_units WHERE org_id = ${me[0].org_id}`) as Unit[];
  const owned = units.filter((u) => u.owner_card_id === cardId).map((u) => u.id);
  if (!owned.length) return [];
  const below = new Set(owned.flatMap((id) => descendantsOf(units, id)));
  return (await sql`
    SELECT c.id, COALESCE(NULLIF(c.company, ''), c.name) AS name
    FROM tapcard_unit_cards uc JOIN tapcard_cards c ON c.id = uc.card_id
    WHERE uc.org_id = ${me[0].org_id} AND uc.unit_id = ANY(${[...below]}) AND c.card_kind = 'business'
  `) as { id: string; name: string }[];
}

/// Followers under each group, rolled up the tree (a group counts its own cards and everything below). Counts only.
export async function rolledUpFollowers(orgId: string): Promise<Record<string, number>> {
  await ensureUnitSchema();
  await (await import("@/lib/tapcardOffers")).ensureOfferSchema();
  const units = await listUnits(orgId);
  const rows = (await sql`
    SELECT uc.unit_id, COUNT(f.follower_hash)::int AS n
    FROM tapcard_unit_cards uc LEFT JOIN tapcard_followers f ON f.card_id = uc.card_id
    WHERE uc.org_id = ${orgId} GROUP BY uc.unit_id
  `) as { unit_id: string; n: number }[];
  const own = new Map(rows.map((r) => [r.unit_id, Number(r.n)]));
  return Object.fromEntries(units.map((u) => [u.id, descendantsOf(units, u.id).reduce((s, id) => s + (own.get(id) ?? 0), 0)]));
}
