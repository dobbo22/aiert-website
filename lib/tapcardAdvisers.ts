// Advisers: an IR firm or broker (IFC, a nominated adviser) that looks after the headlines of many listed companies. AIERT sets the
// adviser up (its name and staff emails); a company must approve each adviser itself, from its own signed-in senior admin, before the
// adviser can do anything for it. What the adviser may do is limited by that approval: headlines and groups for general news, and
// regulatory news only if the company ticked that for this adviser AND the adviser's own staff member is marked senior.
// Advisers have their own sign-in and session. They never receive a company admin session, so they can't reach billing, admins or cards.
import crypto from "crypto";
import { cookies } from "next/headers";
import sql from "@/lib/db";
import { hmac } from "@/lib/tapcardBizAuth";
import { ensureSchema as ensureBizSchema } from "@/lib/tapcardBiz";

export const ADVISER_COOKIE = "tapcard_adviser";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

let ready: Promise<unknown> | null = null;
export function ensureAdviserSchema(): Promise<unknown> {
  if (!ready) {
    ready = ensureBizSchema()
      .then(() => sql`CREATE TABLE IF NOT EXISTS tapcard_advisers (id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`)
      .then(() => sql`
        CREATE TABLE IF NOT EXISTS tapcard_adviser_users (
          adviser_id TEXT NOT NULL REFERENCES tapcard_advisers(id) ON DELETE CASCADE,
          email TEXT NOT NULL,
          name TEXT NOT NULL DEFAULT '',
          senior BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          PRIMARY KEY (adviser_id, email)
        )
      `)
      .then(() => sql`
        CREATE TABLE IF NOT EXISTS tapcard_adviser_links (
          id TEXT PRIMARY KEY,
          adviser_id TEXT NOT NULL REFERENCES tapcard_advisers(id) ON DELETE CASCADE,
          org_id TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          can_regulatory BOOLEAN NOT NULL DEFAULT false,
          requested_by TEXT NOT NULL,
          requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          decided_by TEXT NOT NULL DEFAULT '',
          decided_at TIMESTAMPTZ,
          UNIQUE (adviser_id, org_id)
        )
      `)
      // Billing (lib/tapcardAdviserBilling.ts): the adviser's trial and subscription, and per company the tier, the cover and its minimum term.
      .then(() => sql`ALTER TABLE tapcard_advisers ADD COLUMN IF NOT EXISTS billing_status TEXT NOT NULL DEFAULT 'trial'`)
      .then(() => sql`ALTER TABLE tapcard_advisers ADD COLUMN IF NOT EXISTS trial_org_id TEXT`)
      .then(() => sql`ALTER TABLE tapcard_advisers ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ`)
      .then(() => sql`ALTER TABLE tapcard_advisers ADD COLUMN IF NOT EXISTS trial_reminded_at TIMESTAMPTZ`)
      .then(() => sql`ALTER TABLE tapcard_advisers ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT`)
      .then(() => sql`ALTER TABLE tapcard_advisers ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT`)
      .then(() => sql`ALTER TABLE tapcard_advisers ADD COLUMN IF NOT EXISTS paid_through TIMESTAMPTZ`)
      .then(() => sql`ALTER TABLE tapcard_advisers ADD COLUMN IF NOT EXISTS terms_version TEXT`)
      .then(() => sql`ALTER TABLE tapcard_advisers ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ`)
      .then(() => sql`ALTER TABLE tapcard_advisers ADD COLUMN IF NOT EXISTS terms_accepted_by TEXT`)
      .then(() => sql`ALTER TABLE tapcard_adviser_links ADD COLUMN IF NOT EXISTS tier INT`)
      .then(() => sql`ALTER TABLE tapcard_adviser_links ADD COLUMN IF NOT EXISTS cap_stated_m NUMERIC`)
      .then(() => sql`ALTER TABLE tapcard_adviser_links ADD COLUMN IF NOT EXISTS tier_confirmed BOOLEAN NOT NULL DEFAULT false`)
      .then(() => sql`ALTER TABLE tapcard_adviser_links ADD COLUMN IF NOT EXISTS covers_requested BOOLEAN NOT NULL DEFAULT false`)
      .then(() => sql`ALTER TABLE tapcard_adviser_links ADD COLUMN IF NOT EXISTS cover_status TEXT NOT NULL DEFAULT 'none'`)
      .then(() => sql`ALTER TABLE tapcard_adviser_links ADD COLUMN IF NOT EXISTS cover_started_at TIMESTAMPTZ`)
      .then(() => sql`ALTER TABLE tapcard_adviser_links ADD COLUMN IF NOT EXISTS committed_until TIMESTAMPTZ`)
      .then(() => sql`ALTER TABLE tapcard_adviser_links ADD COLUMN IF NOT EXISTS cover_ends_at TIMESTAMPTZ`)
      .then(() => sql`ALTER TABLE tapcard_adviser_links ADD COLUMN IF NOT EXISTS contract_ref TEXT`)
      .then(() => sql`ALTER TABLE tapcard_adviser_links ADD COLUMN IF NOT EXISTS contract_signed_at TIMESTAMPTZ`)
      .then(() => sql`ALTER TABLE tapcard_adviser_links ADD COLUMN IF NOT EXISTS contract_signed_by TEXT`)
      .then(() => sql`ALTER TABLE tapcard_adviser_links ADD COLUMN IF NOT EXISTS contract_url TEXT`)
      // The agreement record: an append-only ledger of what was agreed, by whom, who pays and who owns the data. Nothing here is edited or deleted.
      .then(() => sql`
        CREATE TABLE IF NOT EXISTS tapcard_adviser_agreements (
          id BIGSERIAL PRIMARY KEY,
          at TIMESTAMPTZ NOT NULL DEFAULT now(),
          org_id TEXT NOT NULL,
          adviser_id TEXT NOT NULL,
          link_id TEXT NOT NULL,
          event TEXT NOT NULL,
          actor TEXT NOT NULL,
          payer TEXT NOT NULL DEFAULT '',
          data_owner TEXT NOT NULL DEFAULT '',
          data_terms_version TEXT NOT NULL DEFAULT '',
          adviser_terms_version TEXT NOT NULL DEFAULT '',
          adviser_terms_accepted_at TIMESTAMPTZ,
          adviser_terms_accepted_by TEXT NOT NULL DEFAULT '',
          tier INT,
          monthly_pence INT,
          committed_until TIMESTAMPTZ,
          contract_ref TEXT NOT NULL DEFAULT '',
          detail JSONB NOT NULL DEFAULT '{}'::jsonb
        )
      `)
      .then(() => sql`CREATE INDEX IF NOT EXISTS tapcard_adviser_agreements_org ON tapcard_adviser_agreements (org_id, at DESC)`)
      .then(() => sql`
        CREATE TABLE IF NOT EXISTS tapcard_adviser_login_tokens (
          token_hash TEXT PRIMARY KEY,
          email TEXT NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          consumed_at TIMESTAMPTZ
        )
      `)
      .catch((e) => { ready = null; throw e; });
  }
  return ready;
}

const newId = () => crypto.randomBytes(12).toString("base64url");
const clean = (e: string) => e.trim().toLowerCase();

// ---- AIERT sets advisers up

export async function createAdviser(name: string, users: { email: string; name?: string; senior?: boolean }[]): Promise<string> {
  await ensureAdviserSchema();
  const id = newId();
  await sql`INSERT INTO tapcard_advisers (id, name) VALUES (${id}, ${name.trim()})`;
  for (const u of users) await sql`INSERT INTO tapcard_adviser_users (adviser_id, email, name, senior) VALUES (${id}, ${clean(u.email)}, ${u.name ?? ""}, ${u.senior === true}) ON CONFLICT DO NOTHING`;
  return id;
}

// ---- sign-in (single-use emailed link, then a signed cookie; separate from the company admin session)

export async function advisersForEmail(email: string): Promise<{ adviserId: string; name: string }[]> {
  await ensureAdviserSchema();
  return ((await sql`SELECT u.adviser_id, a.name FROM tapcard_adviser_users u JOIN tapcard_advisers a ON a.id = u.adviser_id WHERE u.email = ${clean(email)}`) as { adviser_id: string; name: string }[]).map((r) => ({ adviserId: r.adviser_id, name: r.name }));
}

export async function createAdviserLoginToken(email: string): Promise<string> {
  await ensureAdviserSchema();
  const token = crypto.randomBytes(32).toString("base64url");
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  await sql`INSERT INTO tapcard_adviser_login_tokens (token_hash, email, expires_at) VALUES (${hash}, ${clean(email)}, now() + interval '15 minutes')`;
  return token;
}
export async function recentAdviserTokens(email: string): Promise<number> {
  await ensureAdviserSchema();
  return Number(((await sql`SELECT count(*)::int AS n FROM tapcard_adviser_login_tokens WHERE email = ${clean(email)} AND expires_at > now() - interval '45 minutes'`) as { n: number }[])[0]?.n ?? 0);
}
export async function consumeAdviserLoginToken(token: string): Promise<string | null> {
  await ensureAdviserSchema();
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const r = (await sql`UPDATE tapcard_adviser_login_tokens SET consumed_at = now() WHERE token_hash = ${hash} AND expires_at > now() AND consumed_at IS NULL RETURNING email`) as { email: string }[];
  return r[0]?.email ?? null;
}

export function createAdviserCookie(email: string): string {
  const payload = `${Buffer.from(clean(email)).toString("base64url")}.${Date.now() + SESSION_TTL_MS}`;
  return `${payload}.${hmac(`adviser:${payload}`)}`;
}
export function verifyAdviserCookie(value: string | undefined): string | null {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [emailPart, exp, sig] = parts;
  const expected = Buffer.from(hmac(`adviser:${emailPart}.${exp}`));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  if (!Number.isFinite(Number(exp)) || Date.now() > Number(exp)) return null;
  try { return Buffer.from(emailPart, "base64url").toString("utf8"); } catch { return null; }
}

export interface AdviserSession { adviserId: string; adviserName: string; email: string; name: string; senior: boolean }

/// The signed-in adviser staff member, re-checked against the list on every request (removed people lose access at once).
export async function requireAdviser(): Promise<AdviserSession | null> {
  const email = verifyAdviserCookie((await cookies()).get(ADVISER_COOKIE)?.value);
  if (!email) return null;
  await ensureAdviserSchema();
  const r = (await sql`SELECT u.adviser_id, a.name AS adviser_name, u.name, u.senior FROM tapcard_adviser_users u JOIN tapcard_advisers a ON a.id = u.adviser_id WHERE u.email = ${email} ORDER BY u.created_at LIMIT 1`) as { adviser_id: string; adviser_name: string; name: string; senior: boolean }[];
  return r[0] ? { adviserId: r[0].adviser_id, adviserName: r[0].adviser_name, email, name: r[0].name, senior: r[0].senior === true } : null;
}

// ---- companies approve advisers

export interface LinkRow { id: string; adviserId: string; adviserName: string; orgId: string; orgName: string; status: string; canRegulatory: boolean; requestedBy: string; requestedAt: string; tier: number | null; capStatedM: number | null; tierConfirmed: boolean; coversRequested: boolean; coverStatus: string; coverStartedAt: string | null; committedUntil: string | null; coverEndsAt: string | null; contractRef: string | null; contractSignedAt: string | null; contractSignedBy: string | null; contractUrl: string | null }
const iso = (v: unknown): string | null => (v ? new Date(v as string).toISOString() : null);
const toLink = (r: Record<string, unknown>): LinkRow => ({ id: String(r.id), adviserId: String(r.adviser_id), adviserName: String(r.adviser_name ?? ""), orgId: String(r.org_id), orgName: String(r.org_name ?? ""), status: String(r.status), canRegulatory: r.can_regulatory === true, requestedBy: String(r.requested_by), requestedAt: new Date(r.requested_at as string).toISOString(),
  tier: r.tier == null ? null : Number(r.tier), capStatedM: r.cap_stated_m == null ? null : Number(r.cap_stated_m), tierConfirmed: r.tier_confirmed === true, coversRequested: r.covers_requested === true,
  coverStatus: String(r.cover_status ?? "none"), coverStartedAt: iso(r.cover_started_at), committedUntil: iso(r.committed_until), coverEndsAt: iso(r.cover_ends_at),
  contractRef: (r.contract_ref as string) ?? null, contractSignedAt: iso(r.contract_signed_at), contractSignedBy: (r.contract_signed_by as string) ?? null, contractUrl: (r.contract_url as string) ?? null });

/// Listed companies an adviser can ask to work with (name search only; nothing else about them is shown).
export async function findListedOrgs(q: string, limit = 8): Promise<{ orgId: string; name: string }[]> {
  const term = q.trim();
  if (term.length < 2) return [];
  await ensureAdviserSchema();
  const like = `%${term.replace(/[%_]/g, "")}%`;
  return ((await sql`
    SELECT DISTINCT o.id, o.name FROM tapcard_biz_orgs o
    JOIN tapcard_cards c ON c.org_id = o.id JOIN tapcard_listed_cards l ON l.card_id = c.id
    WHERE o.name ILIKE ${like} ORDER BY o.name LIMIT ${limit}`) as { id: string; name: string }[]).map((r) => ({ orgId: r.id, name: r.name }));
}

export async function requestLink(adviserId: string, orgId: string, requestedBy: string, opts: { capM?: number; covers?: boolean } = {}): Promise<{ ok: true; linkId: string; created: boolean } | { ok: false; error: string }> {
  await ensureAdviserSchema();
  const listed = ((await sql`SELECT 1 FROM tapcard_cards c JOIN tapcard_listed_cards l ON l.card_id = c.id WHERE c.org_id = ${orgId} LIMIT 1`) as unknown[]).length > 0;
  if (!listed) return { ok: false, error: "That company isn't set up for investor relations on TapCard." };
  const other = (await sql`SELECT 1 FROM tapcard_adviser_links WHERE org_id = ${orgId} AND status = 'approved' AND adviser_id <> ${adviserId} LIMIT 1`) as unknown[];
  if (other.length) return { ok: false, error: "This company already works with an adviser. A company can have only one at a time, so it has to remove that adviser first." };
  const ex = (await sql`SELECT id, status FROM tapcard_adviser_links WHERE adviser_id = ${adviserId} AND org_id = ${orgId}`) as { id: string; status: string }[];
  if (ex[0]) {
    if (ex[0].status === "pending" || ex[0].status === "approved") return { ok: true, linkId: ex[0].id, created: false };
    // A company that declined or revoked is not asked again by a click: the adviser contacts it directly, or AIERT helps.
    return { ok: false, error: "This company has already answered that request. Please speak to the company directly." };
  }
  const id = newId();
  const cap = Number.isFinite(opts.capM) && (opts.capM as number) > 0 ? (opts.capM as number) : null;
  const tier = cap === null ? null : (await import("@/lib/tapcardAdviserPricing")).tierForMarketCap(cap).tier;
  await sql`INSERT INTO tapcard_adviser_links (id, adviser_id, org_id, requested_by, cap_stated_m, tier, covers_requested) VALUES (${id}, ${adviserId}, ${orgId}, ${clean(requestedBy)}, ${cap}, ${tier}, ${opts.covers === true})`;
  return { ok: true, linkId: id, created: true };
}

export async function linksForAdviser(adviserId: string): Promise<LinkRow[]> {
  await ensureAdviserSchema();
  return ((await sql`SELECT l.*, a.name AS adviser_name, o.name AS org_name FROM tapcard_adviser_links l JOIN tapcard_advisers a ON a.id = l.adviser_id JOIN tapcard_biz_orgs o ON o.id = l.org_id WHERE l.adviser_id = ${adviserId} ORDER BY o.name`) as Record<string, unknown>[]).map(toLink);
}
export async function linksForOrg(orgId: string): Promise<LinkRow[]> {
  await ensureAdviserSchema();
  return ((await sql`SELECT l.*, a.name AS adviser_name, o.name AS org_name FROM tapcard_adviser_links l JOIN tapcard_advisers a ON a.id = l.adviser_id JOIN tapcard_biz_orgs o ON o.id = l.org_id WHERE l.org_id = ${orgId} AND l.status <> 'declined' ORDER BY l.requested_at`) as Record<string, unknown>[]).map(toLink);
}
export async function getLink(linkId: string): Promise<LinkRow | null> {
  await ensureAdviserSchema();
  const r = (await sql`SELECT l.*, a.name AS adviser_name, o.name AS org_name FROM tapcard_adviser_links l JOIN tapcard_advisers a ON a.id = l.adviser_id JOIN tapcard_biz_orgs o ON o.id = l.org_id WHERE l.id = ${linkId}`) as Record<string, unknown>[];
  return r[0] ? toLink(r[0]) : null;
}
/// An adviser's approved link to a company (the only thing that gives access).
export async function approvedLink(adviserId: string, orgId: string): Promise<LinkRow | null> {
  const rows = (await linksForAdviser(adviserId)).filter((l) => l.orgId === orgId && l.status === "approved");
  return rows[0] ?? null;
}

/// The company's decision, made by its own signed-in senior admin (the caller checks that). Decides a pending request only.
export async function decideLink(orgId: string, linkId: string, approve: boolean, by: string): Promise<boolean> {
  await ensureAdviserSchema();
  const r = (await sql`UPDATE tapcard_adviser_links SET status = ${approve ? "approved" : "declined"}, decided_by = ${clean(by)}, decided_at = now() WHERE id = ${linkId} AND org_id = ${orgId} AND status = 'pending' RETURNING id`) as unknown[];
  return r.length > 0;
}
export async function setLinkRegulatory(orgId: string, linkId: string, on: boolean): Promise<boolean> {
  await ensureAdviserSchema();
  return ((await sql`UPDATE tapcard_adviser_links SET can_regulatory = ${on} WHERE id = ${linkId} AND org_id = ${orgId} AND status = 'approved' RETURNING id`) as unknown[]).length > 0;
}
export async function revokeLink(orgId: string, linkId: string, by: string): Promise<boolean> {
  await ensureAdviserSchema();
  return ((await sql`UPDATE tapcard_adviser_links SET status = 'revoked', can_regulatory = false, decided_by = ${clean(by)}, decided_at = now() WHERE id = ${linkId} AND org_id = ${orgId} AND status IN ('approved','pending') RETURNING id`) as unknown[]).length > 0;
}

/// Adviser staff who may approve a regulatory headline for this company: senior staff of advisers the company allowed regulatory news for.
export async function adviserApproverEmails(orgId: string): Promise<string[]> {
  await ensureAdviserSchema();
  return ((await sql`SELECT u.email FROM tapcard_adviser_links l JOIN tapcard_adviser_users u ON u.adviser_id = l.adviser_id WHERE l.org_id = ${orgId} AND l.status = 'approved' AND l.can_regulatory AND u.senior`) as { email: string }[]).map((r) => r.email);
}

/// The adviser a company currently works with (a company can have only one at a time).
export async function approvedLinkForOrg(orgId: string): Promise<LinkRow | null> {
  await ensureAdviserSchema();
  const r = (await sql`SELECT l.*, a.name AS adviser_name, o.name AS org_name FROM tapcard_adviser_links l JOIN tapcard_advisers a ON a.id = l.adviser_id JOIN tapcard_biz_orgs o ON o.id = l.org_id WHERE l.org_id = ${orgId} AND l.status = 'approved' LIMIT 1`) as Record<string, unknown>[];
  return r[0] ? toLink(r[0]) : null;
}

// ---- the agreement record

export interface AgreementEntry { orgId: string; adviserId: string; linkId: string; event: string; actor: string; payer?: string; dataOwner?: string; dataTermsVersion?: string; adviserTermsVersion?: string; adviserTermsAcceptedAt?: Date | null; adviserTermsAcceptedBy?: string; tier?: number | null; monthlyPence?: number | null; committedUntil?: Date | string | null; contractRef?: string; detail?: Record<string, unknown> }
export async function recordAgreement(e: AgreementEntry): Promise<void> {
  await ensureAdviserSchema();
  await sql`INSERT INTO tapcard_adviser_agreements (org_id, adviser_id, link_id, event, actor, payer, data_owner, data_terms_version, adviser_terms_version, adviser_terms_accepted_at, adviser_terms_accepted_by, tier, monthly_pence, committed_until, contract_ref, detail)
    VALUES (${e.orgId}, ${e.adviserId}, ${e.linkId}, ${e.event}, ${e.actor}, ${e.payer ?? ""}, ${e.dataOwner ?? ""}, ${e.dataTermsVersion ?? ""}, ${e.adviserTermsVersion ?? ""}, ${e.adviserTermsAcceptedAt ?? null}, ${e.adviserTermsAcceptedBy ?? ""}, ${e.tier ?? null}, ${e.monthlyPence ?? null}, ${e.committedUntil ? new Date(e.committedUntil) : null}, ${e.contractRef ?? ""}, ${JSON.stringify(e.detail ?? {})}::jsonb)`;
}
export interface AgreementRow { id: number; at: string; adviserName: string; event: string; actor: string; payer: string; dataOwner: string; dataTermsVersion: string; adviserTermsVersion: string; adviserTermsAcceptedAt: string | null; adviserTermsAcceptedBy: string; tier: number | null; monthlyPence: number | null; committedUntil: string | null; contractRef: string; detail: Record<string, unknown> }
export async function listAgreement(orgId: string, limit = 100): Promise<AgreementRow[]> {
  await ensureAdviserSchema();
  const rows = (await sql`SELECT g.*, a.name AS adviser_name FROM tapcard_adviser_agreements g JOIN tapcard_advisers a ON a.id = g.adviser_id WHERE g.org_id = ${orgId} ORDER BY g.id DESC LIMIT ${limit}`) as Record<string, unknown>[];
  return rows.map((r) => ({ id: Number(r.id), at: new Date(r.at as string).toISOString(), adviserName: String(r.adviser_name), event: String(r.event), actor: String(r.actor), payer: String(r.payer), dataOwner: String(r.data_owner), dataTermsVersion: String(r.data_terms_version), adviserTermsVersion: String(r.adviser_terms_version),
    adviserTermsAcceptedAt: iso(r.adviser_terms_accepted_at), adviserTermsAcceptedBy: String(r.adviser_terms_accepted_by), tier: r.tier == null ? null : Number(r.tier), monthlyPence: r.monthly_pence == null ? null : Number(r.monthly_pence), committedUntil: iso(r.committed_until), contractRef: String(r.contract_ref), detail: (r.detail as Record<string, unknown>) ?? {} }));
}
