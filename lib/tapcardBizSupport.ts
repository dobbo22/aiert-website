import sql from "@/lib/db";
import { addAdmin, createOrg, domainOf, ensureSchema, type BizOrg } from "@/lib/tapcardBiz";
import { cardAllowance } from "@/lib/tapcardBizPricing";
import { isFreeMailDomain } from "@/lib/tapcardDomain";

// AIERT support access to a company's admin. Secure by design: a company is only ever opened when ITS OWN admin has allowed support
// access for a limited time (Admins tab), or when AIERT set the company up on its behalf (Companies page, 30 days). The session is
// short (2 hours), cannot touch billing, shows a banner, and every entry is logged.

export const SUPPORT_PREFIX = "support:";
export const SUPPORT_SESSION_MS = 2 * 60 * 60 * 1000;
export const SUPPORT_ACTOR = "martin@aiert.co.uk";

export function isSupportEmail(email: string): boolean {
  return email.startsWith(SUPPORT_PREFIX);
}

let ready: Promise<unknown> | null = null;
export function ensureSupportSchema(): Promise<unknown> {
  if (!ready) {
    ready = ensureSchema()
      .then(() => sql`ALTER TABLE tapcard_biz_orgs ADD COLUMN IF NOT EXISTS support_access_until TIMESTAMPTZ`)
      .then(() => sql`CREATE TABLE IF NOT EXISTS tapcard_biz_support_log (
        id BIGSERIAL PRIMARY KEY, org_id TEXT NOT NULL, actor TEXT NOT NULL, action TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '',
        at TIMESTAMPTZ NOT NULL DEFAULT now())`)
      .catch((e) => { ready = null; throw e; });
  }
  return ready;
}

export async function supportAccessUntil(orgId: string): Promise<Date | null> {
  await ensureSupportSchema();
  const rows = (await sql`SELECT support_access_until FROM tapcard_biz_orgs WHERE id = ${orgId}`) as { support_access_until: string | null }[];
  return rows[0]?.support_access_until ? new Date(rows[0].support_access_until) : null;
}

export async function supportAccessOpen(orgId: string): Promise<boolean> {
  const until = await supportAccessUntil(orgId);
  return !!until && until.getTime() > Date.now();
}

export async function setSupportAccess(orgId: string, days: number | null, actor: string): Promise<void> {
  await ensureSupportSchema();
  if (days && days > 0) {
    await sql`UPDATE tapcard_biz_orgs SET support_access_until = now() + ${`${Math.min(Math.floor(days), 90)} days`}::interval WHERE id = ${orgId}`;
  } else {
    await sql`UPDATE tapcard_biz_orgs SET support_access_until = NULL WHERE id = ${orgId}`;
  }
  await logSupport(orgId, actor, days ? `support access allowed for ${days} days` : "support access turned off");
}

export async function logSupport(orgId: string, actor: string, action: string, detail = ""): Promise<void> {
  await ensureSupportSchema();
  await sql`INSERT INTO tapcard_biz_support_log (org_id, actor, action, detail) VALUES (${orgId}, ${actor}, ${action}, ${detail.slice(0, 500)})`;
}

export interface SupportCompanyRow {
  id: string; name: string; seat_band: string; locations: number; seat_limit: number; billing_status: string; created_at: string;
  cards: number; admins: number; support_access_until: string | null;
}

export async function listCompaniesForSupport(): Promise<SupportCompanyRow[]> {
  await ensureSupportSchema();
  return (await sql`
    SELECT o.id, o.name, o.seat_band, o.locations, o.seat_limit, o.billing_status, o.created_at, o.support_access_until,
           (SELECT count(*) FROM tapcard_cards c WHERE c.org_id = o.id)::int AS cards,
           (SELECT count(*) FROM tapcard_biz_admins a WHERE a.org_id = o.id)::int AS admins
    FROM tapcard_biz_orgs o ORDER BY o.created_at DESC LIMIT 200
  `) as SupportCompanyRow[];
}

export async function recentSupportLog(limit = 30): Promise<{ org_id: string; actor: string; action: string; detail: string; at: string }[]> {
  await ensureSupportSchema();
  return (await sql`SELECT org_id, actor, action, detail, at FROM tapcard_biz_support_log ORDER BY at DESC LIMIT ${limit}`) as never;
}

/// Sets a company up on its behalf: free access for N locations (the same fields the paid plan uses, with no Stripe subscription and no
/// renewal date), its admin added, and support access open for 30 days so the setup can be checked. Returns the new company.
export async function createManagedCompany(input: { name: string; adminEmail: string; locations: number }): Promise<BizOrg> {
  await ensureSupportSchema();
  const email = input.adminEmail.trim().toLowerCase();
  const domain = domainOf(email);
  const org = await createOrg(input.name.trim().slice(0, 200), isFreeMailDomain(domain) ? "" : domain);
  const locations = Math.max(1, Math.min(100, Math.floor(input.locations)));
  await sql`
    UPDATE tapcard_biz_orgs
    SET billing_status = 'active', seat_band = 'locations', locations = ${locations}, seat_limit = ${cardAllowance(locations)},
        current_period_end = NULL, trial_used = true, welcome_sent = 'paid'
    WHERE id = ${org.id}`;
  await addAdmin(org.id, email, "admin");
  await setSupportAccess(org.id, 30, "aiert-setup");
  await logSupport(org.id, SUPPORT_ACTOR, "company set up for them", `${locations} locations, admin ${email}`);
  return org;
}
