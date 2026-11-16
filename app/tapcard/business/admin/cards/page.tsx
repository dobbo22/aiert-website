import Link from "next/link";
import { redirect } from "next/navigation";
import { requireBizSession } from "@/lib/tapcardBizSession";
import { getOrg, isOrgActive, listOrgCards } from "@/lib/tapcardBiz";
import { listedSummary } from "@/lib/tapcardListedAdmin";
import { listEventAttendees, listEvents } from "@/lib/tapcardEvents";
import CardQr from "./CardQr";
import EventQrs from "./EventQrs";
import InvitePeople from "../employees/InvitePeople";
import RemoveCardButton from "../employees/RemoveCardButton";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "company", label: "Company card" },
  { key: "team", label: "Team cards" },
  { key: "events", label: "Events" },
] as const;

// The company's cards, each with a QR code to download for slides, the annual report and the AGM notice, split into tabs: company, team and events. Admins only.
export default async function BizCardsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await requireBizSession();
  if (!session) return null;
  const org = await getOrg(session.orgId);
  if (!org) return null;
  const { tab: tabParam } = await searchParams;
  if (tabParam === "privacy") redirect("/business/admin/settings?tab=privacy");
  const tab = TABS.find((t) => t.key === tabParam)?.key ?? "company";
  const s = await listedSummary(org.id);
  const company = s.cards.filter((c) => c.isCompany);
  const companyCard = company[0];
  const companyName = companyCard?.company || companyCard?.name || org.name;
  const [events, attendance] = tab === "events" && s.primaryCardId ? await Promise.all([listEvents(org.id).catch(() => []), listEventAttendees(org.id).catch(() => ({}))]) : [[], {}];
  const orgCards = tab === "team" ? await listOrgCards(org.id) : [];
  const companyIds = new Set(company.map((c) => c.id));
  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-2 border-b border-white/10 pb-3" aria-label="Cards and QR sections">
        {TABS.map((t) => (
          <Link key={t.key} href={`/business/admin/cards?tab=${t.key}`} aria-current={tab === t.key ? "page" : undefined}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === t.key ? "bg-white text-black" : "text-cloud ring-1 ring-white/20 hover:bg-white/10"}`}>
            {t.label}
          </Link>
        ))}
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
          <p className="text-cloud">Each person who speaks for the company (chair, CEO, CFO, IR contact) has their own card and QR code, so a meeting ends with a follow and a direct contact. Anyone who follows a team card follows the company.</p>
          <InvitePeople billingActive={isOrgActive(org)} orgName={org.name} domain={org.domain} listed shops={[]} />
          {orgCards.filter((c) => !companyIds.has(c.id)).length === 0 ? (
            <p className="rounded-2xl bg-charcoal p-6 text-cloud ring-1 ring-white/10">No team cards yet. Create a link above for each person and send it to them.</p>
          ) : (
            <div className="rounded-2xl bg-charcoal ring-1 ring-white/10">
              <div className="flex items-baseline justify-between px-4 pt-4">
                <h2 className="text-lg font-bold text-cloud">Cards</h2>
                <span className="text-sm text-cloud">{orgCards.length} of {org.seat_limit || "–"} cards used (including the company card)</span>
              </div>
              <ul className="mt-2">
                {orgCards.filter((c) => !companyIds.has(c.id)).map((c) => (
                  <li key={c.id} className="border-t border-slate/50 px-4 py-3">
                    <details>
                      <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 text-cloud">
                        <span>
                          <span className="font-semibold">{c.name}</span>
                          <span className="block text-sm">{[c.title, c.email].filter(Boolean).join(" · ")}</span>
                        </span>
                        <span className="text-sm font-semibold text-gold underline">Show QR code</span>
                      </summary>
                      <div className="mt-3 max-w-md"><CardQr id={c.id} title={c.name || "Card"} subtitle={c.title || "Team card"} /></div>
                      <div className="mt-2 text-right"><RemoveCardButton cardId={c.id} name={c.name} /></div>
                    </details>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {tab === "events" && (s.primaryCardId
        ? <EventQrs companyCardId={s.primaryCardId} companyName={companyName} events={events} attendance={attendance} />
        : <p className="rounded-2xl bg-charcoal p-6 text-cloud ring-1 ring-white/10">There is no company card yet. Ask AIERT to set it up.</p>)}
    </div>
  );
}
