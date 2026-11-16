import { requireBizSession } from "@/lib/tapcardBizSession";
import { getOrg } from "@/lib/tapcardBiz";
import { listedSummary, orgIsListed } from "@/lib/tapcardListedAdmin";
import { listEventAttendees, listEvents } from "@/lib/tapcardEvents";
import EventQrs from "../cards/EventQrs";

export const dynamic = "force-dynamic";

// Events of a listed company (AGM, roadshow, meeting): one QR code each, optional time slots, and who registered. Admins only.
export default async function BizEventsPage() {
  const session = await requireBizSession();
  if (!session) return null;
  const org = await getOrg(session.orgId);
  if (!org) return null;
  if (!(await orgIsListed(org.id))) return <p className="rounded-2xl bg-charcoal p-6 text-cloud ring-1 ring-white/10">Events are for listed companies.</p>;
  const s = await listedSummary(org.id);
  if (!s.primaryCardId) return <p className="rounded-2xl bg-charcoal p-6 text-cloud ring-1 ring-white/10">There is no company card yet. Ask AIERT to set it up.</p>;
  const company = s.cards.find((c) => c.isCompany);
  const companyName = company?.company || company?.name || org.name;
  const [events, attendance] = await Promise.all([listEvents(org.id).catch(() => []), listEventAttendees(org.id).catch(() => ({}))]);
  return <EventQrs companyCardId={s.primaryCardId} companyName={companyName} events={events} attendance={attendance} />;
}
