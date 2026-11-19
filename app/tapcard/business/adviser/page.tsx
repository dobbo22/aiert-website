import { linksForAdviser, requireAdviser } from "@/lib/tapcardAdvisers";
import { adviserSummary } from "@/lib/tapcardAdviserBilling";
import { ADVISER_TERMS_VERSION, poundsPerMonth } from "@/lib/tapcardAdviserPricing";
import AdviserHome from "./AdviserHome";

export const dynamic = "force-dynamic";

export default async function AdviserPage() {
  const me = await requireAdviser();
  if (!me) return null;
  const [links, s] = await Promise.all([linksForAdviser(me.adviserId), adviserSummary(me.adviserId)]);
  const price = new Map(s.covers.map((c) => [c.orgId, c]));
  return (
    <AdviserHome
      billing={{ status: s.adviser.billingStatus, senior: me.senior, trialDaysLeft: s.trialDaysLeft, termsAccepted: !!s.adviser.termsAcceptedAt && s.adviser.termsVersion === ADVISER_TERMS_VERSION, termsVersion: ADVISER_TERMS_VERSION, coveredCount: s.covers.filter((c) => c.coverStatus === "active" || c.coverStatus === "ending").length, monthly: poundsPerMonth(s.monthlyPence), hasCustomer: !!s.adviser.stripeCustomerId }}
      clients={links.map((l) => { const c = price.get(l.orgId); return { orgId: l.orgId, name: l.orgName, status: l.status, canRegulatory: l.canRegulatory, coverStatus: l.coverStatus, tierLabel: c?.tierLabel ?? "", monthly: c ? poundsPerMonth(c.monthlyPence) : "", committedUntil: c?.committedUntil ?? null, coverEndsAt: c?.coverEndsAt ?? null }; })}
    />
  );
}
