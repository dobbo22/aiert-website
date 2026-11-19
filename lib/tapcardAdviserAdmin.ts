// AIERT's own view of advisers: who they are, what they pay, which companies they cover, and which tiers still need checking.
// Admin screen: /admin/social/advisers. Changes here are AIERT's (set up advisers and staff, set a company's tier, extend a trial).
import sql from "@/lib/db";
import { ensureAdviserSchema, getLink } from "@/lib/tapcardAdvisers";
import { coverDeadline, recordAgreementEvent, setLinkTier, type AdviserRow } from "@/lib/tapcardAdviserBilling";
import { monthlyTotalPence, poundsPerMonth, tierByNumber, tierForMarketCap } from "@/lib/tapcardAdviserPricing";
import { audit } from "@/lib/tapcardNewsPolicy";

const iso = (v: unknown): string | null => (v ? new Date(v as string).toISOString() : null);

export interface AdminLink { linkId: string; orgId: string; orgName: string; status: string; canRegulatory: boolean; coverStatus: string; tier: number | null; tierLabel: string; capStatedM: number | null; suggestedTier: number | null; tierConfirmed: boolean; monthlyPence: number; committedUntil: string | null; coverEndsAt: string | null; requestedBy: string; requestedAt: string; covered: boolean; contractRef: string | null; contractSignedAt: string | null; contractSignedBy: string | null; contractUrl: string | null }
export interface AdminAdviser {
  id: string; name: string; billingStatus: string; trialOrgName: string | null; trialEndsAt: string | null; paidThrough: string | null; stripeCustomer: boolean; stripeSubscription: string | null;
  termsAcceptedAt: string | null; termsAcceptedBy: string | null; termsVersion: string | null; createdAt: string;
  users: { email: string; name: string; senior: boolean }[]; links: AdminLink[]; monthlyPence: number; coveredCount: number; tiersToCheck: number;
}
export interface WhoPays { orgId: string; orgName: string; payer: string; detail: string }
export interface AdviserOverview { advisers: AdminAdviser[]; whoPays: WhoPays[]; totals: { advisers: number; active: number; trial: number; covered: number; mrrPence: number; tiersToCheck: number } }

export async function adviserOverview(now = Date.now()): Promise<AdviserOverview> {
  await ensureAdviserSchema();
  const advs = (await sql`SELECT * FROM tapcard_advisers ORDER BY created_at DESC`) as Record<string, unknown>[];
  const users = (await sql`SELECT adviser_id, email, name, senior FROM tapcard_adviser_users ORDER BY created_at`) as { adviser_id: string; email: string; name: string; senior: boolean }[];
  const links = (await sql`SELECT l.*, o.name AS org_name FROM tapcard_adviser_links l JOIN tapcard_biz_orgs o ON o.id = l.org_id ORDER BY o.name`) as Record<string, unknown>[];
  const orgNames = new Map<string, string>(links.map((l) => [String(l.org_id), String(l.org_name)]));

  const out: AdminAdviser[] = advs.map((a) => {
    const row: Pick<AdviserRow, "billingStatus" | "trialOrgId" | "trialEndsAt" | "paidThrough"> = {
      billingStatus: String(a.billing_status ?? "trial"), trialOrgId: (a.trial_org_id as string) ?? null,
      trialEndsAt: a.trial_ends_at ? new Date(a.trial_ends_at as string) : null, paidThrough: a.paid_through ? new Date(a.paid_through as string) : null,
    };
    const mine = links.filter((l) => l.adviser_id === a.id).map((l): AdminLink => {
      const t = l.tier == null ? undefined : tierByNumber(Number(l.tier));
      const cap = l.cap_stated_m == null ? null : Number(l.cap_stated_m);
      const until = coverDeadline({ orgId: String(l.org_id), coverStatus: String(l.cover_status), coverEndsAt: iso(l.cover_ends_at) }, row, now);
      const billed = l.cover_status === "active" || l.cover_status === "ending";
      return {
        linkId: String(l.id), orgId: String(l.org_id), orgName: String(l.org_name), status: String(l.status), canRegulatory: l.can_regulatory === true, coverStatus: String(l.cover_status),
        tier: l.tier == null ? null : Number(l.tier), tierLabel: t?.label ?? "Not set", capStatedM: cap, suggestedTier: cap && cap > 0 ? tierForMarketCap(cap).tier : null, tierConfirmed: l.tier_confirmed === true,
        monthlyPence: billed ? t?.monthlyPence ?? 0 : 0, committedUntil: iso(l.committed_until), coverEndsAt: iso(l.cover_ends_at), requestedBy: String(l.requested_by), requestedAt: iso(l.requested_at) ?? "",
        covered: until !== null && until > now,
        contractRef: (l.contract_ref as string) ?? null, contractSignedAt: iso(l.contract_signed_at), contractSignedBy: (l.contract_signed_by as string) ?? null, contractUrl: (l.contract_url as string) ?? null,
      };
    });
    const billedLinks = mine.filter((l) => l.coverStatus === "active" || l.coverStatus === "ending");
    return {
      id: String(a.id), name: String(a.name), billingStatus: row.billingStatus, trialOrgName: row.trialOrgId ? orgNames.get(row.trialOrgId) ?? row.trialOrgId : null, trialEndsAt: iso(a.trial_ends_at), paidThrough: iso(a.paid_through),
      stripeCustomer: !!a.stripe_customer_id, stripeSubscription: (a.stripe_subscription_id as string) ?? null, termsAcceptedAt: iso(a.terms_accepted_at), termsAcceptedBy: (a.terms_accepted_by as string) ?? null, termsVersion: (a.terms_version as string) ?? null,
      createdAt: iso(a.created_at) ?? "", users: users.filter((u) => u.adviser_id === a.id).map((u) => ({ email: u.email, name: u.name, senior: u.senior })), links: mine,
      monthlyPence: monthlyTotalPence(billedLinks.map((l) => l.tier ?? 0)), coveredCount: billedLinks.length,
      // A tier needs checking while AIERT hasn't confirmed it, for a company the adviser is paying for (or asking to).
      tiersToCheck: mine.filter((l) => !l.tierConfirmed && l.tier !== null && (l.coverStatus === "active" || l.coverStatus === "ending")).length,
    };
  });

  // Who pays for each investor-relations company: an adviser, or the company itself.
  const orgs = (await sql`
    SELECT DISTINCT o.id, o.name, o.billing_status, o.seat_band, o.free_for_life, o.stripe_subscription_id, o.current_period_end
    FROM tapcard_biz_orgs o JOIN tapcard_cards c ON c.org_id = o.id JOIN tapcard_listed_cards l ON l.card_id = c.id ORDER BY o.name`) as Record<string, unknown>[];
  const whoPays: WhoPays[] = orgs.map((o) => {
    const covering = out.flatMap((a) => a.links.filter((l) => l.orgId === o.id && l.covered && (l.coverStatus === "active" || l.coverStatus === "ending" || l.coverStatus === "ended")).map((l) => ({ a, l })));
    if (covering.length) {
      const { a, l } = covering[0];
      return { orgId: String(o.id), orgName: String(o.name), payer: `Adviser: ${a.name}`, detail: l.coverStatus === "ended" ? "cover ended, in the 30-day grace period" : l.coverStatus === "ending" ? `ending ${l.coverEndsAt?.slice(0, 10) ?? ""}` : `${l.tierLabel}, ${poundsPerMonth(l.monthlyPence)} a month${a.billingStatus === "trial" ? " (adviser on free trial)" : ""}` };
    }
    const own = o.free_for_life ? "free for life" : o.stripe_subscription_id ? "pays by Stripe" : o.billing_status === "active" ? "complimentary or trial" : String(o.billing_status);
    return { orgId: String(o.id), orgName: String(o.name), payer: "The company itself", detail: own };
  });

  const covered = out.reduce((n, a) => n + a.coveredCount, 0);
  return { advisers: out, whoPays, totals: { advisers: out.length, active: out.filter((a) => a.billingStatus === "active").length, trial: out.filter((a) => a.billingStatus === "trial").length, covered, mrrPence: out.filter((a) => a.billingStatus === "active").reduce((n, a) => n + a.monthlyPence, 0), tiersToCheck: out.reduce((n, a) => n + a.tiersToCheck, 0) } };
}

const clean = (e: string) => e.trim().toLowerCase();
const EMAIL = /^\S+@\S+\.\S+$/;
type Res = { ok: true } | { ok: false; error: string };

export async function adminCreateAdviser(name: string, email: string, staffName: string, senior: boolean): Promise<Res & { adviserId?: string }> {
  if (name.trim().length < 2) return { ok: false, error: "Give the adviser's name." };
  if (!EMAIL.test(email.trim())) return { ok: false, error: "A valid email for the first staff member is needed." };
  const { createAdviser } = await import("@/lib/tapcardAdvisers");
  return { ok: true, adviserId: await createAdviser(name, [{ email, name: staffName, senior }]) };
}
export async function adminAddUser(adviserId: string, email: string, name: string, senior: boolean): Promise<Res> {
  if (!EMAIL.test(email.trim())) return { ok: false, error: "A valid email is needed." };
  await ensureAdviserSchema();
  await sql`INSERT INTO tapcard_adviser_users (adviser_id, email, name, senior) VALUES (${adviserId}, ${clean(email)}, ${name.trim()}, ${senior}) ON CONFLICT (adviser_id, email) DO UPDATE SET senior = ${senior}, name = CASE WHEN ${name.trim()} = '' THEN tapcard_adviser_users.name ELSE ${name.trim()} END`;
  return { ok: true };
}
export async function adminRemoveUser(adviserId: string, email: string): Promise<Res> {
  await ensureAdviserSchema();
  const seniors = (await sql`SELECT email FROM tapcard_adviser_users WHERE adviser_id = ${adviserId} AND senior AND email <> ${clean(email)}`) as unknown[];
  const target = (await sql`SELECT senior FROM tapcard_adviser_users WHERE adviser_id = ${adviserId} AND email = ${clean(email)}`) as { senior: boolean }[];
  if (target[0]?.senior && !seniors.length) return { ok: false, error: "An adviser needs at least one senior member of staff." };
  await sql`DELETE FROM tapcard_adviser_users WHERE adviser_id = ${adviserId} AND email = ${clean(email)}`;
  return { ok: true };
}
/// AIERT confirms (or changes) a company's tier. The company sees it in its audit trail. It applies to the next subscription update.
export async function adminSetTier(linkId: string, tier: number): Promise<Res> {
  const link = await getLink(linkId);
  if (!link) return { ok: false, error: "No such link." };
  if (!(await setLinkTier(linkId, tier))) return { ok: false, error: "Not a real tier." };
  await audit({ orgId: link.orgId, cardId: "", kind: "general", actor: "AIERT", action: "adviser-tier-set", detail: { adviser: link.adviserName, tier, was: link.tier } });
  await recordAgreementEvent(linkId, "tier-set", "AIERT", { tier, was: link.tier });
  // Companies already being billed: update the subscription so the new tier is charged (prorated).
  if (link.coverStatus === "active" || link.coverStatus === "ending") await (await import("@/lib/tapcardAdviserBilling")).syncAdviserSubscription(link.adviserId).catch((e) => console.error("adviser subscription sync failed:", e));
  return { ok: true };
}
/// Gives a trial more days (a sales courtesy). Clears the day-16 reminder so it is sent again before the new end.
export async function adminExtendTrial(adviserId: string, days: number): Promise<Res> {
  if (!Number.isInteger(days) || days < 1 || days > 90) return { ok: false, error: "Choose 1 to 90 days." };
  await ensureAdviserSchema();
  const r = (await sql`UPDATE tapcard_advisers SET trial_ends_at = COALESCE(trial_ends_at, now()) + make_interval(days => ${days}), trial_reminded_at = NULL WHERE id = ${adviserId} AND billing_status = 'trial' AND trial_org_id IS NOT NULL RETURNING id`) as unknown[];
  return r.length ? { ok: true } : { ok: false, error: "Only an adviser on its free trial, with a trial company, can be extended." };
}

/// AIERT records the signed agreement for a company and adviser: its reference, when it was signed, who signed for the company, and where the document is kept.
export async function adminRecordContract(linkId: string, ref: string, signedAt: string, signedBy: string, url: string): Promise<Res> {
  const link = await getLink(linkId);
  if (!link) return { ok: false, error: "No such link." };
  if (ref.trim().length < 2) return { ok: false, error: "Give the agreement's reference." };
  const when = new Date(signedAt);
  if (Number.isNaN(when.getTime())) return { ok: false, error: "Give the date it was signed." };
  if (url.trim() && !/^https:\/\//.test(url.trim())) return { ok: false, error: "The document link must be a secure https:// address." };
  if (signedBy.trim().length < 2) return { ok: false, error: "Say who signed for the company." };
  await sql`UPDATE tapcard_adviser_links SET contract_ref = ${ref.trim()}, contract_signed_at = ${when}, contract_signed_by = ${signedBy.trim()}, contract_url = ${url.trim() || null} WHERE id = ${linkId}`;
  await audit({ orgId: link.orgId, cardId: "", kind: "general", actor: "AIERT", action: "adviser-contract-recorded", detail: { adviser: link.adviserName, ref: ref.trim() } });
  await recordAgreementEvent(linkId, "contract-recorded", "AIERT", { signedAt: when.toISOString(), signedBy: signedBy.trim(), document: url.trim() || null });
  return { ok: true };
}
