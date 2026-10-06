import { NextRequest, NextResponse } from "next/server";
import { bandById, stripe } from "@/lib/tapcardBizBilling";
import { createOrg, setOrgBilling } from "@/lib/tapcardBiz";

interface Body {
  companyName?: string;
  email?: string;
  bandId?: string;
}

// Creates the org row (billing_status stays 'incomplete' until the webhook
// confirms payment) and a Stripe Checkout session for the chosen seat band.
// The buyer becomes the org's first admin once checkout.session.completed
// fires — see app/api/tapcard/biz/webhook/route.ts.
export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body;
  const companyName = (body.companyName ?? "").trim().slice(0, 200);
  const email = (body.email ?? "").trim().toLowerCase().slice(0, 200);
  const band = body.bandId ? bandById(body.bandId) : undefined;

  if (!companyName || !email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "company name and a valid email are required" }, { status: 400 });
  }
  if (!band || !band.priceId) {
    return NextResponse.json({ error: "invalid or unavailable seat band" }, { status: 400 });
  }

  const org = await createOrg(companyName);
  await setOrgBilling(org.id, { seat_band: band.id, seat_limit: band.maxSeats });

  const origin = req.nextUrl.origin.includes("localhost") ? req.nextUrl.origin : "https://tapcard.aiert.co.uk";
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer_email: email,
    client_reference_id: org.id,
    line_items: [{ price: band.priceId, quantity: 1 }],
    success_url: `${origin}/business/welcome?org=${org.id}`,
    cancel_url: `${origin}/business?canceled=1`,
    metadata: { orgId: org.id, adminEmail: email },
  });

  if (!session.url) return NextResponse.json({ error: "could not start checkout" }, { status: 502 });
  return NextResponse.json({ url: session.url });
}
