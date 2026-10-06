import { requireBizSession } from "@/lib/tapcardBizSession";
import { getOrg, listEmployees } from "@/lib/tapcardBiz";
import EmployeeImport from "./EmployeeImport";
import EmployeePhoto from "./EmployeePhoto";

export default async function BizEmployeesPage() {
  const session = await requireBizSession();
  if (!session) return null;
  const org = await getOrg(session.orgId);
  if (!org) return null;

  const employees = await listEmployees(org.id);

  return (
    <div className="space-y-8">
      <EmployeeImport billingActive={org.billing_status === "active"} />

      <div className="rounded-2xl bg-charcoal ring-1 ring-white/10">
        <table className="w-full text-left text-cloud">
          <thead>
            <tr className="border-b border-slate text-sm text-mist">
              <th className="px-4 py-3">Photo</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-mist">
                  No employees added yet.
                </td>
              </tr>
            )}
            {employees.map((e) => (
              <tr key={e.id} className="border-b border-slate/50">
                <td className="px-4 py-3">
                  <EmployeePhoto employeeId={e.id} name={e.name} initialUrl={e.photo_url} />
                </td>
                <td className="px-4 py-3">{e.name}</td>
                <td className="px-4 py-3">{e.email}</td>
                <td className="px-4 py-3">{e.title}</td>
                <td className="px-4 py-3">
                  {e.claimed_at ? (
                    <span className="text-teal">Claimed</span>
                  ) : (
                    <span className="text-gold">Invited</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
