import { requireBizSession } from "@/lib/tapcardBizSession";
import { MAX_ADMINS, listAdmins } from "@/lib/tapcardBiz";
import AdminsManager from "./AdminsManager";

export default async function BizAdminsPage() {
  const session = await requireBizSession();
  if (!session) return null;
  const admins = await listAdmins(session.orgId);
  return (
    <AdminsManager
      max={MAX_ADMINS}
      admins={admins.map((a, i) => ({ id: a.id, email: a.email, owner: i === 0, confirmed: !!a.confirmed_at, you: a.email === session.email }))}
    />
  );
}
