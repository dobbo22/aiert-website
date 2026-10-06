import sql from "@/lib/db";
import crypto from "crypto";

// TapCard for Business: a company admin defines a card template (logo,
// website, brand colour, company social links), locks whichever fields
// employees shouldn't edit, and bulk-provisions cards from an employee
// list. This is the first account/org concept TapCard has ever had — see
// lib/tapcardAuth.ts for the anonymous per-card model every personal card
// still uses; this file is deliberately separate from lib/tapcardDb.ts
// rather than merged into it, so the personal card path stays untouched.
//
// Same self-healing schema pattern as tapcardDb.ts: CREATE TABLE IF NOT
// EXISTS + ALTER TABLE ADD COLUMN IF NOT EXISTS, since production's
// DATABASE_URL can't be read out to run a migration script externally.

export interface BizOrg {
  id: string;
  name: string;
  domain: string;
  logo_url: string | null;
  website: string;
  brand_color: string;
  linkedin_url: string;
  twitter_url: string;
  instagram_url: string;
  facebook_url: string;
  tiktok_url: string;
  whatsapp_url: string;
  /// Field-name strings matching the card JSON keys (e.g. "website",
  /// "linkedinURL") — data-driven, not a fixed set of booleans, so a newly
  /// lockable field is just one more string here, not a schema change.
  locked_fields: string[];
  allows_personal_cards: boolean;
  /// Set once, permanently, the moment this domain's first free trial is
  /// created — stays true even after upgrading to a paid band, so a later
  /// org for the same domain can't reopen the free trial.
  trial_used: boolean;
  seat_band: string;
  seat_limit: number;
  billing_status: "incomplete" | "active" | "past_due" | "canceled";
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: Date | string | null;
  /// Bumped on any template/lock-list change — lets a claimed card's app
  /// cheaply notice "the org's policy changed, refetch" without polling.
  policy_version: number;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface BizEmployee {
  id: string;
  org_id: string;
  dedupe_key: string;
  name: string;
  email: string;
  title: string;
  details_edited: boolean;
  claim_token_hash: string | null;
  claim_token_expires_at: Date | string | null;
  claimed_at: Date | string | null;
  card_id: string | null;
  created_at: Date | string;
}

import { DEFAULT_LOCKED_FIELDS, LOCKABLE_FIELDS } from "@/lib/tapcardBizFields";
export { DEFAULT_LOCKED_FIELDS, LOCKABLE_FIELDS };

let schemaReady: Promise<unknown> | null = null;
export function ensureSchema(): Promise<unknown> {
  if (!schemaReady) {
    schemaReady = sql`
      CREATE TABLE IF NOT EXISTS tapcard_biz_orgs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL DEFAULT '',
        domain TEXT NOT NULL DEFAULT '',
        logo_url TEXT,
        website TEXT NOT NULL DEFAULT '',
        brand_color TEXT NOT NULL DEFAULT '',
        linkedin_url TEXT NOT NULL DEFAULT '',
        twitter_url TEXT NOT NULL DEFAULT '',
        instagram_url TEXT NOT NULL DEFAULT '',
        facebook_url TEXT NOT NULL DEFAULT '',
        tiktok_url TEXT NOT NULL DEFAULT '',
        whatsapp_url TEXT NOT NULL DEFAULT '',
        locked_fields TEXT[] NOT NULL DEFAULT ARRAY['company','website','linkedinURL','twitterURL','instagramURL','facebookURL','tiktokURL','whatsAppURL'],
        allows_personal_cards BOOLEAN NOT NULL DEFAULT true,
        seat_band TEXT NOT NULL DEFAULT '',
        seat_limit INTEGER NOT NULL DEFAULT 0,
        billing_status TEXT NOT NULL DEFAULT 'incomplete',
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        current_period_end TIMESTAMPTZ,
        policy_version INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `
      .then(() => sql`ALTER TABLE tapcard_biz_orgs ADD COLUMN IF NOT EXISTS trial_used BOOLEAN NOT NULL DEFAULT false`)
      .then(() => sql`
        CREATE TABLE IF NOT EXISTS tapcard_biz_admins (
          id TEXT PRIMARY KEY,
          org_id TEXT NOT NULL REFERENCES tapcard_biz_orgs(id) ON DELETE CASCADE,
          email TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'admin',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE(org_id, email)
        )
      `)
      .then(() => sql`
        CREATE TABLE IF NOT EXISTS tapcard_biz_login_tokens (
          token_hash TEXT PRIMARY KEY,
          admin_email TEXT NOT NULL,
          org_id TEXT,
          expires_at TIMESTAMPTZ NOT NULL,
          consumed_at TIMESTAMPTZ
        )
      `)
      .then(() => sql`
        CREATE TABLE IF NOT EXISTS tapcard_biz_employees (
          id TEXT PRIMARY KEY,
          org_id TEXT NOT NULL REFERENCES tapcard_biz_orgs(id) ON DELETE CASCADE,
          dedupe_key TEXT NOT NULL,
          name TEXT NOT NULL DEFAULT '',
          email TEXT NOT NULL DEFAULT '',
          title TEXT NOT NULL DEFAULT '',
          details_edited BOOLEAN NOT NULL DEFAULT false,
          claim_token_hash TEXT,
          claim_token_expires_at TIMESTAMPTZ,
          claimed_at TIMESTAMPTZ,
          card_id TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE(org_id, dedupe_key)
        )
      `)
      // tapcard_cards already exists (lib/tapcardDb.ts) — these columns tie
      // a card to an org without a hard FK, keeping the two modules
      // decoupled (consistent with how tapcard_cards already relates
      // loosely to other tables, e.g. tapcard_exchanges).
      .then(() => sql`ALTER TABLE tapcard_cards ADD COLUMN IF NOT EXISTS org_id TEXT`)
      .then(() => sql`ALTER TABLE tapcard_cards ADD COLUMN IF NOT EXISTS org_employee_id TEXT`)
      .then(() => sql`ALTER TABLE tapcard_cards ADD COLUMN IF NOT EXISTS org_locked_fields TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]`)
      .catch((err) => {
        schemaReady = null;
        throw err;
      });
  }
  return schemaReady;
}

export function newId(): string {
  return crypto.randomBytes(16).toString("base64url");
}

export async function createOrg(name: string, domain = ""): Promise<BizOrg> {
  await ensureSchema();
  const id = newId();
  const rows = (await sql`
    INSERT INTO tapcard_biz_orgs (id, name, domain, locked_fields)
    VALUES (${id}, ${name}, ${domain}, ${DEFAULT_LOCKED_FIELDS})
    RETURNING *
  `) as BizOrg[];
  return rows[0];
}

/// The domain half of an email address, lowercased — e.g.
/// "jane@acme.co.uk" -> "acme.co.uk". Used to key one free trial per
/// company rather than per person, so the same company can't just sign
/// up five different employees for five free trials. Free email domains
/// (gmail.com etc.) deliberately aren't special-cased — a genuine small
/// company using Gmail only gets one trial same as anyone else, which is
/// an acceptable, simple tradeoff rather than maintaining a domain list.
export function domainOf(email: string): string {
  return email.trim().toLowerCase().split("@")[1] ?? "";
}

/// True if this domain has already claimed a free trial — checked before
/// creating a new one (see app/api/tapcard/biz/trial/route.ts). Reads the
/// persistent trial_used flag, not the org's current seat_band, since an
/// org that started as a trial and later upgraded still has to block a
/// second trial for the same domain.
export async function domainHasUsedTrial(domain: string): Promise<boolean> {
  if (!domain) return false;
  await ensureSchema();
  const rows = (await sql`
    SELECT 1 FROM tapcard_biz_orgs WHERE domain = ${domain} AND trial_used = true LIMIT 1
  `) as unknown[];
  return rows.length > 0;
}

export async function getOrg(id: string): Promise<BizOrg | null> {
  await ensureSchema();
  const rows = (await sql`SELECT * FROM tapcard_biz_orgs WHERE id = ${id}`) as BizOrg[];
  return rows[0] ?? null;
}

/// The only thing that matters for "can this org's employees still be
/// provisioned" — see app/api/tapcard/biz/employees/import and
/// app/api/tapcard/biz/claim/[token]. Deliberately NOT consulted anywhere
/// in the existing card read/update/share paths: an already-claimed card
/// must keep working even if billing lapses later (see the plan's
/// reasoning — breaking a card already out in the world over a billing
/// hiccup is a bad, highly visible failure that isn't the employee's fault).
export function orgCanProvision(org: Pick<BizOrg, "billing_status">): boolean {
  return org.billing_status === "active";
}

export interface OrgTemplateInput {
  name: string;
  logo_url: string | null;
  website: string;
  brand_color: string;
  linkedin_url: string;
  twitter_url: string;
  instagram_url: string;
  facebook_url: string;
  tiktok_url: string;
  whatsapp_url: string;
  locked_fields: string[];
  allows_personal_cards: boolean;
}

export async function updateOrgTemplate(id: string, input: OrgTemplateInput): Promise<void> {
  await ensureSchema();
  await sql`
    UPDATE tapcard_biz_orgs
    SET name = ${input.name}, logo_url = ${input.logo_url}, website = ${input.website},
        brand_color = ${input.brand_color}, linkedin_url = ${input.linkedin_url},
        twitter_url = ${input.twitter_url}, instagram_url = ${input.instagram_url},
        facebook_url = ${input.facebook_url}, tiktok_url = ${input.tiktok_url},
        whatsapp_url = ${input.whatsapp_url}, locked_fields = ${input.locked_fields},
        allows_personal_cards = ${input.allows_personal_cards},
        policy_version = policy_version + 1,
        updated_at = now()
    WHERE id = ${id}
  `;
}

export async function setOrgBilling(
  id: string,
  fields: Partial<Pick<BizOrg, "billing_status" | "seat_band" | "seat_limit" | "stripe_customer_id" | "stripe_subscription_id" | "current_period_end">>
): Promise<void> {
  await ensureSchema();
  const current = await getOrg(id);
  if (!current) return;
  await sql`
    UPDATE tapcard_biz_orgs
    SET billing_status = ${fields.billing_status ?? current.billing_status},
        seat_band = ${fields.seat_band ?? current.seat_band},
        seat_limit = ${fields.seat_limit ?? current.seat_limit},
        stripe_customer_id = ${fields.stripe_customer_id ?? current.stripe_customer_id},
        stripe_subscription_id = ${fields.stripe_subscription_id ?? current.stripe_subscription_id},
        current_period_end = ${fields.current_period_end ?? current.current_period_end},
        updated_at = now()
    WHERE id = ${id}
  `;
}

export async function markTrialUsed(orgId: string): Promise<void> {
  await ensureSchema();
  await sql`UPDATE tapcard_biz_orgs SET trial_used = true WHERE id = ${orgId}`;
}

export async function getOrgByStripeCustomerId(stripeCustomerId: string): Promise<BizOrg | null> {
  await ensureSchema();
  const rows = (await sql`SELECT * FROM tapcard_biz_orgs WHERE stripe_customer_id = ${stripeCustomerId}`) as BizOrg[];
  return rows[0] ?? null;
}

export async function getOrgByStripeSubscriptionId(stripeSubscriptionId: string): Promise<BizOrg | null> {
  await ensureSchema();
  const rows = (await sql`SELECT * FROM tapcard_biz_orgs WHERE stripe_subscription_id = ${stripeSubscriptionId}`) as BizOrg[];
  return rows[0] ?? null;
}

export async function addAdmin(orgId: string, email: string, role = "admin"): Promise<void> {
  await ensureSchema();
  await sql`
    INSERT INTO tapcard_biz_admins (id, org_id, email, role)
    VALUES (${newId()}, ${orgId}, ${email.toLowerCase().trim()}, ${role})
    ON CONFLICT (org_id, email) DO NOTHING
  `;
}

export interface BizAdmin {
  id: string;
  org_id: string;
  email: string;
  role: string;
}

export async function getAdminByEmail(orgId: string, email: string): Promise<BizAdmin | null> {
  await ensureSchema();
  const rows = (await sql`
    SELECT * FROM tapcard_biz_admins WHERE org_id = ${orgId} AND email = ${email.toLowerCase().trim()}
  `) as BizAdmin[];
  return rows[0] ?? null;
}

/// Any org this email administers — used at login time, before the caller
/// knows which org they belong to.
export async function findAdminOrgsByEmail(email: string): Promise<BizAdmin[]> {
  await ensureSchema();
  return (await sql`SELECT * FROM tapcard_biz_admins WHERE email = ${email.toLowerCase().trim()}`) as BizAdmin[];
}

/// Employee bulk import — INSERT ... SELECT * FROM unnest(...) ON CONFLICT,
/// the same pattern app/api/admin/invites/import/route.ts already uses,
/// because the Neon HTTP driver can't do multi-statement transactions (so
/// no Prisma-style loop of individual creates). Re-import never overwrites
/// a row an admin hand-edited since (details_edited). Returns the ids of
/// rows that are brand new (so the caller knows who needs a claim email).
export async function importEmployees(
  orgId: string,
  rows: { name: string; email: string; title: string }[]
): Promise<{ id: string; email: string; name: string; isNew: boolean }[]> {
  await ensureSchema();
  const ids = rows.map(() => newId());
  const dedupeKeys = rows.map((r) => r.email.trim().toLowerCase());
  const names = rows.map((r) => r.name.trim().slice(0, 200));
  const emails = rows.map((r) => r.email.trim().slice(0, 200));
  const titles = rows.map((r) => r.title.trim().slice(0, 200));
  const orgIds = rows.map(() => orgId);

  const result = (await sql`
    INSERT INTO tapcard_biz_employees (id, org_id, dedupe_key, name, email, title)
    SELECT * FROM unnest(
      ${ids}::text[], ${orgIds}::text[], ${dedupeKeys}::text[],
      ${names}::text[], ${emails}::text[], ${titles}::text[]
    )
    ON CONFLICT (org_id, dedupe_key) DO UPDATE
      SET name = CASE WHEN tapcard_biz_employees.details_edited THEN tapcard_biz_employees.name ELSE EXCLUDED.name END,
          title = CASE WHEN tapcard_biz_employees.details_edited THEN tapcard_biz_employees.title ELSE EXCLUDED.title END
    RETURNING id, email, name, (xmax = 0) AS is_new
  `) as { id: string; email: string; name: string; is_new: boolean }[];

  return result.map((r) => ({ id: r.id, email: r.email, name: r.name, isNew: r.is_new }));
}

export async function listEmployees(orgId: string): Promise<BizEmployee[]> {
  await ensureSchema();
  return (await sql`SELECT * FROM tapcard_biz_employees WHERE org_id = ${orgId} ORDER BY created_at DESC`) as BizEmployee[];
}

export async function markDetailsEdited(id: string, name: string, title: string): Promise<void> {
  await ensureSchema();
  await sql`UPDATE tapcard_biz_employees SET name = ${name}, title = ${title}, details_edited = true WHERE id = ${id}`;
}

/// 14-day single-use claim token for a not-yet-claimed employee. Returns
/// null (and does nothing) once already claimed — re-sending an invite to
/// someone who's already set up shouldn't silently revoke their card.
export async function issueClaimToken(employeeId: string): Promise<string | null> {
  await ensureSchema();
  const token = crypto.randomBytes(32).toString("base64url");
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const rows = await sql`
    UPDATE tapcard_biz_employees
    SET claim_token_hash = ${hash}, claim_token_expires_at = now() + interval '14 days'
    WHERE id = ${employeeId} AND claimed_at IS NULL
    RETURNING id
  `;
  return rows.length > 0 ? token : null;
}

export async function getEmployeeByClaimToken(token: string): Promise<BizEmployee | null> {
  await ensureSchema();
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const rows = (await sql`
    SELECT * FROM tapcard_biz_employees
    WHERE claim_token_hash = ${hash} AND claim_token_expires_at > now() AND claimed_at IS NULL
  `) as BizEmployee[];
  return rows[0] ?? null;
}

export async function markClaimed(employeeId: string, cardId: string): Promise<void> {
  await ensureSchema();
  await sql`UPDATE tapcard_biz_employees SET claimed_at = now(), card_id = ${cardId} WHERE id = ${employeeId}`;
}

/// Ties a freshly-created tapcard_cards row to its org — a separate update
/// rather than part of createCard() in lib/tapcardDb.ts, so that module
/// stays untouched by the business concept entirely.
export async function attachCardToOrg(cardId: string, orgId: string, employeeId: string, lockedFields: string[]): Promise<void> {
  await ensureSchema();
  await sql`
    UPDATE tapcard_cards
    SET org_id = ${orgId}, org_employee_id = ${employeeId}, org_locked_fields = ${lockedFields}
    WHERE id = ${cardId}
  `;
}
