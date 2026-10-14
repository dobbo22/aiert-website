import { requireBizSession } from "@/lib/tapcardBizSession";
import { getOrg } from "@/lib/tapcardBiz";
import { orgPromoteRows } from "@/lib/tapcardOffers";
import LocationPromote from "./LocationPromote";

export const dynamic = "force-dynamic";

// Offers, news and numbers for every location (company card), in one place.
export default async function BizPromotePage() {
  const session = await requireBizSession();
  if (!session) return null;
  const org = await getOrg(session.orgId);
  if (!org) return null;
  const rows = await orgPromoteRows(org.id);
  const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((n, r) => n + f(r), 0);
  const active = org.billing_status === "active";
  const stat = (v: number, l: string) => (
    <div className="rounded-2xl bg-charcoal px-4 py-3 ring-1 ring-white/10"><div className="text-2xl font-black text-cloud">{v}</div><div className="text-sm text-cloud">{l}</div></div>
  );

  return (
    <div className="space-y-8">
      {!active && (
        <p className="rounded-xl bg-white/10 px-4 py-3 text-cloud">Your company&apos;s billing isn&apos;t active, so posting offers and news is paused. <a className="text-gold underline" href="/business/admin/billing">Billing</a></p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stat(rows.length, "Locations")}
        {stat(sum((r) => r.views), "Card views")}
        {stat(sum((r) => r.qrViews), "QR scans")}
        {stat(sum((r) => r.saves), "Saves")}
        {stat(sum((r) => r.claimedTotal), "Offers claimed")}
        {stat(sum((r) => r.redeemedTotal), "Offers used")}
      </div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-cloud">Locations</h2>
        <a className="text-sm text-gold underline" href="/api/tapcard/biz/promote">Download as CSV</a>
      </div>
      {rows.length === 0 && <p className="text-cloud">No location cards yet. Invite people on the Employees page; each card they activate appears here.</p>}
      <div className="space-y-4">
        {rows.map((r) => (
          <section key={r.id} className="rounded-2xl bg-charcoal p-4 ring-1 ring-white/10 text-cloud">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-lg font-bold">{r.company || r.name}</h3>
              <p className="text-sm">{r.views} views · {r.qrViews} QR scans · {r.saves} saves</p>
            </div>
            <div className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
              <p><strong>Offer:</strong> {r.offerText ? `${r.offerText} (${r.offerClaimed} claimed, ${r.offerRedeemed} used${r.offerExpires ? `, ends ${new Date(r.offerExpires).toLocaleDateString("en-GB")}` : ""})` : "none live"}</p>
              <p><strong>News:</strong> {r.news ?? "none"}</p>
              <p className="sm:col-span-2"><strong>All time:</strong> {r.claimedTotal} claimed, {r.redeemedTotal} used</p>
            </div>
            {active && <div className="mt-3"><LocationPromote cardId={r.id} hasOffer={!!r.offerText} hasNews={!!r.news} /></div>}
          </section>
        ))}
      </div>
    </div>
  );
}
