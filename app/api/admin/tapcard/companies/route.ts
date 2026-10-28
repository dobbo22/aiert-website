import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminRequest";
import { getOrg } from "@/lib/tapcardBiz";
import { createLoginToken } from "@/lib/tapcardBizAuth";
import { addAdmin, findAdminOrgsByEmail, listAdmins, MAX_ADMINS, MAX_MANAGERS, removeAdminById } from "@/lib/tapcardBiz";
import { listLocations, shopCardLinks } from "@/lib/tapcardBizLocations";
import { sendBizAdminInviteEmail, sendBizLoginEmail, sendBizManagerInviteEmail, sendBizWelcomeEmail } from "@/lib/tapcardBizEmail";
import { cardAllowance } from "@/lib/tapcardBizPricing";
import { createManagedCompany, logSupport, supportAccessOpen, SUPPORT_ACTOR, SUPPORT_PREFIX } from "@/lib/tapcardBizSupport";
import sql from "@/lib/db";

// AIERT's Companies page (admin only): set a company up on its behalf, open a company's admin as support, or make a company free.
// Opening or changing a company needs ITS support-access window to be open (the company allows it on its Admins tab, or AIERT set it
// up and the 30 days have not passed).
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { action?: string; orgId?: string; name?: string; adminEmail?: string; locations?: number; sendEmail?: boolean; email?: string; personName?: string; makeOwner?: boolean } | null;
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  if (body.action === "create") {
    const name = (body.name ?? "").trim(), email = (body.adminEmail ?? "").trim().toLowerCase();
    if (!name || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "A company name and the admin's email are required" }, { status: 400 });
    const org = await createManagedCompany({ name, adminEmail: email, locations: Number(body.locations) || 2 });
    if (body.sendEmail) {
      const token = await createLoginToken(email, org.id);
      await sendBizLoginEmail(email, `https://tapcard.aiert.co.uk/api/biz/login/${token}`).catch((e) => console.error("support setup login email failed", e));
      await sendBizWelcomeEmail(email, org.name, { kind: "paid", locations: Number(body.locations) || 2 }).catch((e) => console.error("support setup welcome email failed", e));
    }
    return NextResponse.json({ ok: true, orgId: org.id });
  }

  const orgId = body.orgId ?? "";
  const org = orgId ? await getOrg(orgId) : null;
  if (!org) return NextResponse.json({ error: "Company not found" }, { status: 404 });
  if (!(await supportAccessOpen(org.id))) {
    return NextResponse.json({ error: "This company has not allowed support access (or it has run out). Ask their admin to switch it on in their Admins tab." }, { status: 403 });
  }

  if (body.action === "open") {
    const token = await createLoginToken(SUPPORT_PREFIX + SUPPORT_ACTOR, org.id);
    return NextResponse.json({ url: `https://tapcard.aiert.co.uk/api/biz/login/${token}` });
  }

  // Adds a shop manager (all of the company's shops) on the company's behalf, e.g. to test the manager's view. Needs the support window
  // like everything else here; the manager is emailed what they can do and a sign-in link.
  if (body.action === "manager") {
    const email = (body.email ?? "").trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Enter the manager's full email address." }, { status: 400 });
    const shops = await listLocations(org.id);
    if (!shops.length) return NextResponse.json({ error: "Add the company's shops first." }, { status: 400 });
    const people = await listAdmins(org.id);
    if (people.some((p) => p.email === email)) return NextResponse.json({ error: "That address is already on this company." }, { status: 409 });
    if (people.filter((p) => p.role === "manager").length >= MAX_MANAGERS) return NextResponse.json({ error: "This company has all its managers." }, { status: 409 });
    if ((await findAdminOrgsByEmail(email)).length > 0) return NextResponse.json({ error: "That address already runs another TapCard for Business account." }, { status: 409 });
    await addAdmin(org.id, email, "manager", shops.map((l) => l.id));
    await logSupport(org.id, SUPPORT_ACTOR, "added a manager", email);
    const token = await createLoginToken(email, org.id);
    await sendBizManagerInviteEmail(email, org.name, "AIERT support", `https://tapcard.aiert.co.uk/api/biz/login/${token}`, shops.map((l) => `${l.name}, ${l.address.split(",").slice(-3, -1).join(" ").trim()}`), await shopCardLinks(org, shops.map((l) => l.id), email).catch(() => [])).catch((e) => console.error("support manager email failed", e));
    return NextResponse.json({ ok: true, shops: shops.length });
  }

  // Adds a company admin (e.g. the owner's own address), optionally making them the owner. The owner is the first admin, so "make owner"
  // dates them before everyone else; the previous owner then stays an ordinary admin who can be removed. They are emailed a sign-in link
  // and, with `sendEmail`, the full welcome.
  if (body.action === "addAdmin") {
    const email = (body.email ?? "").trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Enter the admin's full email address." }, { status: 400 });
    const people = await listAdmins(org.id);
    if (people.some((p) => p.email === email)) return NextResponse.json({ error: "That address is already on this company." }, { status: 409 });
    if (people.filter((p) => p.role !== "manager").length >= MAX_ADMINS) return NextResponse.json({ error: "This company has all its admins." }, { status: 409 });
    if ((await findAdminOrgsByEmail(email)).length > 0) return NextResponse.json({ error: "That address already runs another TapCard for Business account." }, { status: 409 });
    await addAdmin(org.id, email, "admin");
    if (body.makeOwner) {
      await sql`UPDATE tapcard_biz_admins SET created_at = (SELECT min(created_at) FROM tapcard_biz_admins WHERE org_id = ${org.id}) - interval '1 second' WHERE org_id = ${org.id} AND email = ${email}`;
    }
    await logSupport(org.id, SUPPORT_ACTOR, body.makeOwner ? "added the owner" : "added an admin", email);
    const token = await createLoginToken(email, org.id);
    const link = `https://tapcard.aiert.co.uk/api/biz/login/${token}`;
    await sendBizAdminInviteEmail(email, org.name, "AIERT", link).catch((e) => console.error("support admin email failed", e));
    if (body.sendEmail) await sendBizWelcomeEmail(email, org.name, { kind: "paid", locations: org.locations || 1, name: body.personName }).catch((e) => console.error("support admin welcome failed", e));
    return NextResponse.json({ ok: true });
  }

  // Removes a shop manager (never an admin), e.g. after testing. They are signed out at once.
  if (body.action === "removeManager") {
    const email = (body.email ?? "").trim().toLowerCase();
    const person = (await listAdmins(org.id)).find((p) => p.email === email && p.role === "manager");
    if (!person) return NextResponse.json({ error: "No manager with that address on this company." }, { status: 404 });
    await removeAdminById(org.id, person.id);
    await logSupport(org.id, SUPPORT_ACTOR, "removed a manager", email);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "free") {
    const locations = Math.max(1, Math.min(100, Math.floor(Number(body.locations)) || 1));
    await sql`UPDATE tapcard_biz_orgs SET billing_status = 'active', seat_band = 'locations', locations = ${locations}, seat_limit = ${cardAllowance(locations)}, current_period_end = NULL WHERE id = ${org.id}`;
    await logSupport(org.id, SUPPORT_ACTOR, "made free", `${locations} locations`);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
