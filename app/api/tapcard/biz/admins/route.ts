import { NextRequest, NextResponse } from "next/server";
import { rateLimited } from "@/lib/rateLimit";
import { MAX_ADMINS, MAX_MANAGERS, addAdmin, findAdminOrgsByEmail, getOrg, listAdmins, removeAdminById } from "@/lib/tapcardBiz";
import { createLoginToken } from "@/lib/tapcardBizAuth";
import { sendBizAdminInviteEmail, sendBizManagerInviteEmail } from "@/lib/tapcardBizEmail";
import { listLocations, shopCardLinks } from "@/lib/tapcardBizLocations";
import sql from "@/lib/db";
import { requireBizSession } from "@/lib/tapcardBizSession";

// A company's admins. Any signed-in admin can add another (up to MAX_ADMINS) and the new admin is emailed a sign-in link, which also
// confirms their mailbox. The first admin (the one who signed up) is the owner and cannot be removed here; nobody can remove themselves,
// so a company always keeps at least its owner. To change the owner, the owner emails enquiries@aiert.co.uk.

export async function GET() {
  const session = await requireBizSession();
  if (!session) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const admins = await listAdmins(session.orgId);
  return NextResponse.json({ admins: admins.filter((a) => a.role !== "manager").map((a, i) => ({ id: a.id, email: a.email, owner: i === 0, confirmed: !!a.confirmed_at, you: a.email === session.email })), max: MAX_ADMINS });
}

export async function POST(req: NextRequest) {
  const session = await requireBizSession();
  if (!session) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  if (session.support) return NextResponse.json({ error: "support access cannot change admins" }, { status: 403 });
  if (rateLimited(req, "biz-add-admin", 10, 60 * 60_000)) return NextResponse.json({ error: "Too many attempts. Try again in an hour." }, { status: 429 });
  const body = (await req.json().catch(() => null)) as { email?: string; role?: string; locationIds?: string[] } | null;
  const email = (body?.email ?? "").trim().toLowerCase().slice(0, 200);
  const asManager = body?.role === "manager";
  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Enter a full email address." }, { status: 400 });
  const org = await getOrg(session.orgId);
  if (!org) return NextResponse.json({ error: "not found" }, { status: 404 });
  const admins = await listAdmins(session.orgId);
  if (admins.some((a) => a.email === email)) return NextResponse.json({ error: "That person is already an admin." }, { status: 409 });
  if (asManager) {
    if (admins.filter((a) => a.role === "manager").length >= MAX_MANAGERS) return NextResponse.json({ error: `A company can have up to ${MAX_MANAGERS} managers.` }, { status: 409 });
  } else if (admins.filter((a) => a.role !== "manager").length >= MAX_ADMINS) {
    return NextResponse.json({ error: `A company can have up to ${MAX_ADMINS} admins. Remove one first.` }, { status: 409 });
  }
  // A manager is for particular shops of this company.
  let shops: { id: string; name: string }[] = [];
  if (asManager) {
    const mine = await listLocations(session.orgId);
    const wanted = Array.isArray(body?.locationIds) ? body!.locationIds!.filter((x) => typeof x === "string") : [];
    shops = mine.filter((l) => wanted.includes(l.id)).map((l) => ({ id: l.id, name: `${l.name}${l.address ? `, ${l.address.split(",").slice(-3, -1).join(" ").trim()}` : ""}` }));
    if (!shops.length) return NextResponse.json({ error: "Choose at least one of your shops for this manager." }, { status: 400 });
  }
  // An address signs in to one company at a time, so it can't also run another company's account.
  if ((await findAdminOrgsByEmail(email)).length > 0) return NextResponse.json({ error: "That address already runs another TapCard for Business account. Use a different address." }, { status: 409 });
  await addAdmin(session.orgId, email, asManager ? "manager" : "admin", shops.map((x) => x.id));
  const token = await createLoginToken(email, session.orgId);
  const link = `https://tapcard.aiert.co.uk/api/biz/login/${token}`;
  if (asManager) await sendBizManagerInviteEmail(email, org.name, session.email, link, shops.map((x) => x.name), await shopCardLinks(org, shops.map((x) => x.id), email).catch(() => [])).catch((e) => console.error("tapcard biz manager email failed:", e));
  else await sendBizAdminInviteEmail(email, org.name, session.email, link).catch((e) => console.error("tapcard biz admin email failed:", e));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await requireBizSession();
  if (!session) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  if (session.support) return NextResponse.json({ error: "support access cannot change admins" }, { status: 403 });
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const admins = await listAdmins(session.orgId);
  const target = admins.find((a) => a.id === id);
  if (!target) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (target.email === session.email) return NextResponse.json({ error: "You can't remove yourself. Ask another admin to do it." }, { status: 400 });
  if (admins[0]?.id === target.id) return NextResponse.json({ error: "The first admin (the owner) can't be removed here. Email enquiries@aiert.co.uk to hand over the company." }, { status: 400 });
  await removeAdminById(session.orgId, id);
  return NextResponse.json({ ok: true });
}

// Change which shops a manager looks after.
export async function PATCH(req: NextRequest) {
  const session = await requireBizSession();
  if (!session) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  if (session.support) return NextResponse.json({ error: "support access cannot change admins" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { id?: string; locationIds?: string[] } | null;
  const admins = await listAdmins(session.orgId);
  const target = admins.find((a) => a.id === body?.id && a.role === "manager");
  if (!target) return NextResponse.json({ error: "not found" }, { status: 404 });
  const mine = new Set((await listLocations(session.orgId)).map((l) => l.id));
  const ids = (Array.isArray(body?.locationIds) ? body!.locationIds! : []).filter((x) => mine.has(x));
  if (!ids.length) return NextResponse.json({ error: "Choose at least one shop." }, { status: 400 });
  await sql`UPDATE tapcard_biz_admins SET location_ids = ${ids} WHERE id = ${target.id} AND org_id = ${session.orgId}`;
  return NextResponse.json({ ok: true });
}
