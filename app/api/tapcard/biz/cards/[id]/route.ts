import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { deleteCard } from "@/lib/tapcardDb";
import { getOrgCardPhoto, getStaffCardInScope, markCardRemovedByCompany } from "@/lib/tapcardBiz";
import { requireBizUser } from "@/lib/tapcardBizSession";

// The admin removes a company card (e.g. someone has left): its link, QR
// code and every forwarded copy stop working. Only cards of the admin's
// own org — personal cards are never reachable from here. A shop manager may remove only the staff cards of their own shops.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireBizUser();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const { found, photoUrl } = session.role === "manager"
    ? await getStaffCardInScope(session.orgId, id, session.locationIds)
    : await getOrgCardPhoto(session.orgId, id);
  if (!found) return NextResponse.json({ error: "not found" }, { status: 404 });

  await markCardRemovedByCompany(id, session.orgId);
  await deleteCard(id);
  if (photoUrl) await del(photoUrl).catch(() => {});
  return NextResponse.json({ ok: true });
}
