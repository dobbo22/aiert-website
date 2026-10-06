import { requireBizSession } from "@/lib/tapcardBizSession";
import { getOrg } from "@/lib/tapcardBiz";
import { bandById } from "@/lib/tapcardBizBilling";
import BillingPortalButton from "./BillingPortalButton";
import UpgradePicker from "./UpgradePicker";

export default async function BizBillingPage() {
  const session = await requireBizSession();
  if (!session) return null;
  const org = await getOrg(session.orgId);
  if (!org) return null;

  const band = bandById(org.seat_band);

  return (
    <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
      <h2 className="text-lg font-bold text-cloud">Billing</h2>
      <dl className="mt-4 space-y-2 text-cloud">
        <Row label="Status" value={org.billing_status} />
        <Row label="Plan" value={org.seat_band === "trial" ? "Free trial" : band?.label ?? (org.seat_band || "–")} />
        <Row label="Seats" value={String(org.seat_limit || "–")} />
        <Row
          label="Renews"
          value={org.current_period_end ? new Date(org.current_period_end).toLocaleDateString("en-GB") : "–"}
        />
      </dl>

      {org.stripe_customer_id ? (
        <BillingPortalButton />
      ) : (
        <div className="mt-6">
          <p className="text-cloud">
            {org.seat_band === "trial"
              ? "You're on the free trial (1 seat). Upgrade to a paid band to add your whole team:"
              : "No payment method on file yet. Pick a band to get started:"}
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
