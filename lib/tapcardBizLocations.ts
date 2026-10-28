import sql from "@/lib/db";
import { ensureSchema, newId } from "@/lib/tapcardBiz";
import type { CardLink } from "@/lib/tapcardLinks";

// Locations a company admin prepares on the web: the same card building the apps do (address, phone, opening hours, booking and
// menu links, review link, all found from Google and the business's website), ready for a manager to claim from an invite link. The
// card is made when the manager taps their invite; until then the prepared location is only public business facts held here.

export interface BizLocation {
  id: string; org_id: string; name: string; address: string; phone: string; email: string; website: string;
  links: string; claimed_card_id: string | null; created_at: string;
}

let ready: Promise<unknown> | null = null;
function ensureLocationSchema(): Promise<unknown> {
  if (!ready) {
    ready = ensureSchema()
      .then(() => sql`CREATE TABLE IF NOT EXISTS tapcard_biz_locations (
        id TEXT PRIMARY KEY, org_id TEXT NOT NULL, name TEXT NOT NULL DEFAULT '', address TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '', website TEXT NOT NULL DEFAULT '',
        links TEXT NOT NULL DEFAULT '[]', claimed_card_id TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`)
      .then(() => sql`CREATE INDEX IF NOT EXISTS tapcard_biz_locations_org ON tapcard_biz_locations (org_id)`)
      .catch((e) => { ready = null; throw e; });
  }
  return ready;
}

export async function listLocations(orgId: string): Promise<BizLocation[]> {
  await ensureLocationSchema();
  return (await sql`SELECT * FROM tapcard_biz_locations WHERE org_id = ${orgId} ORDER BY created_at`) as BizLocation[];
}

export async function getLocation(id: string): Promise<BizLocation | null> {
  await ensureLocationSchema();
  const rows = (await sql`SELECT * FROM tapcard_biz_locations WHERE id = ${id}`) as BizLocation[];
  return rows[0] ?? null;
}

export async function createLocation(orgId: string, d: { name: string; address: string; phone: string; email: string; website: string; links: CardLink[] }): Promise<BizLocation> {
  await ensureLocationSchema();
  const rows = (await sql`
    INSERT INTO tapcard_biz_locations (id, org_id, name, address, phone, email, website, links)
    VALUES (${newId()}, ${orgId}, ${d.name.slice(0, 200)}, ${d.address.slice(0, 300)}, ${d.phone.slice(0, 40)}, ${d.email.slice(0, 200)}, ${d.website.slice(0, 300)}, ${JSON.stringify(d.links.slice(0, 10))})
    RETURNING *`) as BizLocation[];
  return rows[0];
}

export async function updateLocation(orgId: string, id: string, d: { name: string; address: string; phone: string; email: string }): Promise<boolean> {
  await ensureLocationSchema();
  const rows = await sql`
    UPDATE tapcard_biz_locations SET name = ${d.name.slice(0, 200)}, address = ${d.address.slice(0, 300)}, phone = ${d.phone.slice(0, 40)}, email = ${d.email.slice(0, 200)}
    WHERE id = ${id} AND org_id = ${orgId} AND claimed_card_id IS NULL RETURNING id`;
  return rows.length > 0;
}

/// Keeps the prepared location in step with a made card the admin changed (the location row stays as the company's record of it).
export async function updateLocationDetails(orgId: string, id: string, d: { name: string; address: string; phone: string; email: string }): Promise<void> {
  await ensureLocationSchema();
  await sql`UPDATE tapcard_biz_locations SET name = ${d.name.slice(0, 200)}, address = ${d.address.slice(0, 300)}, phone = ${d.phone.slice(0, 40)}, email = ${d.email.slice(0, 200)} WHERE id = ${id} AND org_id = ${orgId}`;
}

export async function deleteLocation(orgId: string, id: string, allowClaimed = false): Promise<boolean> {
  await ensureLocationSchema();
  const rows = allowClaimed
    ? await sql`DELETE FROM tapcard_biz_locations WHERE id = ${id} AND org_id = ${orgId} RETURNING id`
    : await sql`DELETE FROM tapcard_biz_locations WHERE id = ${id} AND org_id = ${orgId} AND claimed_card_id IS NULL RETURNING id`;
  return rows.length > 0;
}

/// True for the one caller that claims it (a location becomes one card).
export async function markLocationClaimed(id: string, cardId: string): Promise<boolean> {
  await ensureLocationSchema();
  const rows = await sql`UPDATE tapcard_biz_locations SET claimed_card_id = ${cardId} WHERE id = ${id} AND claimed_card_id IS NULL RETURNING id`;
  return rows.length > 0;
}
