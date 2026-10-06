import { NextRequest, NextResponse } from "next/server";
import { findAdminOrgsByEmail } from "@/lib/tapcardBiz";
import { createLoginToken } from "@/lib/tapcardBizAuth";
import { sendBizLoginEmail } from "@/lib/tapcardBizEmail";

interface Body {
  email?: string;
}

// Requests a magic link for an already-provisioned admin (first-ever admin
// signup happens via the Stripe checkout webhook instead — see
// app/api/tapcard/biz/webhook/route.ts, or the free trial). Says plainly
// when no account uses the email (404 no_account) so the admin is sent to
// sign up rather than waiting for an email that never comes — a deliberate
// trade: it does reveal whether an address administers an account.
export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body;
  const email = (body.email ?? "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "a valid email is required" }, { status: 400 });
  }

  const admins = await findAdminOrgsByEmail(email);
  if (admins.length === 0) {
    return NextResponse.json({ error: "no_account" }, { status: 404 });
  }

  const token = await createLoginToken(email, admins[0].org_id);
  const origin = "https://tapcard.aiert.co.uk";
  await sendBizLoginEmail(email, `${origin}/api/biz/login/${token}`).catch((e) => console.error("tapcard biz email failed:", e));

  return NextResponse.json({ ok: true });
}
