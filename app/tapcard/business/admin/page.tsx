import { requireBizUser } from "@/lib/tapcardBizSession";
import { countOrgCards, getOrg, isComplimentary, isOrgActive, orgStatusLabel } from "@/lib/tapcardBiz";
import { listLocations } from "@/lib/tapcardBizLocations";

export default async function BizAdminOverview() {
  const session = await requireBizUser();
  if (!session) return null; // layout already redirects to LoginForm
  const org = await getOrg(session.orgId);
  if (!org) return null;

  // A shop manager's home: their shops and the two things they can do.
  if (session.role === "manager") {
    const shops = (await listLocations(org.id).catch(() => [])).filter((l) => session.locationIds.includes(l.id));
    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
          <h2 className="text-lg font-bold text-cloud">Welcome</h2>
          <p className="mt-2 text-cloud">You manage {shops.length === 1 ? "this shop" : "these shops"} for {org.name}:</p>
          <ul className="mt-3 space-y-1 text-cloud">
            {shops.map((s) => <li key={s.id}>{s.name}{s.address ? `, ${s.address}` : ""}</li>)}
          </ul>
          <p className="mt-4 text-sm text-mist">
            Use <a href="/business/admin/qr-sign" className="text-gold underline">QR sign</a> to print your shop&apos;s sign, and{" "}
            <a href="/business/admin/employees" className="text-gold underline">Employees</a> to invite your staff and remove a card when someone leaves.
            Offers and news are posted by your company&apos;s admins.
          </p>
        </div>
      </div>
    );
  }

  const activeCards = await countOrgCards(org.id);
  const locations = await listLocations(org.id).catch(() => []);
  const allowed = org.seat_band === "locations" ? Math.max(org.locations, 1) : 1;
  const claimed = locations.filter((l) => l.claimed_card_id).length;
  const templateDone = !!org.website && !!org.logo_url;
  const steps: { done: boolean; href: string; title: string; text: string }[] = [
    { done: templateDone, href: "/business/admin/template", title: "Set up your company details",
      text: "Find your business to fill in your website, logo, colour and social links in one go. Every shop's card uses them." },
    { done: locations.length >= allowed, href: "/business/admin/locations", title: `Add your shops (${locations.length} of ${allowed})`,
      text: "Find each shop the way the app does, or let us find your other shops automatically. Address, phone, hours and links are filled in." },
    { done: locations.length > 0 && claimed >= locations.length, href: "/business/admin/locations", title: `Invite each manager (${claimed} of ${locations.length} cards made)`,
      text: "Create a link for each shop's manager. They open it in the free TapCard app and their shop's card is ready to share." },
    { done: false, href: "/business/admin/employees", title: "Invite staff cards (optional)",
      text: "Each location includes up to 10 staff cards. Upload your staff list and send everyone their link." },
    { done: false, href: "/business/admin/promote", title: "Post your first offer",
      text: "A shop's manager posts from the app, or you post for any shop from Offers & numbers." },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
          <p className="text-sm text-mist">Billing</p>
          <p className="mt-1 text-xl font-bold text-cloud capitalize">{isComplimentary(org) ? "Free access" : orgStatusLabel(org)}</p>
        </div>
        <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
          <p className="text-sm text-mist">Active cards</p>
          <p className="mt-1 text-xl font-bold text-cloud">
            {activeCards} / {org.seat_limit || "–"} cards
          </p>
        </div>
      </div>

      {!isOrgActive(org) && (
        <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-gold/40">
          <p className="text-cloud">
            {org.billing_status === "active"
              ? "Your free trial has ended, so invites can't be created and company cards are no longer covered for Promote. Choose a plan on the Billing tab to carry on."
              : "Billing isn't active yet, so invites can't be created and employees can't activate their cards. If you just paid, this usually updates within a minute — refresh to check."}
          </p>
        </div>
      )}

      <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
        <h2 className="text-lg font-bold text-cloud">Getting started</h2>
        <ol className="mt-3 space-y-3 text-cloud">
          {steps.map((st, i) => (
            <li key={i} className="flex gap-3">
              <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold ${st.done ? "bg-teal text-black" : "bg-slate text-cloud"}`}>{st.done ? "✓" : i + 1}</span>
              <span>
                <a href={st.href} className="font-semibold text-gold underline">{st.title}</a>
                <span className="block text-sm text-mist">{st.text}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-cloud">
          Step by step, with troubleshooting: <a href="/business/guide" className="text-gold underline">Admin guide</a>
        </p>
      </div>
    </div>
  );
}
