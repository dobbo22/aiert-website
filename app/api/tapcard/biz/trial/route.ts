import { NextRequest, NextResponse } from "next/server";
import { addAdmin, createOrg, setOrgBilling } from "@/lib/tapcardBiz";
import { createLoginToken } from "@/lib/tapcardBizAuth";
import { sendBizLoginEmail } from "@/lib/tapcardBizEmail";
import { TRIAL_SEAT_LIMIT } from "@/lib/tapcardBizBilling";

interface Body {
  companyName?: string;
  email?: string;
}

// The free path alongside the paid seat bands (app/api/tapcard/biz/checkout)
// — one seat, no Stripe involved at all, so someone can try the template
// editor and the claim flow on themselves before paying for the team. Mirrors
// what the Stripe webhook does on a real purchase (activate the org, make
// the signer-upper the first admin, email them a sign-in link) but skips
// checkout entirely. One trial doesn't block a real purchase afterwards —
// upgrading just means picking a paid band from the billing page, which
// goes through the normal Stripe Checkout flow and overwrites seat_band.
export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body;
  const companyName = (body.companyName ?? "").trim().slice(0, 200);
  const email = (body.email ?? "").trim().toLowerCase().slice(0, 200);

  if (!companyName || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "company name and a valid email are required" }, { status: 400 });
  }

  const org = await createOrg(companyName);
  await setOrgBilling(org.id, { billing_status: "active", seat_band: "trial", seat_limit: TRIAL_SEAT_LIMIT });
  await addAdmin(org.id, email, "admin");

  const token = await createLoginToken(email, org.id);
  await sendBizLoginEmail(email, `https://tapcard.aiert.co.uk/api/biz/login/${token}`).catch(() => {});

  return NextResponse.json({ ok: true });
}
