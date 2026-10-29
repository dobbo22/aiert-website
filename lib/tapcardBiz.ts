import sql from "@/lib/db";
import crypto from "crypto";
import { del } from "@vercel/blob";

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
  /// Free for life: set by AIERT on the Companies page; billing changes never apply to it.
  free_for_life?: boolean;
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
  /// Paid locations (the Stripe subscription quantity) for a per-location plan; 0 for a trial or an older seat-band plan.
  locations: number;
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

import { DEFAULT_LOCKED_FIELDS, LOCKABLE_FIELDS } from "@/lib/tapcardBizFields";
import { TRIAL_DAYS } from "@/lib/tapcardBizBilling";
import { emailOnDomain } from "@/lib/tapcardDomain";
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
      .then(() => sql`ALTER TABLE tapcard_biz_orgs ADD COLUMN IF NOT EXISTS trial_reminded_at TIMESTAMPTZ`)
      .then(() => sql`ALTER TABLE tapcard_biz_orgs ADD COLUMN IF NOT EXISTS locations INTEGER NOT NULL DEFAULT 0`)
      .then(() => sql`ALTER TABLE tapcard_biz_orgs ADD COLUMN IF NOT EXISTS welcome_sent TEXT`)
      // AIERT's decision that this company is free for ever (a founding partner): nothing may switch its billing off or ask it to pay.
      .then(() => sql`ALTER TABLE tapcard_biz_orgs ADD COLUMN IF NOT EXISTS free_for_life BOOLEAN NOT NULL DEFAULT false`)
      .then(() => sql`ALTER TABLE tapcard_cards ADD COLUMN IF NOT EXISTS org_overrides TEXT NOT NULL DEFAULT '{}'`)
      // A manager (role 'manager') is limited to the shops listed here (tapcard_biz_locations ids); a staff card belongs to one shop.
      .then(() => sql`ALTER TABLE tapcard_cards ADD COLUMN IF NOT EXISTS org_location_id TEXT`)

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
      // Set when the admin opens the sign-in link emailed to this address: proof they control the mailbox.
      .then(() => sql`ALTER TABLE tapcard_biz_admins ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ`)
      .then(() => sql`ALTER TABLE tapcard_biz_admins ADD COLUMN IF NOT EXISTS location_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]`)
      // A manager may post their shops' offers and news unless an admin switches it off.
      .then(() => sql`ALTER TABLE tapcard_biz_admins ADD COLUMN IF NOT EXISTS can_post BOOLEAN NOT NULL DEFAULT true`)
      .then(() => sql`
        CREATE TABLE IF NOT EXISTS tapcard_biz_login_tokens (
          token_hash TEXT PRIMARY KEY,
          admin_email TEXT NOT NULL,
          org_id TEXT,
          expires_at TIMESTAMPTZ NOT NULL,
          consumed_at TIMESTAMPTZ
        )
      `)
      // (After the login-tokens table exists, so a brand-new database sets up cleanly.) Admins who had already opened a sign-in link before this column existed count as confirmed from that moment.
      .then(() => sql`
        UPDATE tapcard_biz_admins a SET confirmed_at = t.first_used
        FROM (SELECT org_id, lower(admin_email) AS email, min(consumed_at) AS first_used FROM tapcard_biz_login_tokens
              WHERE consumed_at IS NOT NULL AND org_id IS NOT NULL GROUP BY org_id, lower(admin_email)) t
        WHERE a.org_id = t.org_id AND a.email = t.email AND a.confirmed_at IS NULL
      `)
      // Single-use invite links (lib/tapcardBizInvite.ts) are signed, not
      // stored — this only records each spent invite's random id (hashed),
      // which says nothing about who it was for.
      .then(() => sql`
        CREATE TABLE IF NOT EXISTS tapcard_biz_spent_invites (
          jti_hash TEXT PRIMARY KEY,
          org_id TEXT NOT NULL,
          spent_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `)
      // The staff list used to be stored here; it now stays in the admin's
      // own file. One-off cleanup of any rows (and admin-uploaded photos)
      // from before — a no-op once the table is gone.
      .then(() => purgeLegacyEmployeeRoster())
      // tapcard_cards already exists (lib/tapcardDb.ts) — these columns tie
      // a card to an org without a hard FK, keeping the two modules
      // decoupled (consistent with how tapcard_cards already relates
      // loosely to other tables, e.g. tapcard_exchanges).
      .then(() => sql`ALTER TABLE tapcard_cards ADD COLUMN IF NOT EXISTS org_id TEXT`)
      .then(() => sql`ALTER TABLE tapcard_cards ADD COLUMN IF NOT EXISTS org_can_post BOOLEAN NOT NULL DEFAULT false`)
      .then(() => sql`ALTER TABLE tapcard_cards ADD COLUMN IF NOT EXISTS org_posts_for TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]`)
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

/// Free trial already used by this exact address. Used instead of the domain check for Gmail and other shared domains, where
/// everyone would otherwise share one trial.
export async function emailHasUsedTrial(email: string): Promise<boolean> {
  await ensureSchema();
  const rows = (await sql`
    SELECT 1 FROM tapcard_biz_admins a JOIN tapcard_biz_orgs o ON o.id = a.org_id
    WHERE a.email = ${email.trim().toLowerCase()} AND o.trial_used = true LIMIT 1
  `) as unknown[];
  return rows.length > 0;
}

/// The admin has opened the sign-in link sent to this address, so they control that mailbox.
export async function confirmAdminEmail(orgId: string, email: string): Promise<void> {
  await ensureSchema();
  await sql`UPDATE tapcard_biz_admins SET confirmed_at = now() WHERE org_id = ${orgId} AND email = ${email.trim().toLowerCase()} AND confirmed_at IS NULL`;
}

/// The rule behind company verification: at least one admin has opened their emailed sign-in link (so controls that mailbox) and that
/// mailbox is on, or under, the business domain. Pure so it can be tested.
export function adminsConfirmDomain(admins: { email: string; confirmed_at: string | Date | null }[], domain: string): boolean {
  return !!domain && admins.some((a) => !!a.confirmed_at && emailOnDomain(a.email, domain));
}

/// Has someone with a confirmed mailbox on this business domain signed in to the company? That is the company's proof that it
/// owns the domain (the same standard as verifying a single card with an emailed code).
export async function orgHasConfirmedAdminOnDomain(orgId: string, domain: string): Promise<boolean> {
  if (!domain) return false;
  // Only admins prove the company owns its domain, never a shop manager.
  return adminsConfirmDomain((await listAdmins(orgId)).filter((a) => a.role !== "manager"), domain);
}

/// Claims the right to send a company its welcome email ("trial" once at sign-up, "paid" once when a plan starts), so a repeated
/// request or a re-delivered Stripe event never sends it twice. True when this caller should send it.
export async function claimWelcomeEmail(orgId: string, kind: "trial" | "paid"): Promise<boolean> {
  await ensureSchema();
  const rows = kind === "trial"
    ? await sql`UPDATE tapcard_biz_orgs SET welcome_sent = 'trial' WHERE id = ${orgId} AND welcome_sent IS NULL RETURNING id`
    : await sql`UPDATE tapcard_biz_orgs SET welcome_sent = 'paid' WHERE id = ${orgId} AND welcome_sent IS DISTINCT FROM 'paid' RETURNING id`;
  return rows.length > 0;
}

export async function getOrg(id: string): Promise<BizOrg | null> {
  await ensureSchema();
  const rows = (await sql`SELECT * FROM tapcard_biz_orgs WHERE id = ${id}`) as BizOrg[];
  return rows[0] ?? null;
}

/// The only thing that matters for "can this org's employees still be
/// provisioned" — see app/api/tapcard/biz/invites and
/// app/api/tapcard/biz/claim. Deliberately NOT consulted anywhere
/// in the existing card read/update/share paths: an already-claimed card
/// must keep working even if billing lapses later (see the plan's
/// reasoning — breaking a card already out in the world over a billing
/// hiccup is a bad, highly visible failure that isn't the employee's fault).
export function orgCanProvision(org: Pick<BizOrg, "billing_status" | "seat_band" | "current_period_end" | "created_at">): boolean {
  return isOrgActive(org);
}

/// A company AIERT set up free of charge (the Companies page): locations on the paid-plan fields, active, with no Stripe subscription or
/// customer and no renewal date. Nothing is ever charged, so the billing page says so instead of offering a plan.
export function isComplimentary(org: Pick<BizOrg, "seat_band" | "billing_status" | "stripe_subscription_id" | "stripe_customer_id" | "current_period_end"> & { free_for_life?: boolean }): boolean {
  if (org.free_for_life) return true;
  return org.seat_band === "locations" && org.billing_status === "active" && !org.stripe_subscription_id && !org.stripe_customer_id && !org.current_period_end;
}

type TrialFields = Pick<BizOrg, "seat_band" | "current_period_end" | "created_at">;

/// When a free-trial company's trial ends: its stored end date, or 30 days after it was created for trials made
/// before the end date was recorded. null for a paid company.
export function trialEndsAt(org: TrialFields): Date | null {
  if (org.seat_band !== "trial") return null;
  if (org.current_period_end) return new Date(org.current_period_end);
  return new Date(new Date(org.created_at).getTime() + TRIAL_DAYS * 86_400_000);
}

export function isTrialExpired(org: TrialFields): boolean {
  const end = trialEndsAt(org);
  return !!end && end.getTime() < Date.now();
}

/// Billing is active, and a free trial hasn't run out. The one check behind invites, Promote cover and the admin pages.
export function isOrgActive(org: Pick<BizOrg, "billing_status"> & TrialFields & { free_for_life?: boolean }): boolean {
  if (org.free_for_life) return true;
  return org.billing_status === "active" && !isTrialExpired(org);
}

/// Wording for the admin: Active, Trial ended, or the stored status.
export function orgStatusLabel(org: Pick<BizOrg, "billing_status"> & TrialFields): string {
  if (org.billing_status === "active" && isTrialExpired(org)) return "Trial ended";
  return org.billing_status;
}

/// No logo_url: the logo has its own route (setOrgLogo).
export interface OrgTemplateInput {
  name: string;
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
    SET name = ${input.name}, website = ${input.website},
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
  fields: Partial<Pick<BizOrg, "billing_status" | "seat_band" | "seat_limit" | "locations" | "stripe_customer_id" | "stripe_subscription_id" | "current_period_end">>
): Promise<void> {
  await ensureSchema();
  const current = await getOrg(id);
  if (!current) return;
  // A company that is free for life is never switched off, put on a trial clock or attached to a subscription by a billing event.
  if (current.free_for_life) {
    fields = { seat_limit: fields.seat_limit, locations: fields.locations };
  }
  await sql`
    UPDATE tapcard_biz_orgs
    SET billing_status = ${fields.billing_status ?? current.billing_status},
        seat_band = ${fields.seat_band ?? current.seat_band},
        seat_limit = ${fields.seat_limit ?? current.seat_limit},
        locations = ${fields.locations ?? current.locations ?? 0},
        stripe_customer_id = ${fields.stripe_customer_id ?? current.stripe_customer_id},
        stripe_subscription_id = ${fields.stripe_subscription_id ?? current.stripe_subscription_id},
        current_period_end = ${fields.current_period_end ?? current.current_period_end},
        updated_at = now()
    WHERE id = ${id}
  `;
}

/// Set by app/api/tapcard/biz/logo — kept out of updateOrgTemplate so a
/// template save never touches it. Bumps policy_version so apps refetch.
export async function setOrgLogo(id: string, logoUrl: string | null): Promise<void> {
  await ensureSchema();
  await sql`
    UPDATE tapcard_biz_orgs
    SET logo_url = ${logoUrl}, policy_version = policy_version + 1, updated_at = now()
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

export async function addAdmin(orgId: string, email: string, role = "admin", locationIds: string[] = []): Promise<void> {
  await ensureSchema();
  await sql`
    INSERT INTO tapcard_biz_admins (id, org_id, email, role, location_ids)
    VALUES (${newId()}, ${orgId}, ${email.toLowerCase().trim()}, ${role}, ${locationIds})
    ON CONFLICT (org_id, email) DO NOTHING
  `;
}

/// A company may have up to this many admins.
export const MAX_ADMINS = 5;

export interface BizAdminRow { id: string; email: string; role: string; created_at: string; confirmed_at: string | null; location_ids: string[]; can_post: boolean }

/// The company's admins, first (the owner) to last.
export async function listAdmins(orgId: string): Promise<BizAdminRow[]> {
  await ensureSchema();
  return (await sql`SELECT id, email, role, created_at, confirmed_at, location_ids, can_post FROM tapcard_biz_admins WHERE org_id = ${orgId} ORDER BY created_at, id`) as BizAdminRow[];
}

/// Managers: people who run one or more shops. They sign in with an emailed link like an admin, but only see their own shops' QR sign
/// and staff. They never see offers, billing, the template, locations or other admins. A company may have up to this many.
export const MAX_MANAGERS = 50;

export async function removeAdminById(orgId: string, adminId: string): Promise<void> {
  await ensureSchema();
  await sql`DELETE FROM tapcard_biz_admins WHERE org_id = ${orgId} AND id = ${adminId}`;
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

/// Ties a freshly-created tapcard_cards row to its org — a separate update
/// rather than part of createCard() in lib/tapcardDb.ts, so that module
/// stays untouched by the business concept entirely.
export async function attachCardToOrg(cardId: string, orgId: string, lockedFields: string[]): Promise<void> {
  await ensureSchema();
  await sql`
    UPDATE tapcard_cards SET org_id = ${orgId}, org_locked_fields = ${lockedFields} WHERE id = ${cardId}
  `;
}

/// The company a card already belongs to, or null for an ordinary card.
export async function cardOrgId(cardId: string): Promise<string | null> {
  await ensureSchema();
  const rows = (await sql`SELECT org_id FROM tapcard_cards WHERE id = ${cardId}`) as { org_id: string | null }[];
  return rows[0]?.org_id ?? null;
}

/// Marks an invite id as used. Atomic: true only for the one request that
/// spends it, so two taps on the same link can't both create a card.
export async function spendInvite(jti: string, orgId: string): Promise<boolean> {
  await ensureSchema();
  const hash = crypto.createHash("sha256").update(jti).digest("hex");
  const rows = await sql`
    INSERT INTO tapcard_biz_spent_invites (jti_hash, org_id) VALUES (${hash}, ${orgId})
    ON CONFLICT (jti_hash) DO NOTHING
    RETURNING jti_hash
  `;
  return rows.length > 0;
}

/// Cards employees have activated — what seats are counted against, and
/// what the employees page lists (the card's own public details only).
export interface OrgCard {
  id: string;
  name: string;
  title: string;
  email: string;
  created_at: Date | string;
  /// The admin has ticked this card to post offers and news from its owner's phone.
  can_post: boolean;
  /// "business" when the admin marked this card as a shop / location, else "person" or "".
  card_kind: string;
  /// Ids of the locations this card's owner may post offers and news for.
  posts_for: string[];
  /// The shop (tapcard_biz_locations id) a staff card belongs to, or null.
  org_location_id: string | null;
}

export async function listOrgCards(orgId: string): Promise<OrgCard[]> {
  await ensureSchema();
  return (await sql`
    SELECT id, name, title, email, created_at, org_can_post AS can_post, card_kind, org_posts_for AS posts_for, org_location_id FROM tapcard_cards WHERE org_id = ${orgId} ORDER BY created_at DESC
  `) as OrgCard[];
}

/// The staff cards (people, not shops) of the given shops: what a manager sees and may remove.
export async function listStaffForLocations(orgId: string, locationIds: string[]): Promise<OrgCard[]> {
  await ensureSchema();
  if (!locationIds.length) return [];
  return (await sql`
    SELECT id, name, title, email, created_at, org_can_post AS can_post, card_kind, org_posts_for AS posts_for, org_location_id
    FROM tapcard_cards WHERE org_id = ${orgId} AND org_location_id = ANY(${locationIds}) AND card_kind <> 'business' ORDER BY created_at DESC
  `) as OrgCard[];
}

/// A staff card the manager may remove: in their company, belonging to one of their shops, and not a shop card.
export async function getStaffCardInScope(orgId: string, cardId: string, locationIds: string[]): Promise<{ found: boolean; photoUrl: string | null }> {
  await ensureSchema();
  if (!locationIds.length) return { found: false, photoUrl: null };
  const rows = (await sql`
    SELECT photo_url FROM tapcard_cards WHERE id = ${cardId} AND org_id = ${orgId} AND org_location_id = ANY(${locationIds}) AND card_kind <> 'business'
  `) as { photo_url: string | null }[];
  return rows[0] ? { found: true, photoUrl: rows[0].photo_url } : { found: false, photoUrl: null };
}

/// An admin tags an existing staff card with its shop (or clears it). Only a staff card of this company, and only a shop of this company.
export async function assignStaffShop(orgId: string, cardId: string, locationId: string | null): Promise<boolean> {
  await ensureSchema();
  if (locationId) {
    const shop = await sql`SELECT 1 FROM tapcard_biz_locations WHERE id = ${locationId} AND org_id = ${orgId}`;
    if (!shop.length) return false;
  }
  const rows = await sql`UPDATE tapcard_cards SET org_location_id = ${locationId} WHERE id = ${cardId} AND org_id = ${orgId} AND card_kind <> 'business' RETURNING id`;
  return rows.length > 0;
}

export async function setCardStaffLocation(cardId: string, locationId: string): Promise<void> {
  await ensureSchema();
  await sql`UPDATE tapcard_cards SET org_location_id = ${locationId} WHERE id = ${cardId}`;
}

export async function countOrgCards(orgId: string): Promise<number> {
  await ensureSchema();
  const rows = (await sql`SELECT count(*)::int AS n FROM tapcard_cards WHERE org_id = ${orgId}`) as { n: number }[];
  return rows[0]?.n ?? 0;
}

/// The photo_url of a company card, checked to belong to `orgId` — for the
/// admin's "Remove" (someone left): the caller deletes the card and photo.
export async function getOrgCardPhoto(orgId: string, cardId: string): Promise<{ found: boolean; photoUrl: string | null }> {
  await ensureSchema();
  const rows = (await sql`
    SELECT photo_url FROM tapcard_cards WHERE id = ${cardId} AND org_id = ${orgId}
  `) as { photo_url: string | null }[];
  return rows[0] ? { found: true, photoUrl: rows[0].photo_url } : { found: false, photoUrl: null };
}

async function purgeLegacyEmployeeRoster(): Promise<void> {
  const exists = (await sql`SELECT to_regclass('tapcard_biz_employees') AS t`) as { t: string | null }[];
  if (!exists[0]?.t) return;
  const rows = (await sql`SELECT * FROM tapcard_biz_employees`) as { photo_url?: string | null }[];
  const photos = rows.map((r) => r.photo_url).filter((u): u is string => !!u);
  if (photos.length) await del(photos).catch(() => {});
  await sql`DROP TABLE IF EXISTS tapcard_biz_employees`;
}

/// Card-input column for each LOCKABLE_FIELDS name (which use the card JSON
/// keys), and the org template column that supplies its value, where the
/// template has one. Fields without a template column (title, phone,
/// address) are per-employee, so locking them just freezes what the card
/// already has.
const LOCKED_FIELD_COLUMNS: Record<(typeof LOCKABLE_FIELDS)[number], { card: string; template?: keyof BizOrg }> = {
  title: { card: "title" },
  company: { card: "company", template: "name" },
  phone: { card: "phone" },
  website: { card: "website", template: "website" },
  address: { card: "address" },
  linkedinURL: { card: "linkedin_url", template: "linkedin_url" },
  twitterURL: { card: "twitter_url", template: "twitter_url" },
  instagramURL: { card: "instagram_url", template: "instagram_url" },
  facebookURL: { card: "facebook_url", template: "facebook_url" },
  tiktokURL: { card: "tiktok_url", template: "tiktok_url" },
  whatsAppURL: { card: "whatsapp_url", template: "whatsapp_url" },
};

/// The server-side half of field locking (the apps grey the same fields
/// out): called on every update to a card, so an old app build or a
/// hand-crafted request can't change a field the company has locked.
/// Uses the org's *current* lock list and template rather than the copy
/// stored on the card at claim time, so an admin's later template change
/// also lands on the next save. Cards with no org pass through untouched.
export async function applyOrgLocks<T extends Record<string, unknown>>(
  existing: Record<string, unknown>,
  fields: T
): Promise<T> {
  const orgId = existing.org_id;
  if (typeof orgId !== "string" || !orgId) return fields;
  const org = await getOrg(orgId);
  if (!org) return fields;
  const locked: Record<string, unknown> = { ...fields };
  for (const name of org.locked_fields) {
    const columns = LOCKED_FIELD_COLUMNS[name as (typeof LOCKABLE_FIELDS)[number]];
    if (!columns || !(columns.card in locked)) continue;
    locked[columns.card] = columns.template ? (org[columns.template] ?? "") : (existing[columns.card] ?? "");
  }
  // What the company's admin has set for this card (its address, phone, email or name changed from the web) wins over a phone's older copy.
  try {
    const overrides = JSON.parse(typeof existing.org_overrides === "string" ? existing.org_overrides : "{}") as Record<string, string>;
    for (const k of OVERRIDE_FIELDS) if (k in locked && typeof overrides[k] === "string") locked[k] = overrides[k];
  } catch { /* an unreadable value is ignored */ }
  return locked as T;
}

/// The details a company admin may change on a card that has been made (a shop moving, a new number).
export const OVERRIDE_FIELDS = ["name", "address", "phone", "email"] as const;

/// The admin changes a made company card: the card itself changes at once (what customers, the web page and Wallet show), and the
/// change is remembered so a phone's older copy can never put it back (applyOrgLocks), until the person's app picks it up.
export async function setCardOverrides(orgId: string, cardId: string, patch: Partial<Record<(typeof OVERRIDE_FIELDS)[number], string>>): Promise<{ before: Record<string, string>; after: Record<string, string> } | null> {
  await ensureSchema();
  const rows = (await sql`SELECT name, address, phone, email, org_overrides FROM tapcard_cards WHERE id = ${cardId} AND org_id = ${orgId}`) as (Record<string, string>)[];
  const row = rows[0];
  if (!row) return null;
  let overrides: Record<string, string> = {};
  try { overrides = JSON.parse(row.org_overrides || "{}"); } catch { /* start fresh */ }
  const next = { name: row.name, address: row.address, phone: row.phone, email: row.email };
  for (const k of OVERRIDE_FIELDS) {
    const v = patch[k];
    if (typeof v === "string") { next[k] = v.trim().slice(0, k === "address" ? 300 : 200); overrides[k] = next[k]; }
  }
  await sql`UPDATE tapcard_cards SET name = ${next.name}, address = ${next.address}, phone = ${next.phone}, email = ${next.email}, org_overrides = ${JSON.stringify(overrides)}, updated_at = now() WHERE id = ${cardId} AND org_id = ${orgId}`;
  return { before: { name: row.name, address: row.address, phone: row.phone, email: row.email }, after: next };
}

/// The owner's app has applied the admin's changes to its own copy, so they stop overriding what the phone saves: from here the
/// manager's own later edits stick. (Apps that never confirm keep the admin's values locked, which is the safe side.)
export async function clearCardOverrides(cardId: string): Promise<void> {
  await ensureSchema();
  await sql`UPDATE tapcard_cards SET org_overrides = '{}' WHERE id = ${cardId} AND org_id IS NOT NULL`;
}

/// What the admin has set for a card, for the owner's app to pick up (the app proves it holds the card with its edit token).
export async function getCardOverrides(cardId: string): Promise<Record<string, string>> {
  await ensureSchema();
  const rows = (await sql`SELECT org_overrides FROM tapcard_cards WHERE id = ${cardId} AND org_id IS NOT NULL`) as { org_overrides: string }[];
  try { return JSON.parse(rows[0]?.org_overrides || "{}"); } catch { return {}; }
}

/// The uploaded company logo of the org a card belongs to (template page,
/// app/api/tapcard/biz/logo), or null for personal cards and orgs without
/// one. Callers fall back to the website icon (lib/siteIcon) as before.
export async function orgLogoUrlForCard(card: object): Promise<string | null> {
  const orgId = (card as { org_id?: unknown }).org_id;
  if (typeof orgId !== "string" || !orgId) return null;
  return (await getOrg(orgId))?.logo_url ?? null;
}

/// The uploaded logo of the company whose website is on this domain (www. ignored), if any. A received company card in the apps has no
/// link to its org, only its website, so /api/logo uses this to show the company's own logo rather than whatever its site declares.
export async function orgLogoUrlForDomain(domain: string): Promise<string | null> {
  await ensureSchema();
  const want = domain.toLowerCase().replace(/^www\./, "");
  const rows = (await sql`SELECT website, logo_url FROM tapcard_biz_orgs WHERE logo_url IS NOT NULL AND logo_url <> '' AND website <> ''`) as { website: string; logo_url: string }[];
  for (const r of rows) {
    const host = r.website.trim().toLowerCase().replace(/^https?:\/\//, "").split(/[/?#]/)[0].replace(/^www\./, "");
    if (host === want) return r.logo_url;
  }
  return null;
}

/// orgLogoUrlForCard's image bytes, for the Wallet pass artwork. Only ever
/// our own Vercel Blob URL (set by the logo route), capped like site icons.
export async function orgLogoBytesForCard(card: object): Promise<Buffer | null> {
  const url = await orgLogoUrlForCard(card).catch(() => null);
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    return bytes.length <= 2 * 1024 * 1024 ? bytes : null;
  } catch {
    return null;
  }
}

// Company cards an admin has removed. The card API normally re-creates a card when a phone sends an id the server no
// longer has (so "Stop sharing" then re-sharing just works); for these ids it must not, or a removed employee's phone
// would bring a company card back to life. The apps also use this to take the card off the phone.
let removedReady: Promise<unknown> | null = null;
function ensureRemovedSchema(): Promise<unknown> {
  if (!removedReady) {
    removedReady = sql`
      CREATE TABLE IF NOT EXISTS tapcard_removed_cards (
        card_id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        removed_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `.catch((err) => {
      removedReady = null;
      throw err;
    });
  }
  return removedReady;
}

export async function markCardRemovedByCompany(cardId: string, orgId: string): Promise<void> {
  await ensureRemovedSchema();
  await sql`INSERT INTO tapcard_removed_cards (card_id, org_id) VALUES (${cardId}, ${orgId}) ON CONFLICT DO NOTHING`;
}

export async function wasRemovedByCompany(cardId: string): Promise<boolean> {
  await ensureRemovedSchema();
  const rows = (await sql`SELECT 1 FROM tapcard_removed_cards WHERE card_id = ${cardId} LIMIT 1`) as unknown[];
  return rows.length > 0;
}

/// Who may post offers and news for a company location. The location's own phone needs the admin's tick (legacy
/// `org_can_post`) or itself in its "post for" list; a staff card needs the location in its "post for" list. Cards with
/// no company (a single business) can always post for themselves. The company admin (web) is checked elsewhere.
export async function posterMayPostFor(posterId: string, targetId: string): Promise<boolean> {
  await ensureSchema();
  const rows = (await sql`
    SELECT id, org_id, org_can_post, org_posts_for FROM tapcard_cards WHERE id = ANY(${[posterId, targetId]})
  `) as { id: string; org_id: string | null; org_can_post: boolean; org_posts_for: string[] }[];
  const poster = rows.find((r) => r.id === posterId);
  const target = rows.find((r) => r.id === targetId);
  if (!poster || !target) return false;
  if (posterId === targetId) return !target.org_id || target.org_can_post === true || (poster.org_posts_for ?? []).includes(targetId);
  return !!poster.org_id && poster.org_id === target.org_id && (poster.org_posts_for ?? []).includes(targetId);
}

/// The locations a card may post for, with names (for the app's "post for" choice).
export async function postTargetsFor(cardId: string): Promise<{ id: string; name: string }[]> {
  await ensureSchema();
  const me = (await sql`SELECT org_id, org_can_post, org_posts_for FROM tapcard_cards WHERE id = ${cardId}`) as { org_id: string | null; org_can_post: boolean; org_posts_for: string[] }[];
  if (!me[0]) return [];
  if (!me[0].org_id) return [{ id: cardId, name: "" }];
  const ids = [...new Set([...(me[0].org_posts_for ?? []), ...(me[0].org_can_post ? [cardId] : [])])];
  if (!ids.length) return [];
  return (await sql`SELECT id, COALESCE(NULLIF(company, ''), name) AS name FROM tapcard_cards WHERE id = ANY(${ids}) AND org_id = ${me[0].org_id}`) as { id: string; name: string }[];
}

/// The admin marks a company card as a shop / location (offers belong to it), or as a person's card.
export async function setIsLocation(orgId: string, cardId: string, isLocation: boolean): Promise<boolean> {
  await ensureSchema();
  const rows = await sql`UPDATE tapcard_cards SET card_kind = ${isLocation ? "business" : "person"} WHERE id = ${cardId} AND org_id = ${orgId} RETURNING id`;
  return rows.length > 0;
}

/// The admin sets which locations a card's owner may post for. Only locations of the same company.
export async function setPostsFor(orgId: string, cardId: string, targetIds: string[]): Promise<boolean> {
  await ensureSchema();
  const valid = (await sql`SELECT id FROM tapcard_cards WHERE org_id = ${orgId} AND card_kind = 'business' AND id = ANY(${targetIds})`) as { id: string }[];
  const rows = await sql`
    UPDATE tapcard_cards SET org_posts_for = ${valid.map((v) => v.id)}, org_can_post = false WHERE id = ${cardId} AND org_id = ${orgId} RETURNING id
  `;
  return rows.length > 0;
}
