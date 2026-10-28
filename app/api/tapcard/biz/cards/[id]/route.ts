import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { deleteCard } from "@/lib/tapcardDb";
import { assignStaffShop, getOrgCardPhoto, getStaffCardInScope, markCardRemovedByCompany } from "@/lib/tapcardBiz";
import { releaseShopCard } from "@/lib/tapcardBizLocations";
import { requireBizSession, requireBizUser } from "@/lib/tapcardBizSession";

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
  // A shop whose card is removed is waiting for its manager again, so a fresh invite link can be made for it.
  await releaseShopCard(session.orgId, id);
  if (photoUrl) await del(photoUrl).catch(() => {});
  return NextResponse.json({ ok: true });
}

// An admin tells TapCard which shop a staff card belongs to (so that shop's manager sees it), or clears it with locationId: null.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireBizSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { locationId?: string | null } | null;
  if (!body || !("locationId" in body)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const ok = await assignStaffShop(session.orgId, id, typeof body.locationId === "string" && body.locationId ? body.locationId : null);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
