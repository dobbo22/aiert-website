import { requireBizSession } from "@/lib/tapcardBizSession";
import { getOrg, listOrgCards } from "@/lib/tapcardBiz";
import InvitePeople from "./InvitePeople";
import RemoveCardButton from "./RemoveCardButton";

// TapCard keeps no staff list (see lib/tapcardBizInvite.ts) — this page
// only knows the cards people have actually activated.
export default async function BizEmployeesPage() {
  const session = await requireBizSession();
  if (!session) return null;
  const org = await getOrg(session.orgId);
  if (!org) return null;

  const cards = await listOrgCards(org.id);

  return (
    <div className="space-y-8">
      <InvitePeople billingActive={org.billing_status === "active"} orgName={org.name} />

      <div className="rounded-2xl bg-charcoal ring-1 ring-white/10">
        <div className="flex items-baseline justify-between px-4 pt-4">
          <h2 className="text-lg font-bold text-cloud">Active cards</h2>
          <span className="text-sm text-mist">
            {cards.length} of {org.seat_limit || "–"} seats used
          </span>
        </div>
        <table className="mt-2 w-full text-left text-cloud">
          <thead>
            <tr className="border-b border-slate text-sm text-mist">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {cards.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-mist">
                  No one has activated their card yet.
                </td>
              </tr>
            )}
            {cards.map((c) => (
              <tr key={c.id} className="border-b border-slate/50">
                <td className="px-4 py-3">{c.name}</td>
                <td className="px-4 py-3">{c.email}</td>
                <td className="px-4 py-3">{c.title}</td>
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
