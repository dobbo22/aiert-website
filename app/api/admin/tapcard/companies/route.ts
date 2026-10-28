import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminRequest";
import { getOrg } from "@/lib/tapcardBiz";
import { createLoginToken } from "@/lib/tapcardBizAuth";
import { sendBizLoginEmail, sendBizWelcomeEmail } from "@/lib/tapcardBizEmail";
import { cardAllowance } from "@/lib/tapcardBizPricing";
import { createManagedCompany, logSupport, supportAccessOpen, SUPPORT_ACTOR, SUPPORT_PREFIX } from "@/lib/tapcardBizSupport";
import sql from "@/lib/db";

// AIERT's Companies page (admin only): set a company up on its behalf, open a company's admin as support, or make a company free.
// Opening or changing a company needs ITS support-access window to be open (the company allows it on its Admins tab, or AIERT set it
// up and the 30 days have not passed).
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { action?: string; orgId?: string; name?: string; adminEmail?: string; locations?: number; sendEmail?: boolean } | null;
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

  if (body.action === "free") {
    const locations = Math.max(1, Math.min(100, Math.floor(Number(body.locations)) || 1));
    await sql`UPDATE tapcard_biz_orgs SET billing_status = 'active', seat_band = 'locations', locations = ${locations}, seat_limit = ${cardAllowance(locations)}, current_period_end = NULL WHERE id = ${org.id}`;
    await logSupport(org.id, SUPPORT_ACTOR, "made free", `${locations} locations`);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
