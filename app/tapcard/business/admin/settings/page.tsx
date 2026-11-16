import Link from "next/link";
import { requireBizSession } from "@/lib/tapcardBizSession";
import { getOrg } from "@/lib/tapcardBiz";
import { listedSummary } from "@/lib/tapcardListedAdmin";
import { getPrivacyUrl } from "@/lib/tapcardShare";
import PrivacyLink from "../cards/PrivacyLink";
import BizAdminsPage from "../admins/page";
import BizBillingPage from "../billing/page";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "admins", label: "Admins" },
  { key: "billing", label: "Billing" },
  { key: "privacy", label: "Privacy notice" },
] as const;

// A listed company's housekeeping in one place: who can sign in, the plan, and the link to its own privacy notice. Admins only.
export default async function BizSettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await requireBizSession();
  if (!session) return null;
  const org = await getOrg(session.orgId);
  if (!org) return null;
  const { tab: tabParam } = await searchParams;
  const tab = TABS.find((t) => t.key === tabParam)?.key ?? "admins";
  const s = tab === "privacy" ? await listedSummary(org.id) : null;
  const privacyUrl = s?.primaryCardId ? await getPrivacyUrl(s.primaryCardId).catch(() => "") : "";
  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-2 border-b border-white/10 pb-3" aria-label="Settings sections">
        {TABS.map((t) => (
          <Link key={t.key} href={`/business/admin/settings?tab=${t.key}`} aria-current={tab === t.key ? "page" : undefined}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === t.key ? "bg-white text-black" : "text-cloud ring-1 ring-white/20 hover:bg-white/10"}`}>
            {t.label}
          </Link>
        ))}
      </nav>
      {tab === "admins" && <BizAdminsPage />}
      {tab === "billing" && <BizBillingPage />}
      {tab === "privacy" && (s?.primaryCardId ? <PrivacyLink initial={privacyUrl} /> : <p className="rounded-2xl bg-charcoal p-6 text-cloud ring-1 ring-white/10">No company card yet.</p>)}
    </div>
  );
}
