import { requireBizSession } from "@/lib/tapcardBizSession";
import { MAX_ADMINS, listAdmins } from "@/lib/tapcardBiz";
import AdminsManager from "./AdminsManager";
import SupportAccess from "./SupportAccess";
import { supportAccessUntil } from "@/lib/tapcardBizSupport";

export default async function BizAdminsPage() {
  const session = await requireBizSession();
  if (!session) return null;
  const admins = await listAdmins(session.orgId);
  const until = (await supportAccessUntil(session.orgId).catch(() => null))?.toISOString() ?? null;
  return (
    <>
      <AdminsManager
        max={MAX_ADMINS}
        admins={admins.map((a, i) => ({ id: a.id, email: a.email, owner: i === 0, confirmed: !!a.confirmed_at, you: a.email === session.email }))}
      />
      {!session.support && <SupportAccess until={until} />}
    </>
  );
}
