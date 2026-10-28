import { NextRequest, NextResponse } from "next/server";
import { rateLimited } from "@/lib/rateLimit";
import { MAX_ADMINS, addAdmin, findAdminOrgsByEmail, getOrg, listAdmins, removeAdminById } from "@/lib/tapcardBiz";
import { createLoginToken } from "@/lib/tapcardBizAuth";
import { sendBizAdminInviteEmail } from "@/lib/tapcardBizEmail";
import { requireBizSession } from "@/lib/tapcardBizSession";

// A company's admins. Any signed-in admin can add another (up to MAX_ADMINS) and the new admin is emailed a sign-in link, which also
// confirms their mailbox. The first admin (the one who signed up) is the owner and cannot be removed here; nobody can remove themselves,
// so a company always keeps at least its owner. To change the owner, the owner emails enquiries@aiert.co.uk.

export async function GET() {
  const session = await requireBizSession();
  if (!session) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const admins = await listAdmins(session.orgId);
  return NextResponse.json({ admins: admins.map((a, i) => ({ id: a.id, email: a.email, owner: i === 0, confirmed: !!a.confirmed_at, you: a.email === session.email })), max: MAX_ADMINS });
}

export async function POST(req: NextRequest) {
  const session = await requireBizSession();
  if (!session) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  if (session.support) return NextResponse.json({ error: "support access cannot change admins" }, { status: 403 });
  if (rateLimited(req, "biz-add-admin", 10, 60 * 60_000)) return NextResponse.json({ error: "Too many attempts. Try again in an hour." }, { status: 429 });
  const body = (await req.json().catch(() => null)) as { email?: string } | null;
  const email = (body?.email ?? "").trim().toLowerCase().slice(0, 200);
  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Enter a full email address." }, { status: 400 });
  const org = await getOrg(session.orgId);
  if (!org) return NextResponse.json({ error: "not found" }, { status: 404 });
  const admins = await listAdmins(session.orgId);
  if (admins.some((a) => a.email === email)) return NextResponse.json({ error: "That person is already an admin." }, { status: 409 });
  if (admins.length >= MAX_ADMINS) return NextResponse.json({ error: `A company can have up to ${MAX_ADMINS} admins. Remove one first.` }, { status: 409 });
  // An address signs in to one company at a time, so it can't also run another company's account.
  if ((await findAdminOrgsByEmail(email)).length > 0) return NextResponse.json({ error: "That address already runs another TapCard for Business account. Use a different address." }, { status: 409 });
  await addAdmin(session.orgId, email, "admin");
  const token = await createLoginToken(email, session.orgId);
  await sendBizAdminInviteEmail(email, org.name, session.email, `https://tapcard.aiert.co.uk/api/biz/login/${token}`).catch((e) => console.error("tapcard biz admin email failed:", e));
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
