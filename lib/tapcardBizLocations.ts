import sql from "@/lib/db";
import { ensureSchema, newId } from "@/lib/tapcardBiz";
import type { CardLink } from "@/lib/tapcardLinks";

// Locations a company admin prepares on the web: the same card building the apps do (address, phone, opening hours, booking and
// menu links, review link, all found from Google and the business's website), ready for a manager to claim from an invite link. The
// card is made when the manager taps their invite; until then the prepared location is only public business facts held here.

export interface BizLocation {
  id: string; org_id: string; name: string; address: string; phone: string; email: string; website: string;
  links: string; claimed_card_id: string | null; created_at: string; sign: string;
}

let ready: Promise<unknown> | null = null;
function ensureLocationSchema(): Promise<unknown> {
  if (!ready) {
    ready = ensureSchema()
      .then(() => sql`CREATE TABLE IF NOT EXISTS tapcard_biz_locations (
        id TEXT PRIMARY KEY, org_id TEXT NOT NULL, name TEXT NOT NULL DEFAULT '', address TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '', website TEXT NOT NULL DEFAULT '',
        links TEXT NOT NULL DEFAULT '[]', claimed_card_id TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`)
      .then(() => sql`ALTER TABLE tapcard_biz_locations ADD COLUMN IF NOT EXISTS sign TEXT NOT NULL DEFAULT '{}'`)
      .then(() => sql`CREATE INDEX IF NOT EXISTS tapcard_biz_locations_org ON tapcard_biz_locations (org_id)`)
      .catch((e) => { ready = null; throw e; });
  }
  return ready;
}

/// A shop whose card no longer exists (removed, or deleted by its owner) is waiting for its manager again, so it never shows "Card made"
/// for a card that is gone.
async function releaseGoneCards(): Promise<void> {
  await sql`UPDATE tapcard_biz_locations l SET claimed_card_id = NULL
            WHERE l.claimed_card_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tapcard_cards c WHERE c.id = l.claimed_card_id)`;
}

export async function listLocations(orgId: string): Promise<BizLocation[]> {
  await ensureLocationSchema();
  await releaseGoneCards();
  return (await sql`SELECT * FROM tapcard_biz_locations WHERE org_id = ${orgId} ORDER BY created_at`) as BizLocation[];
}

export async function getLocation(id: string): Promise<BizLocation | null> {
  await ensureLocationSchema();
  await releaseGoneCards();
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

/// The QR sign's wording and options for one shop (what the admin set on the QR sign page).
export interface SignSettings { headline: string; line: string; footer: string; showLogo: boolean; showSocials: boolean; showApp: boolean }
export const DEFAULT_SIGN: SignSettings = { headline: "Scan to follow and receive news and offers", line: "", footer: "Free TapCard app for iPhone and Android", showLogo: true, showSocials: false, showApp: true };

export function parseSign(raw: string | null | undefined): SignSettings {
  try {
    const j = JSON.parse(raw || "{}") as Partial<SignSettings>;
    return {
      headline: typeof j.headline === "string" && j.headline.trim() ? j.headline.slice(0, 120) : DEFAULT_SIGN.headline,
      line: typeof j.line === "string" ? j.line.slice(0, 120) : "",
      footer: typeof j.footer === "string" ? j.footer.slice(0, 120) : DEFAULT_SIGN.footer,
      showLogo: j.showLogo !== false, showSocials: j.showSocials === true, showApp: j.showApp !== false,
    };
  } catch { return { ...DEFAULT_SIGN }; }
}

export async function saveSign(orgId: string, id: string, sign: SignSettings): Promise<boolean> {
  await ensureLocationSchema();
  const rows = await sql`UPDATE tapcard_biz_locations SET sign = ${JSON.stringify(parseSign(JSON.stringify(sign)))} WHERE id = ${id} AND org_id = ${orgId} RETURNING id`;
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

/// A shop card may post from its phone while one of the shop's managers is allowed to post (or the shop has no manager rows at all, e.g. an
/// admin made it). Called after a card is made or handed over, and when an admin changes a manager's setting or shops.
export async function syncShopPosting(orgId: string, locationIds: string[]): Promise<void> {
  await ensureLocationSchema();
  if (!locationIds.length) return;
  await sql`
    UPDATE tapcard_cards c SET org_can_post = (
      NOT EXISTS (SELECT 1 FROM tapcard_biz_admins a WHERE a.org_id = ${orgId} AND a.role = 'manager' AND l.id = ANY(a.location_ids))
      OR EXISTS (SELECT 1 FROM tapcard_biz_admins a WHERE a.org_id = ${orgId} AND a.role = 'manager' AND l.id = ANY(a.location_ids) AND a.can_post)
    )
    FROM tapcard_biz_locations l
    WHERE l.org_id = ${orgId} AND l.id = ANY(${locationIds}) AND l.claimed_card_id = c.id`;
}

/// The shop's card was removed: the shop is unclaimed again (its prepared details stay), ready for a new manager invite.
export async function releaseShopCard(orgId: string, cardId: string): Promise<boolean> {
  await ensureLocationSchema();
  const rows = await sql`UPDATE tapcard_biz_locations SET claimed_card_id = NULL WHERE org_id = ${orgId} AND claimed_card_id = ${cardId} RETURNING id`;
  return rows.length > 0;
}

/// True for the one caller that claims it (a location becomes one card).
export async function markLocationClaimed(id: string, cardId: string): Promise<boolean> {
  await ensureLocationSchema();
  const rows = await sql`UPDATE tapcard_biz_locations SET claimed_card_id = ${cardId} WHERE id = ${id} AND claimed_card_id IS NULL RETURNING id`;
  return rows.length > 0;
}

/// An invite link for each of these shops that has no card yet, for the manager's email: opening it in the app builds the shop's card.
export async function shopCardLinks(org: { id: string; name: string }, shopIds: string[], managerEmail: string): Promise<{ shop: string; link: string }[]> {
  const { signInvite, inviteLink } = await import("@/lib/tapcardBizInvite");
  const out: { shop: string; link: string }[] = [];
  for (const id of shopIds) {
    const l = await getLocation(id);
    if (!l || l.org_id !== org.id || l.claimed_card_id) continue;
    const parts = l.address.split(",").map((p) => p.replace(/[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}/i, "").trim()).filter(Boolean);
    out.push({ shop: (parts.length >= 2 ? parts[1] : parts[0]) || l.name, link: inviteLink(signInvite(org, { name: "", email: managerEmail, title: "" }, Date.now(), l.id)) });
  }
  return out;
}
