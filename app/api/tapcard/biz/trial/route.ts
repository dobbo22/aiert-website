import { NextRequest, NextResponse } from "next/server";
import { addAdmin, createOrg, domainHasUsedTrial, domainOf, markTrialUsed, setOrgBilling } from "@/lib/tapcardBiz";
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
//
// One trial per email domain (lib/tapcardBiz.ts's domainOf/trial_used) —
// otherwise someone could sign up every colleague individually and never
// pay. The flag is permanent once set, even if that org later upgrades.
export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body;
  const companyName = (body.companyName ?? "").trim().slice(0, 200);
  const email = (body.email ?? "").trim().toLowerCase().slice(0, 200);

  if (!companyName || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "company name and a valid email are required" }, { status: 400 });
  }

  const domain = domainOf(email);
  if (await domainHasUsedTrial(domain)) {
    return NextResponse.json(
      { error: "A free trial has already been used for this company — sign in instead, or pick a paid band." },
      { status: 409 }
    );
  }

  const org = await createOrg(companyName, domain);
  await setOrgBilling(org.id, { billing_status: "active", seat_band: "trial", seat_limit: TRIAL_SEAT_LIMIT });
  await markTrialUsed(org.id);
  await addAdmin(org.id, email, "admin");

  const token = await createLoginToken(email, org.id);
  await sendBizLoginEmail(email, `https://tapcard.aiert.co.uk/api/biz/login/${token}`).catch((e) => console.error("tapcard biz email failed:", e));

  return NextResponse.json({ ok: true });
}
