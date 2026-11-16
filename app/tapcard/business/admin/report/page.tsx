import { requireBizSession } from "@/lib/tapcardBizSession";
import { getOrg } from "@/lib/tapcardBiz";
import { orgIsListed } from "@/lib/tapcardListedAdmin";
import { getInsights } from "@/lib/tapcardInsights";
import ReportView from "./ReportView";

export const dynamic = "force-dynamic";

// A one-page investor relations report for the last 30 days, laid out on white so it prints or saves as a PDF cleanly. Counts only. Admins of a listed company.
export default async function BizReportPage() {
  const session = await requireBizSession();
  if (!session) return null;
  const org = await getOrg(session.orgId);
  if (!org) return null;
  if (!(await orgIsListed(org.id))) return <p className="rounded-2xl bg-charcoal p-6 text-cloud ring-1 ring-white/10">The report is for listed companies.</p>;
  return <ReportView orgName={org.name} data={await getInsights(org.id)} today={new Date().toISOString()} />;
}
