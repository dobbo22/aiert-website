import { requireBizSession } from "@/lib/tapcardBizSession";
import { getOrg } from "@/lib/tapcardBiz";
import { orgUsage, listUsageLinks } from "@/lib/tapcardUsage";
import { supportLogForOrg } from "@/lib/tapcardBizSupport";
import UsageView from "./UsageView";
import UsageLinks from "./UsageLinks";

export const dynamic = "force-dynamic";

const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });

// How many cards are issued and in use, followers, scans, offers and news: counts only. Plus read-only links, and a record of every time
// AIERT support opened this company's admin. Admins only.
export default async function BizUsagePage() {
  const session = await requireBizSession();
  if (!session) return null;
  const org = await getOrg(session.orgId);
  if (!org) return null;
  const [report, links, access] = await Promise.all([orgUsage(org.id), listUsageLinks(org.id).catch(() => []), supportLogForOrg(org.id).catch(() => [])]);
  if (!report) return null;
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-cloud">Usage</h2>
          <p className="mt-1 text-cloud">What is issued and used across {org.name}. No names or emails of followers are ever shown here.</p>
        </div>
        <a className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-cloud ring-1 ring-white/20 hover:bg-white/20" href="/api/tapcard/biz/usage">Download as CSV</a>
      </div>
      <UsageView r={report} />
      <UsageLinks initial={links} />
      <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
        <h2 className="text-lg font-bold text-cloud">When AIERT opened your admin</h2>
        <p className="mt-1 text-cloud">AIERT support can only open your admin while you have allowed it, and never changes billing. Every time is recorded here.</p>
        {access.length === 0 ? <p className="mt-3 text-cloud">AIERT support has not opened your admin.</p> : (
          <ul className="mt-3 grid gap-1 text-sm text-cloud">
            {access.map((a, i) => <li key={i}>{when(a.at)}: {a.actor} {a.action}{a.detail ? ` (${a.detail})` : ""}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}
