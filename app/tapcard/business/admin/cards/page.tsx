import Link from "next/link";
import { requireBizSession } from "@/lib/tapcardBizSession";
import { getOrg } from "@/lib/tapcardBiz";
import { listedSummary } from "@/lib/tapcardListedAdmin";
import { getPrivacyUrl } from "@/lib/tapcardShare";
import CardQr from "./CardQr";
import PrivacyLink from "./PrivacyLink";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "company", label: "Company card" },
  { key: "team", label: "Team cards" },
  { key: "privacy", label: "Privacy notice" },
] as const;

// The company's cards, each with a QR code to download for slides, the annual report and the AGM notice, split into tabs. Events have their own page. Admins only.
export default async function BizCardsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await requireBizSession();
  if (!session) return null;
  const org = await getOrg(session.orgId);
  if (!org) return null;
  const { tab: tabParam } = await searchParams;
  const tab = TABS.find((t) => t.key === tabParam)?.key ?? "company";
  const s = await listedSummary(org.id);
  const company = s.cards.filter((c) => c.isCompany);
  const team = s.cards.filter((c) => !c.isCompany);
  const privacyUrl = s.primaryCardId ? await getPrivacyUrl(s.primaryCardId).catch(() => "") : "";
  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-2 border-b border-white/10 pb-3" aria-label="Cards and QR sections">
        {TABS.map((t) => (
          <Link key={t.key} href={`/business/admin/cards?tab=${t.key}`} aria-current={tab === t.key ? "page" : undefined}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === t.key ? "bg-white text-black" : "text-cloud ring-1 ring-white/20 hover:bg-white/10"}`}>
            {t.label}
          </Link>
        ))}
        <Link href="/business/admin/events" className="ml-auto rounded-lg px-4 py-2 text-sm font-semibold text-gold underline">Events and roadshow QR codes</Link>
      </nav>

      {tab === "company" && (
        <>
          <p className="text-cloud">The QR code for your company card. Put it on results slides, the annual report, the AGM notice and your website. Scanning it opens the card and offers a follow.</p>
          {company.length === 0 && <p className="rounded-2xl bg-charcoal p-6 text-cloud ring-1 ring-white/10">No company card yet.</p>}
          <div className="grid gap-4 md:grid-cols-2">
            {company.map((c) => <CardQr key={c.id} id={c.id} title={c.company || c.name} subtitle="Company card" />)}
          </div>
        </>
      )}

      {tab === "team" && (
        <>
          <p className="text-cloud">Each person who speaks for the company has their own card and QR code, so a meeting ends with a follow and a direct contact. Add people on the People tab.</p>
          {team.length === 0 && <p className="rounded-2xl bg-charcoal p-6 text-cloud ring-1 ring-white/10">No team cards yet. Add the chair, CEO, CFO and IR contact on the People tab.</p>}
          <div className="grid gap-4 md:grid-cols-2">
            {team.map((c) => <CardQr key={c.id} id={c.id} title={c.name || "Card"} subtitle={c.title || "Team card"} />)}
          </div>
        </>
      )}

      {tab === "privacy" && (s.primaryCardId ? <PrivacyLink initial={privacyUrl} /> : <p className="rounded-2xl bg-charcoal p-6 text-cloud ring-1 ring-white/10">No company card yet.</p>)}
    </div>
  );
}
