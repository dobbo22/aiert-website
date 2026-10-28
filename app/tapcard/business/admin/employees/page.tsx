import { requireBizUser } from "@/lib/tapcardBizSession";
import { getOrg, isOrgActive, listOrgCards, listStaffForLocations } from "@/lib/tapcardBiz";
import { listLocations } from "@/lib/tapcardBizLocations";
import InvitePeople from "./InvitePeople";
import PostControls from "./PostControls";
import RemoveCardButton from "./RemoveCardButton";
import StaffShop from "./StaffShop";

// TapCard keeps no staff list (see lib/tapcardBizInvite.ts) — this page
// only knows the cards people have actually activated.
export default async function BizEmployeesPage() {
  const session = await requireBizUser();
  if (!session) return null;
  const org = await getOrg(session.orgId);
  if (!org) return null;

  const shopLabel = (address: string, name: string) => {
    const parts = address.split(",").map((p) => p.replace(/[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}/i, "").trim()).filter(Boolean);
    return (parts.length >= 2 ? parts[1] : parts[0]) || name;
  };
  const allShops = await listLocations(org.id).catch(() => []);

  // A shop manager: only their shops' staff, to invite and to remove. No offers, no other cards.
  if (session.role === "manager") {
    const mine = allShops.filter((l) => session.locationIds.includes(l.id));
    const staff = await listStaffForLocations(org.id, session.locationIds);
    const shopName = new Map(mine.map((l) => [l.id, shopLabel(l.address, l.name)]));
    return (
      <div className="space-y-8">
        <InvitePeople billingActive={isOrgActive(org)} orgName={org.name} domain={org.domain} shops={mine.map((l) => ({ id: l.id, label: shopLabel(l.address, l.name) }))} shopRequired />
        <div className="rounded-2xl bg-charcoal ring-1 ring-white/10">
          <div className="px-4 pt-4"><h2 className="text-lg font-bold text-cloud">Your staff</h2></div>
          <table className="mt-2 w-full text-left text-cloud">
            <thead><tr className="border-b border-slate text-sm text-mist"><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Shop</th><th className="px-4 py-3" /></tr></thead>
            <tbody>
              {staff.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-mist">No one has made their card yet. Create links above and send each person theirs.</td></tr>}
              {staff.map((c) => (
                <tr key={c.id} className="border-b border-slate/50">
                  <td className="px-4 py-3">{c.name}</td>
                  <td className="px-4 py-3">{c.email}</td>
                  <td className="px-4 py-3">{shopName.get(c.org_location_id ?? "") ?? ""}</td>
                  <td className="px-4 py-3 text-right"><RemoveCardButton cardId={c.id} name={c.name} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const cards = await listOrgCards(org.id);
  // Shops / locations: the cards the admin has marked, which offers and news belong to.
  const locations = cards.filter((c) => c.card_kind === "business").map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="space-y-8">
      <InvitePeople billingActive={isOrgActive(org)} orgName={org.name} domain={org.domain} shops={allShops.map((l) => ({ id: l.id, label: shopLabel(l.address, l.name) }))} />

      <div className="rounded-2xl bg-charcoal ring-1 ring-white/10">
        <div className="flex items-baseline justify-between px-4 pt-4">
          <h2 className="text-lg font-bold text-cloud">Active cards</h2>
          <span className="text-sm text-mist">
            {cards.length} of {org.seat_limit || "–"} cards used
          </span>
        </div>
        <table className="mt-2 w-full text-left text-cloud">
          <thead>
            <tr className="border-b border-slate text-sm text-mist">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Shop</th>
              <th className="px-4 py-3">Offers and news</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {cards.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-mist">
                  No one has activated their card yet.
                </td>
              </tr>
            )}
            {cards.map((c) => (
              <tr key={c.id} className="border-b border-slate/50">
                <td className="px-4 py-3">{c.name}</td>
                <td className="px-4 py-3">{c.email}</td>
                <td className="px-4 py-3">{c.title}</td>
                <td className="px-4 py-3">{c.card_kind === "business" ? "" : <StaffShop cardId={c.id} shopId={c.org_location_id} shops={allShops.map((l) => ({ id: l.id, label: shopLabel(l.address, l.name) }))} />}</td>
                <td className="px-4 py-3"><PostControls cardId={c.id} isLocationInitial={c.card_kind === "business"} postsForInitial={c.can_post && c.card_kind === "business" ? [...c.posts_for, c.id] : c.posts_for} locations={locations} /></td>
                <td className="px-4 py-3 text-right">
                  <RemoveCardButton cardId={c.id} name={c.name} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
