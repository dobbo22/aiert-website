// Billing for advisers (IR firms and brokers who pay AIERT for the companies they cover). This is its own model: it does NOT use
// TapCard for Business's per-location plan, its Stripe price, its webhook or its org billing fields. It lives in the adviser tables
// (tapcard_advisers / tapcard_adviser_links), has its own Stripe prices (one per market-cap tier) and its own webhook.
//
// How it works: one company is free for 30 days. The adviser then accepts the terms and pays by card; Checkout stores the card and the
// first charge falls on day 30. After that the subscription holds one line per tier in use (quantity = companies in that tier), and adding
// a company is prorated. Each company is committed for 6 months from the day it is added; ending cover earlier only takes effect at the end
// of that term. A company a paying adviser covers is "covered" (see adviserCoverActive) and keeps working; when cover ends or lapses it
// gets a 30-day grace period to take over its own billing. Nothing is ever deleted because of billing.
import sql from "@/lib/db";
import { ensureAdviserSchema, getLink, recordAgreement, type LinkRow } from "@/lib/tapcardAdvisers";
import { DATA_TERMS_VERSION, ADVISER_TERMS_VERSION, ADVISER_TRIAL_DAYS, COVER_GRACE_DAYS, MIN_TERM_MONTHS, TRIAL_REMINDER_DAYS_BEFORE, monthlyTotalPence, tierByNumber, tierPriceId, tierQuantities } from "@/lib/tapcardAdviserPricing";

const DAY = 86_400_000;
const addMonths = (d: Date, n: number) => { const x = new Date(d); x.setUTCMonth(x.getUTCMonth() + n); return x; };

// ---- the pieces of Stripe this uses (so tests can stand in for Stripe)
export interface SubLike { id: string; status: string; trial_end?: number | null; items: { data: { id: string; price: { id: string }; quantity?: number | null; current_period_end: number }[] } }
export interface StripeLike {
  customers: { create(p: Record<string, unknown>): Promise<{ id: string }> };
  checkout: { sessions: { create(p: Record<string, unknown>): Promise<{ id: string; url: string | null }> } };
  subscriptions: { retrieve(id: string): Promise<SubLike>; update(id: string, p: Record<string, unknown>): Promise<unknown> };
  billingPortal: { sessions: { create(p: Record<string, unknown>): Promise<{ url: string }> } };
}
async function realStripe(): Promise<StripeLike> { return (await import("@/lib/tapcardBizBilling")).stripe() as unknown as StripeLike; }

export interface AdviserRow {
  id: string; name: string; billingStatus: string; trialOrgId: string | null; trialEndsAt: Date | null; trialRemindedAt: Date | null;
  stripeCustomerId: string | null; stripeSubscriptionId: string | null; paidThrough: Date | null;
  termsVersion: string | null; termsAcceptedAt: Date | null; termsAcceptedBy: string | null;
}
const d = (v: unknown) => (v ? new Date(v as string) : null);
const toAdviser = (r: Record<string, unknown>): AdviserRow => ({
  id: String(r.id), name: String(r.name), billingStatus: String(r.billing_status ?? "trial"), trialOrgId: (r.trial_org_id as string) ?? null, trialEndsAt: d(r.trial_ends_at), trialRemindedAt: d(r.trial_reminded_at),
  stripeCustomerId: (r.stripe_customer_id as string) ?? null, stripeSubscriptionId: (r.stripe_subscription_id as string) ?? null, paidThrough: d(r.paid_through),
  termsVersion: (r.terms_version as string) ?? null, termsAcceptedAt: d(r.terms_accepted_at), termsAcceptedBy: (r.terms_accepted_by as string) ?? null,
});
export async function getAdviserBilling(adviserId: string): Promise<AdviserRow | null> {
  await ensureAdviserSchema();
  const r = (await sql`SELECT * FROM tapcard_advisers WHERE id = ${adviserId}`) as Record<string, unknown>[];
  return r[0] ? toAdviser(r[0]) : null;
}

// ---- is a company covered right now?

/// When cover for this company runs out (null = not covered). Pure, so it can be tested against any date.
export function coverDeadline(link: Pick<LinkRow, "orgId" | "coverStatus" | "coverEndsAt">, adviser: Pick<AdviserRow, "billingStatus" | "trialOrgId" | "trialEndsAt" | "paidThrough">, now = Date.now()): number | null {
  if (link.coverStatus !== "active" && link.coverStatus !== "ending" && link.coverStatus !== "ended") return null;
  const endsAt = link.coverEndsAt ? new Date(link.coverEndsAt).getTime() : null;
  // Cover that has ended: the company keeps working for the grace period so it can take over its own billing.
  if (link.coverStatus === "ended" || (endsAt !== null && endsAt <= now)) return endsAt === null ? null : endsAt + COVER_GRACE_DAYS * DAY;
  const paid = adviser.paidThrough ? adviser.paidThrough.getTime() : null;
  if (adviser.billingStatus === "active" && paid !== null) return paid + 3 * DAY; // a few days of slack for the renewal to be recorded
  if ((adviser.billingStatus === "past_due" || adviser.billingStatus === "canceled") && paid !== null) return paid + COVER_GRACE_DAYS * DAY;
  if (adviser.billingStatus === "trial" && adviser.trialOrgId === link.orgId && adviser.trialEndsAt) return adviser.trialEndsAt.getTime(); // the trial company, no grace
  return null;
}

/// True when an adviser's cover currently keeps this company's headline posting switched on.
export async function adviserCoverActive(orgId: string, now = Date.now()): Promise<boolean> {
  await ensureAdviserSchema();
  const rows = (await sql`
    SELECT l.org_id, l.cover_status, l.cover_ends_at, a.billing_status, a.trial_org_id, a.trial_ends_at, a.paid_through
    FROM tapcard_adviser_links l JOIN tapcard_advisers a ON a.id = l.adviser_id
    WHERE l.org_id = ${orgId} AND l.status = 'approved' AND l.cover_status IN ('active','ending','ended')`) as Record<string, unknown>[];
  return rows.some((r) => {
    const until = coverDeadline({ orgId, coverStatus: String(r.cover_status), coverEndsAt: r.cover_ends_at ? new Date(r.cover_ends_at as string).toISOString() : null },
      { billingStatus: String(r.billing_status), trialOrgId: (r.trial_org_id as string) ?? null, trialEndsAt: d(r.trial_ends_at), paidThrough: d(r.paid_through) }, now);
    return until !== null && until > now;
  });
}

/// Who covers a company right now (for the company's Advisers panel).
export async function coverInfoForOrg(orgId: string): Promise<{ linkId: string; adviserName: string; until: string | null; ending: boolean }[]> {
  await ensureAdviserSchema();
  const rows = (await sql`
    SELECT l.id, l.org_id, l.cover_status, l.cover_ends_at, a.name, a.billing_status, a.trial_org_id, a.trial_ends_at, a.paid_through
    FROM tapcard_adviser_links l JOIN tapcard_advisers a ON a.id = l.adviser_id
    WHERE l.org_id = ${orgId} AND l.status = 'approved' AND l.cover_status IN ('active','ending')`) as Record<string, unknown>[];
  return rows.map((r) => {
    const until = coverDeadline({ orgId, coverStatus: String(r.cover_status), coverEndsAt: r.cover_ends_at ? new Date(r.cover_ends_at as string).toISOString() : null },
      { billingStatus: String(r.billing_status), trialOrgId: (r.trial_org_id as string) ?? null, trialEndsAt: d(r.trial_ends_at), paidThrough: d(r.paid_through) });
    return { linkId: String(r.id), adviserName: String(r.name), until: until ? new Date(until).toISOString() : null, ending: r.cover_status === "ending" };
  });
}

// ---- starting and ending cover

export type CoverResult = { ok: true } | { ok: false; error: string };

/// The company has accepted that the adviser pays. The adviser must be able to cover it: its trial company, or any company once it has paid.
export async function activateCover(linkId: string, now = new Date(), api?: StripeLike): Promise<CoverResult> {
  const link = await getLink(linkId);
  if (!link || link.status !== "approved") return { ok: false, error: "That adviser isn't approved." };
  if (link.coverStatus === "active" || link.coverStatus === "ending") return { ok: true };
  if (link.tier == null) return { ok: false, error: "This company's size band hasn't been set yet, so the adviser can't cover it. The adviser should state the company's market cap." };
  const a = await getAdviserBilling(link.adviserId);
  if (!a) return { ok: false, error: "No such adviser." };
  if (a.billingStatus === "trial") {
    if (a.trialOrgId && a.trialOrgId !== link.orgId) return { ok: false, error: `${a.name} is still on its free trial, which covers one company. It needs to sign and pay before it can cover another.` };
    if (!a.trialOrgId) await sql`UPDATE tapcard_advisers SET trial_org_id = ${link.orgId}, trial_ends_at = ${new Date(now.getTime() + ADVISER_TRIAL_DAYS * DAY)} WHERE id = ${a.id} AND trial_org_id IS NULL`;
    if (a.trialEndsAt && a.trialEndsAt.getTime() < now.getTime()) return { ok: false, error: `${a.name}'s free trial has ended. It needs to sign and pay first.` };
  } else if (a.billingStatus !== "active") {
    return { ok: false, error: `${a.name}'s account isn't in good standing, so it can't cover another company right now.` };
  }
  await sql`UPDATE tapcard_adviser_links SET cover_status = 'active', cover_started_at = ${now}, committed_until = ${addMonths(now, MIN_TERM_MONTHS)}, cover_ends_at = NULL WHERE id = ${linkId}`;
  if (a.billingStatus === "active") await syncAdviserSubscription(a.id, api).catch((e) => console.error("adviser subscription sync failed:", e));
  return { ok: true };
}

/// Cover ends: now if the 6-month term is over, otherwise when it is. Billing carries on until then.
export async function endCover(linkId: string, now = new Date()): Promise<{ ok: true; endsAt: Date } | { ok: false; error: string }> {
  const link = await getLink(linkId);
  if (!link || (link.coverStatus !== "active" && link.coverStatus !== "ending")) return { ok: false, error: "That company isn't being covered." };
  const committed = link.committedUntil ? new Date(link.committedUntil) : now;
  const endsAt = committed.getTime() > now.getTime() ? committed : now;
  await sql`UPDATE tapcard_adviser_links SET cover_status = 'ending', cover_ends_at = ${endsAt} WHERE id = ${linkId}`;
  return { ok: true, endsAt };
}

/// A company's tier is set by AIERT (it holds no market data: the adviser states a cap, AIERT checks it). Changes apply to the next sync.
export async function setLinkTier(linkId: string, tier: number): Promise<boolean> {
  if (!tierByNumber(tier)) return false;
  await ensureAdviserSchema();
  return ((await sql`UPDATE tapcard_adviser_links SET tier = ${tier}, tier_confirmed = true WHERE id = ${linkId} RETURNING id`) as unknown[]).length > 0;
}

// ---- the subscription

/// Companies still being billed (active, or ending but inside the committed term), by tier.
async function billedTiers(adviserId: string): Promise<number[]> {
  await ensureAdviserSchema();
  return ((await sql`SELECT tier FROM tapcard_adviser_links WHERE adviser_id = ${adviserId} AND status IN ('approved','revoked') AND cover_status IN ('active','ending') AND tier IS NOT NULL`) as { tier: number }[]).map((r) => Number(r.tier));
}

export interface CoverSummary { orgId: string; orgName: string; tier: number | null; tierLabel: string; monthlyPence: number; committedUntil: string | null; coverStatus: string; coverEndsAt: string | null; tierConfirmed: boolean }
export async function adviserSummary(adviserId: string): Promise<{ adviser: AdviserRow; covers: CoverSummary[]; monthlyPence: number; trialDaysLeft: number | null }> {
  await ensureAdviserSchema();
  const adviser = (await getAdviserBilling(adviserId))!;
  const rows = (await sql`SELECT l.*, o.name AS org_name FROM tapcard_adviser_links l JOIN tapcard_biz_orgs o ON o.id = l.org_id WHERE l.adviser_id = ${adviserId} AND l.cover_status IN ('active','ending') ORDER BY o.name`) as Record<string, unknown>[];
  const covers = rows.map((r) => {
    const t = r.tier == null ? undefined : tierByNumber(Number(r.tier));
    return { orgId: String(r.org_id), orgName: String(r.org_name), tier: r.tier == null ? null : Number(r.tier), tierLabel: t?.label ?? "Not set", monthlyPence: t?.monthlyPence ?? 0,
      committedUntil: r.committed_until ? new Date(r.committed_until as string).toISOString() : null, coverStatus: String(r.cover_status), coverEndsAt: r.cover_ends_at ? new Date(r.cover_ends_at as string).toISOString() : null, tierConfirmed: r.tier_confirmed === true };
  });
  const trialDaysLeft = adviser.billingStatus === "trial" && adviser.trialEndsAt ? Math.max(0, Math.ceil((adviser.trialEndsAt.getTime() - Date.now()) / DAY)) : null;
  return { adviser, covers, monthlyPence: monthlyTotalPence(covers.map((c) => c.tier ?? 0)), trialDaysLeft };
}

/// Makes the Stripe subscription's lines match the companies being billed (one line per tier, prorated when changed).
export async function syncAdviserSubscription(adviserId: string, api?: StripeLike): Promise<void> {
  const a = await getAdviserBilling(adviserId);
  if (!a?.stripeSubscriptionId) return;
  const stripe = api ?? (await realStripe());
  const want = tierQuantities(await billedTiers(adviserId));
  const sub = await stripe.subscriptions.retrieve(a.stripeSubscriptionId);
  const byPrice = new Map(sub.items.data.map((i) => [i.price.id, i]));
  const items: Record<string, unknown>[] = [];
  for (let n = 1; n <= 8; n++) {
    const price = tierPriceId(n);
    const qty = want[n] ?? 0;
    const have = price ? byPrice.get(price) : undefined;
    if (qty > 0 && !price) throw new Error(`Stripe price for tier ${n} is not configured`);
    if (!price) continue;
    if (have && qty === 0) items.push({ id: have.id, deleted: true });
    else if (have && (have.quantity ?? 0) !== qty) items.push({ id: have.id, quantity: qty });
    else if (!have && qty > 0) items.push({ price, quantity: qty });
  }
  const total = Object.values(want).reduce((x, y) => x + y, 0);
  if (total === 0) { await stripe.subscriptions.update(a.stripeSubscriptionId, { cancel_at_period_end: true }); return; }
  if (items.length) await stripe.subscriptions.update(a.stripeSubscriptionId, { items, proration_behavior: "create_prorations", cancel_at_period_end: false });
}

export async function acceptTerms(adviserId: string, by: string): Promise<void> {
  await ensureAdviserSchema();
  await sql`UPDATE tapcard_advisers SET terms_version = ${ADVISER_TERMS_VERSION}, terms_accepted_at = now(), terms_accepted_by = ${by.toLowerCase()} WHERE id = ${adviserId}`;
}

/// Stripe Checkout for the adviser: card stored now, first charge on the last day of the trial (or at once if less than 2 days are left, which
/// Checkout requires). The terms must have been accepted first.
export async function createAdviserCheckout(adviserId: string, email: string, origin: string, api?: StripeLike): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const a = await getAdviserBilling(adviserId);
  if (!a) return { ok: false, error: "No such adviser." };
  if (a.billingStatus === "active") return { ok: false, error: "Your subscription is already active." };
  if (!a.termsAcceptedAt || a.termsVersion !== ADVISER_TERMS_VERSION) return { ok: false, error: "Please accept the adviser terms first." };
  const tiers = await billedTiers(adviserId);
  if (!tiers.length) return { ok: false, error: "There is no company to cover yet. Ask a company to approve you and accept your cover first." };
  const want = tierQuantities(tiers);
  const lines = Object.entries(want).map(([n, qty]) => ({ price: tierPriceId(Number(n)), quantity: qty }));
  if (lines.some((l) => !l.price)) return { ok: false, error: "Adviser plans are not open yet. Email enquiries@aiert.co.uk." };
  const stripe = api ?? (await realStripe());
  let customer = a.stripeCustomerId;
  if (!customer) {
    customer = (await stripe.customers.create({ email, name: a.name, metadata: { adviser_id: a.id } })).id;
    await sql`UPDATE tapcard_advisers SET stripe_customer_id = ${customer} WHERE id = ${a.id}`;
  }
  const trialEnd = a.trialEndsAt && a.trialEndsAt.getTime() > Date.now() + 49 * 3_600_000 ? Math.floor(a.trialEndsAt.getTime() / 1000) : undefined;
  const taxRate = process.env.TAPCARD_BIZ_TAX_RATE_ID;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: a.id,
    line_items: lines,
    payment_method_collection: "always",
    subscription_data: { metadata: { adviser_id: a.id }, ...(trialEnd ? { trial_end: trialEnd } : {}), ...(taxRate ? { default_tax_rates: [taxRate] } : {}) },
    metadata: { adviser_id: a.id },
    success_url: `${origin}/business/adviser?paid=1`,
    cancel_url: `${origin}/business/adviser`,
  });
  return session.url ? { ok: true, url: session.url } : { ok: false, error: "Couldn't start the payment page. Try again." };
}

export async function createAdviserPortal(adviserId: string, origin: string, api?: StripeLike): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const a = await getAdviserBilling(adviserId);
  if (!a?.stripeCustomerId) return { ok: false, error: "There is no payment method on file yet." };
  const stripe = api ?? (await realStripe());
  // A dedicated portal configuration (payment method and invoices only): the adviser can't change quantities or cancel there, because
  // those follow the companies it covers and the 6-month term.
  const configuration = process.env.TAPCARD_ADVISER_PORTAL_CONFIG;
  if (!configuration) return { ok: false, error: "The payment portal isn't set up yet. Email enquiries@aiert.co.uk." };
  const s = await stripe.billingPortal.sessions.create({ customer: a.stripeCustomerId, configuration, return_url: `${origin}/business/adviser` });
  return { ok: true, url: s.url };
}

// ---- Stripe events (the adviser webhook)

const periodEndMs = (sub: SubLike) => (sub.status === "trialing" && sub.trial_end ? sub.trial_end : (sub.items.data[0]?.current_period_end ?? 0)) * 1000;

export async function applySubscription(sub: SubLike): Promise<boolean> {
  await ensureAdviserSchema();
  const rows = (await sql`SELECT id FROM tapcard_advisers WHERE stripe_subscription_id = ${sub.id}`) as { id: string }[];
  if (!rows[0]) return false;
  const status = sub.status === "active" || sub.status === "trialing" ? "active" : sub.status === "past_due" || sub.status === "unpaid" ? "past_due" : "canceled";
  await sql`UPDATE tapcard_advisers SET billing_status = ${status}, paid_through = ${new Date(periodEndMs(sub))} WHERE id = ${rows[0].id}`;
  return true;
}

export async function applyCheckoutCompleted(adviserId: string, customerId: string | null, sub: SubLike): Promise<void> {
  await ensureAdviserSchema();
  await sql`UPDATE tapcard_advisers SET stripe_subscription_id = ${sub.id}, stripe_customer_id = COALESCE(${customerId}, stripe_customer_id), billing_status = 'active', paid_through = ${new Date(periodEndMs(sub))} WHERE id = ${adviserId}`;
}

// ---- the daily job

/// Ends covers whose committed term is over and finds advisers due the day-16 reminder. The caller sends the emails.
export async function runAdviserDaily(now = new Date(), api?: StripeLike): Promise<{ ended: number; reminders: { adviserId: string; name: string; trialEndsAt: Date }[] }> {
  await ensureAdviserSchema();
  const due = (await sql`SELECT id, adviser_id FROM tapcard_adviser_links WHERE cover_status = 'ending' AND cover_ends_at <= ${now}`) as { id: string; adviser_id: string }[];
  for (const l of due) await sql`UPDATE tapcard_adviser_links SET cover_status = 'ended' WHERE id = ${l.id}`;
  for (const id of new Set(due.map((l) => l.adviser_id))) await syncAdviserSubscription(id, api).catch((e) => console.error("adviser subscription sync failed:", e));
  const cutoff = new Date(now.getTime() + TRIAL_REMINDER_DAYS_BEFORE * DAY);
  const rem = (await sql`SELECT id, name, trial_ends_at FROM tapcard_advisers WHERE billing_status = 'trial' AND trial_ends_at IS NOT NULL AND trial_reminded_at IS NULL AND trial_ends_at <= ${cutoff} AND trial_ends_at > ${now}`) as { id: string; name: string; trial_ends_at: string }[];
  return { ended: due.length, reminders: rem.map((r) => ({ adviserId: r.id, name: r.name, trialEndsAt: new Date(r.trial_ends_at) })) };
}
export async function markReminded(adviserId: string): Promise<void> {
  await ensureAdviserSchema();
  await sql`UPDATE tapcard_advisers SET trial_reminded_at = now() WHERE id = ${adviserId}`;
}

/// Writes one line of the agreement record for a company and adviser: what happened, who did it, who pays, who owns the data, which terms
/// were in force and the contract reference. Never throws (a failed record must not undo what the person did, but it is logged loudly).
export async function recordAgreementEvent(linkId: string, event: string, actor: string, detail: Record<string, unknown> = {}): Promise<void> {
  try {
    const link = await getLink(linkId);
    if (!link) return;
    const a = await getAdviserBilling(link.adviserId);
    const org = ((await sql`SELECT name FROM tapcard_biz_orgs WHERE id = ${link.orgId}`) as { name: string }[])[0];
    const t = link.tier == null ? undefined : tierByNumber(link.tier);
    const covered = link.coverStatus === "active" || link.coverStatus === "ending";
    await recordAgreement({
      orgId: link.orgId, adviserId: link.adviserId, linkId, event, actor,
      payer: covered ? "adviser" : "company", dataOwner: org?.name ?? link.orgName, dataTermsVersion: DATA_TERMS_VERSION,
      adviserTermsVersion: a?.termsVersion ?? "", adviserTermsAcceptedAt: a?.termsAcceptedAt ?? null, adviserTermsAcceptedBy: a?.termsAcceptedBy ?? "",
      tier: link.tier, monthlyPence: covered ? t?.monthlyPence ?? null : null, committedUntil: link.committedUntil, contractRef: link.contractRef ?? "",
      detail: { regulatoryAllowed: link.canRegulatory, coverStatus: link.coverStatus, ...detail },
    });
  } catch (e) { console.error("AGREEMENT RECORD FAILED", event, linkId, e); }
}
