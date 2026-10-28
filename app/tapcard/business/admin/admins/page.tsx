import { requireBizSession } from "@/lib/tapcardBizSession";
import { MAX_ADMINS, MAX_MANAGERS, listAdmins } from "@/lib/tapcardBiz";
import { listLocations } from "@/lib/tapcardBizLocations";
import AdminsManager from "./AdminsManager";
import SupportAccess from "./SupportAccess";
import { supportAccessUntil } from "@/lib/tapcardBizSupport";

export default async function BizAdminsPage() {
  const session = await requireBizSession();
  if (!session) return null;
  const everyone = await listAdmins(session.orgId);
  const admins = everyone.filter((a) => a.role !== "manager");
  const managers = everyone.filter((a) => a.role === "manager");
  const locations = await listLocations(session.orgId).catch(() => []);
  const town = (address: string, name: string) => {
    const parts = address.split(",").map((p) => p.replace(/[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}/i, "").trim()).filter(Boolean);
    return (parts.length >= 2 ? parts[1] : parts[0]) || name;
  };
  const until = (await supportAccessUntil(session.orgId).catch(() => null))?.toISOString() ?? null;
  return (
    <>
      <AdminsManager
        max={MAX_ADMINS}
        maxManagers={MAX_MANAGERS}
        admins={admins.map((a, i) => ({ id: a.id, email: a.email, owner: i === 0, confirmed: !!a.confirmed_at, you: a.email === session.email }))}
        managers={managers.map((m) => ({ id: m.id, email: m.email, confirmed: !!m.confirmed_at, locationIds: m.location_ids ?? [], canPost: m.can_post !== false }))}
        shops={locations.map((l) => ({ id: l.id, label: town(l.address, l.name) }))}
      />
      {!session.support && <SupportAccess until={until} />}
    </>
  );
}
