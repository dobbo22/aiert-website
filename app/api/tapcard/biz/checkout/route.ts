import { NextRequest, NextResponse } from "next/server";
import { bandById, stripe } from "@/lib/tapcardBizBilling";
import { createOrg, getOrg, setOrgBilling } from "@/lib/tapcardBiz";
import { requireBizSession } from "@/lib/tapcardBizSession";

interface Body {
  companyName?: string;
  email?: string;
  bandId?: string;
}

// Creates the org row (billing_status stays 'incomplete' until the webhook
// confirms payment) and a Stripe Checkout session for the chosen seat band.
// The buyer becomes the org's first admin once checkout.session.completed
// fires — see app/api/tapcard/biz/webhook/route.ts.
//
// Also doubles as the "upgrade from trial" path: a signed-in admin hits
// this same route (no companyName/new-org fields needed, just a bandId) and
// it reuses their existing org instead of creating a new one — the trial's
// one real card and its data carry straight over, nothing is recreated.
export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body;
  const band = body.bandId ? bandById(body.bandId) : undefined;
  if (!band || !band.priceId) {
    return NextResponse.json({ error: "invalid or unavailable seat band" }, { status: 400 });
  }

  const session = await requireBizSession();
  const existingOrg = session ? await getOrg(session.orgId) : null;

  let orgId: string;
  let email: string;
  if (existingOrg) {
    orgId = existingOrg.id;
    email = session!.email;
  } else {
    const companyName = (body.companyName ?? "").trim().slice(0, 200);
    email = (body.email ?? "").trim().toLowerCase().slice(0, 200);
    if (!companyName || !email || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "company name and a valid email are required" }, { status: 400 });
    }
    const org = await createOrg(companyName);
    orgId = org.id;
  }

  await setOrgBilling(orgId, { seat_band: band.id, seat_limit: band.maxSeats });

  const origin = req.nextUrl.origin.includes("localhost") ? req.nextUrl.origin : "https://tapcard.aiert.co.uk";
  const checkoutSession = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer_email: email,
    client_reference_id: orgId,
    line_items: [{ price: band.priceId, quantity: 1 }],
    success_url: `${origin}/business/welcome?org=${orgId}`,
    cancel_url: existingOrg ? `${origin}/business/admin/billing?canceled=1` : `${origin}/business?canceled=1`,
    metadata: { orgId, adminEmail: email },
  });

  if (!checkoutSession.url) return NextResponse.json({ error: "could not start checkout" }, { status: 502 });
  return NextResponse.json({ url: checkoutSession.url });
}
