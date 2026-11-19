import { requireAdviser } from "@/lib/tapcardAdvisers";
import { adviserSummary } from "@/lib/tapcardAdviserBilling";
import { adviserPortfolio } from "@/lib/adviserPortfolio";
import { ADVISER_TERMS_VERSION, poundsPerMonth } from "@/lib/tapcardAdviserPricing";
import AdviserHome from "./AdviserHome";

export const dynamic = "force-dynamic";

export default async function AdviserPage() {
  const me = await requireAdviser();
  if (!me) return null;
  const [s, portfolio] = await Promise.all([adviserSummary(me.adviserId), adviserPortfolio(me.adviserId, me)]);
  return (
    <AdviserHome
      billing={{ status: s.adviser.billingStatus, senior: me.senior, trialDaysLeft: s.trialDaysLeft, termsAccepted: !!s.adviser.termsAcceptedAt && s.adviser.termsVersion === ADVISER_TERMS_VERSION, termsVersion: ADVISER_TERMS_VERSION, coveredCount: s.covers.filter((c) => c.coverStatus === "active" || c.coverStatus === "ending").length, monthly: poundsPerMonth(s.monthlyPence), hasCustomer: !!s.adviser.stripeCustomerId }}
      portfolio={portfolio}
    />
  );
}
