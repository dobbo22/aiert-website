import { NextRequest, NextResponse } from "next/server";
import { findAdminOrgsByEmail } from "@/lib/tapcardBiz";
import { createLoginToken } from "@/lib/tapcardBizAuth";
import { sendBizLoginEmail } from "@/lib/tapcardBizEmail";

interface Body {
  email?: string;
}

// Requests a magic link for an already-provisioned admin (first-ever admin
// signup happens via the Stripe checkout webhook instead — see
// app/api/tapcard/biz/webhook/route.ts). Always responds the same way
// whether or not the email is a real admin, so this can't be used to probe
// which companies use TapCard for Business.
export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body;
  const email = (body.email ?? "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "a valid email is required" }, { status: 400 });
  }

  const admins = await findAdminOrgsByEmail(email);
  if (admins.length > 0) {
    const token = await createLoginToken(email, admins[0].org_id);
    const origin = "https://tapcard.aiert.co.uk";
    await sendBizLoginEmail(email, `${origin}/api/biz/login/${token}`).catch((e) => console.error("tapcard biz email failed:", e));
  }

  return NextResponse.json({ ok: true });
}
