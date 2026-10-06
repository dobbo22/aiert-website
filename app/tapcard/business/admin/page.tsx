import { requireBizSession } from "@/lib/tapcardBizSession";
import { getOrg, listEmployees } from "@/lib/tapcardBiz";

export default async function BizAdminOverview() {
  const session = await requireBizSession();
  if (!session) return null; // layout already redirects to LoginForm
  const org = await getOrg(session.orgId);
  if (!org) return null;

  const employees = await listEmployees(org.id);
  const claimed = employees.filter((e) => e.claimed_at).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
          <p className="text-sm text-mist">Billing</p>
          <p className="mt-1 text-xl font-bold text-cloud capitalize">{org.billing_status}</p>
        </div>
        <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
          <p className="text-sm text-mist">Seats</p>
          <p className="mt-1 text-xl font-bold text-cloud">
            {employees.length} / {org.seat_limit || "–"}
          </p>
        </div>
        <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
          <p className="text-sm text-mist">Cards claimed</p>
          <p className="mt-1 text-xl font-bold text-cloud">{claimed} / {employees.length}</p>
        </div>
      </div>

      {org.billing_status !== "active" && (
        <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-gold/40">
          <p className="text-cloud">
            Billing isn't active yet, so employees can't be added or claim their cards. If you just paid, this
            usually updates within a minute — refresh to check.
          </p>
        </div>
      )}

      <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
        <h2 className="text-lg font-bold text-cloud">Getting started</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-cloud">
          <li>Set your company's card template — logo, colours, social links, and which fields employees can edit.</li>
          <li>Upload your employee list to send everyone their card.</li>
        </ol>
      </div>
    </div>
  );
}
