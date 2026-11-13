import { requireBizSession } from "@/lib/tapcardBizSession";
import { getOrg } from "@/lib/tapcardBiz";
import { orgIsListed } from "@/lib/tapcardListedAdmin";
import { getInsights } from "@/lib/tapcardInsights";
import InsightsView from "./InsightsView";

export const dynamic = "force-dynamic";

// Counts only: scans of each event code, taps through to each announcement, followers over time. Admins of a listed company only.
export default async function BizInsightsPage() {
  const session = await requireBizSession();
  if (!session) return null;
  const org = await getOrg(session.orgId);
  if (!org) return null;
  if (!(await orgIsListed(org.id))) return <p className="rounded-2xl bg-charcoal p-6 text-cloud ring-1 ring-white/10">Insights are for listed companies.</p>;
  return <InsightsView data={await getInsights(org.id)} />;
}
