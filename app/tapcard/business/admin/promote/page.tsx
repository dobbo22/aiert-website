import { requireBizUser } from "@/lib/tapcardBizSession";
import { getOrg, isOrgActive, listOrgCards } from "@/lib/tapcardBiz";
import { listLocations } from "@/lib/tapcardBizLocations";
import { orgPromoteRows } from "@/lib/tapcardOffers";
import LocationPromote from "./LocationPromote";

export const dynamic = "force-dynamic";

// Offers, news and numbers for every shop card, in one place. A manager sees and posts for only their own shops; an admin for all of them.
export default async function BizPromotePage() {
  const session = await requireBizUser();
  if (!session) return null;
  const org = await getOrg(session.orgId);
  if (!org) return null;
  const shops = (await listLocations(org.id).catch(() => [])).filter((l) => session.role === "admin" || session.locationIds.includes(l.id));
  const shopCardIds = new Set(shops.map((l) => l.claimed_card_id).filter(Boolean) as string[]);
  // Shop cards only: the shops' own cards, and (for an admin) any card marked as a business, not each member of staff.
  const businessIds = session.role === "admin" ? new Set((await listOrgCards(org.id)).filter((c) => c.card_kind === "business").map((c) => c.id)) : new Set<string>();
  const rows = (await orgPromoteRows(org.id)).filter((r) => shopCardIds.has(r.id) || businessIds.has(r.id));
  const blocked = session.role === "manager" && !session.canPost;
  const waiting = shops.filter((l) => !l.claimed_card_id);
  const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((n, r) => n + f(r), 0);
  const active = isOrgActive(org);
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
        {stat(sum((r) => r.installs), "Installs from your sign")}
        {stat(sum((r) => r.followers), "Following")}
        {stat(sum((r) => r.claimedTotal), "Offers claimed")}
        {stat(sum((r) => r.redeemedTotal), "Offers used")}
      </div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-cloud">Locations</h2>
        {session.role === "admin" && <a className="text-sm text-gold underline" href="/api/tapcard/biz/promote">Download as CSV</a>}
      </div>
      {blocked && <p className="rounded-xl bg-white/10 px-4 py-3 text-cloud">Your admin has switched off posting for you. You can still see how your shop&apos;s offers are doing; ask your admin to post, or to turn it back on.</p>}
      {waiting.length > 0 && (
        <p className="rounded-xl bg-white/10 px-4 py-3 text-cloud">
          Offers and news are posted on a shop&apos;s own card, so {waiting.map((l) => l.name).join(", ")} can post once {waiting.length === 1 ? "its card has" : "their cards have"} been made
          (the manager opens the invite link in the TapCard app, or you hand over a card you made).
        </p>
      )}
      {rows.length === 0 && waiting.length === 0 && <p className="text-cloud">No shop cards yet.</p>}
      <div className="space-y-4">
        {rows.map((r) => (
          <section key={r.id} className="rounded-2xl bg-charcoal p-4 ring-1 ring-white/10 text-cloud">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-lg font-bold">{r.company || r.name}</h3>
              <p className="text-sm">{r.views} views · {r.qrViews} QR scans · {r.installs} installs · {r.saves} saves · {r.followers} following</p>
            </div>
            <div className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
              <p><strong>Offer:</strong> {r.offerText ? `${r.offerText} (${r.offerClaimed} claimed, ${r.offerRedeemed} used${r.offerExpires ? `, ends ${new Date(r.offerExpires).toLocaleDateString("en-GB")}` : ""})` : "none live"}</p>
              <p><strong>News:</strong> {r.news ?? "none"}</p>
              <p className="sm:col-span-2"><strong>All time:</strong> {r.claimedTotal} claimed, {r.redeemedTotal} used</p>
            </div>
            {active && !blocked && <div className="mt-3"><LocationPromote cardId={r.id} hasOffer={!!r.offerText} hasNews={!!r.news} /></div>}
          </section>
        ))}
      </div>
    </div>
  );
}
