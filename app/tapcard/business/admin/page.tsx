import { requireBizSession } from "@/lib/tapcardBizSession";
import { countOrgCards, getOrg, isOrgActive, orgStatusLabel } from "@/lib/tapcardBiz";

export default async function BizAdminOverview() {
  const session = await requireBizSession();
  if (!session) return null; // layout already redirects to LoginForm
  const org = await getOrg(session.orgId);
  if (!org) return null;

  const activeCards = await countOrgCards(org.id);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
          <p className="text-sm text-mist">Billing</p>
          <p className="mt-1 text-xl font-bold text-cloud capitalize">{orgStatusLabel(org)}</p>
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
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-cloud">
          <li>Set your company&apos;s card template — logo, colours, social links, and which fields employees can edit.</li>
          <li>Choose your staff list on the Employees tab to create everyone&apos;s invite link — the list stays on your computer.</li>
        </ol>
        <p className="mt-4 text-sm text-cloud">
          Step by step, with troubleshooting: <a href="/business/guide" className="text-gold underline">Admin guide</a>
        </p>
      </div>
    </div>
  );
}
