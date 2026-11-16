import { requireBizSession } from "@/lib/tapcardBizSession";
import { getOrg } from "@/lib/tapcardBiz";
import { listedSummary } from "@/lib/tapcardListedAdmin";
import CardQr from "./CardQr";
import EventQrs from "./EventQrs";
import PrivacyLink from "./PrivacyLink";
import { getPrivacyUrl } from "@/lib/tapcardShare";
import { listEvents } from "@/lib/tapcardEvents";

export const dynamic = "force-dynamic";

// The company's cards, each with a QR code to download for slides, the annual report and the AGM notice. Admins only.
export default async function BizCardsPage() {
  const session = await requireBizSession();
  if (!session) return null;
  const org = await getOrg(session.orgId);
  if (!org) return null;
  const s = await listedSummary(org.id);
  const companyName = s.cards.find((c) => c.isCompany)?.company || s.cards.find((c) => c.isCompany)?.name || org.name;
  const events = await listEvents(org.id).catch(() => []);
  const privacyUrl = s.primaryCardId ? await getPrivacyUrl(s.primaryCardId).catch(() => "") : "";
  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
        <h2 className="text-lg font-bold text-cloud">Cards and QR codes</h2>
        <p className="mt-2 text-cloud">Each card has its own QR code. Scanning it opens the card and offers a follow. Use the company code on slides, the annual report and the AGM notice, and each person&apos;s code in meetings.</p>
      </div>
      {s.cards.length === 0 && <p className="rounded-2xl bg-charcoal p-6 text-cloud ring-1 ring-white/10">No cards yet.</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {s.cards.map((c) => (
          <CardQr key={c.id} id={c.id} title={c.isCompany ? (c.company || c.name) : c.name || "Card"} subtitle={c.isCompany ? "Company card" : c.title || "Team card"} />
        ))}
      </div>
      {s.primaryCardId && <PrivacyLink initial={privacyUrl} />}
      {s.primaryCardId && <EventQrs companyCardId={s.primaryCardId} companyName={companyName} events={events} />}
    </div>
  );
}
