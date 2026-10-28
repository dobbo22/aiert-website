import { requireBizSession } from "@/lib/tapcardBizSession";
import { getOrg, isComplimentary, orgStatusLabel, trialEndsAt } from "@/lib/tapcardBiz";
import { bandById } from "@/lib/tapcardBizBilling";
import BillingPortalButton from "./BillingPortalButton";
import UpgradePicker from "./UpgradePicker";

export default async function BizBillingPage() {
  const session = await requireBizSession();
  if (!session) return null;
  const org = await getOrg(session.orgId);
  if (!org) return null;

  const band = bandById(org.seat_band);
  const free = isComplimentary(org);

  return (
    <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
      <h2 className="text-lg font-bold text-cloud">Billing</h2>
      <dl className="mt-4 space-y-2 text-cloud">
        <Row label="Status" value={orgStatusLabel(org)} />
        <Row label="Plan" value={free ? `Free, ${org.locations} location${org.locations === 1 ? "" : "s"}` : org.seat_band === "trial" ? "Free trial" : org.seat_band === "locations" ? `${org.locations} locations` : band?.label ?? (org.seat_band || "–")} />
        <Row label="Cards allowed" value={String(org.seat_limit || "–")} />
        <Row
          label={org.seat_band === "trial" ? "Trial ends" : free ? "Cost" : "Renews"}
          value={free ? (org.free_for_life ? "Free for life" : "Nothing to pay") : (org.seat_band === "trial" ? trialEndsAt(org) : org.current_period_end ? new Date(org.current_period_end) : null)?.toLocaleDateString("en-GB") ?? "–"}
        />
      </dl>

      {free ? (
        <p className="mt-6 text-cloud">
          {org.free_for_life ? "This company is free for life, a thank-you from AIERT for helping TapCard get started." : "This company has free access, set up by AIERT."} There is nothing to pay and nothing to set up here. To change the number of
          locations, or if you have any questions, email <a href="mailto:enquiries@aiert.co.uk" className="text-gold underline">enquiries@aiert.co.uk</a>.
        </p>
      ) : org.stripe_customer_id ? (
        <BillingPortalButton />
      ) : (
        <div className="mt-6">
          <p className="text-cloud">
            {org.seat_band === "trial"
              ? "You're on the 30-day free trial (one card). Before it ends, choose how many locations to keep your cards covered and add your team:"
              : "No payment method on file yet. Choose how many locations to get started:"}
          </p>
          <UpgradePicker />
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-slate/50 py-2">
      <dt className="text-mist">{label}</dt>
      <dd className="capitalize">{value}</dd>
    </div>
  );
}
