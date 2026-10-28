import { NextRequest, NextResponse } from "next/server";
import { addAdmin, claimWelcomeEmail, createOrg, domainHasUsedTrial, domainOf, emailHasUsedTrial, markTrialUsed, setOrgBilling } from "@/lib/tapcardBiz";
import { isFreeMailDomain } from "@/lib/tapcardDomain";
import { createLoginToken } from "@/lib/tapcardBizAuth";
import { sendBizLoginEmail, sendBizWelcomeEmail } from "@/lib/tapcardBizEmail";
import { inviteLink, signInvite } from "@/lib/tapcardBizInvite";
import { TRIAL_DAYS, TRIAL_SEAT_LIMIT } from "@/lib/tapcardBizBilling";

interface Body {
  companyName?: string;
  email?: string;
  name?: string;
}

// The free path alongside the paid seat bands (app/api/tapcard/biz/checkout)
// — one seat, no Stripe involved at all, so someone can try the template
// editor and the claim flow on themselves before paying for the team. Mirrors
// what the Stripe webhook does on a real purchase (activate the org, make
// the signer-upper the first admin, email them a sign-in link) but skips
// checkout entirely. One trial doesn't block a real purchase afterwards —
// upgrading just means choosing a number of locations on the billing page, which
// goes through the normal Stripe Checkout flow and overwrites seat_band.
//
// One trial per email domain (lib/tapcardBiz.ts's domainOf/trial_used) —
// otherwise someone could sign up every colleague individually and never
// pay. The flag is permanent once set, even if that org later upgrades.
export async function POST(req: NextRequest) {
  const parsed = (await req.json().catch(() => null)) as Body | null;
  if (!parsed || typeof parsed !== "object") return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const body: Body = parsed;
  const companyName = (body.companyName ?? "").trim().slice(0, 200);
  const email = (body.email ?? "").trim().toLowerCase().slice(0, 200);
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 100) : "";

  if (!companyName || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "company name and a valid email are required" }, { status: 400 });
  }

  const domain = domainOf(email);
  // Gmail, Outlook and other shared domains: one trial per address (one per domain would give the whole of Gmail a single trial).
  // A company's own domain still gets one trial for the company.
  const shared = isFreeMailDomain(domain);
  if (shared ? await emailHasUsedTrial(email) : await domainHasUsedTrial(domain)) {
    return NextResponse.json(
      { error: "A free trial has already been used for this company — sign in instead, or choose a paid plan." },
      { status: 409 }
    );
  }

  const org = await createOrg(companyName, shared ? "" : domain);
  await setOrgBilling(org.id, {
    billing_status: "active", seat_band: "trial", seat_limit: TRIAL_SEAT_LIMIT,
    current_period_end: new Date(Date.now() + TRIAL_DAYS * 86_400_000),
  });
  await markTrialUsed(org.id);
  await addAdmin(org.id, email, "admin");

  const token = await createLoginToken(email, org.id);
  await sendBizLoginEmail(email, `https://tapcard.aiert.co.uk/api/biz/login/${token}`).catch((e) => console.error("tapcard biz email failed:", e));
  // The how-to-use email, once: the sign-in link above works for 15 minutes; this one is the reference to keep.
  if (await claimWelcomeEmail(org.id, "trial").catch(() => false)) {
    const endsOn = new Date(Date.now() + TRIAL_DAYS * 86_400_000).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    await sendBizWelcomeEmail(email, companyName, { kind: "trial", endsOn, name, cardLink: inviteLink(signInvite(org, { name, email, title: "" })) }).catch((e) => console.error("tapcard biz welcome email failed:", e));
  }

  return NextResponse.json({ ok: true });
}
