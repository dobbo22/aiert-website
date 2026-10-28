import { NextRequest, NextResponse } from "next/server";
import { locationPriceId, stripe } from "@/lib/tapcardBizBilling";
import { MAX_LOCATIONS, MIN_LOCATIONS, cardAllowance } from "@/lib/tapcardBizPricing";
import { createOrg, getOrg, setOrgBilling } from "@/lib/tapcardBiz";
import { requireBizSession } from "@/lib/tapcardBizSession";

interface Body {
  companyName?: string;
  email?: string;
  name?: string;
  /// How many locations to pay for (2 to 100). The Stripe price has volume tiers, so the total follows.
  locations?: number;
}

// Creates the org row (billing_status stays 'incomplete' until the webhook
// confirms payment) and a Stripe Checkout session for the chosen number of locations.
// The buyer becomes the org's first admin once checkout.session.completed
// fires — see app/api/tapcard/biz/webhook/route.ts.
//
// Also doubles as the "upgrade from trial" path: a signed-in admin hits
// this same route (no companyName/new-org fields needed, just a bandId) and
// it reuses their existing org instead of creating a new one — the trial's
// one real card and its data carry straight over, nothing is recreated.
export async function POST(req: NextRequest) {
  const parsed = (await req.json().catch(() => null)) as Body | null;
  if (!parsed || typeof parsed !== "object") return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const body: Body = parsed;
  const locations = Math.floor(Number(body.locations));
  if (!Number.isFinite(locations) || locations < MIN_LOCATIONS || locations > MAX_LOCATIONS) {
    return NextResponse.json({ error: `choose between ${MIN_LOCATIONS} and ${MAX_LOCATIONS} locations (more than ${MAX_LOCATIONS}? email us)` }, { status: 400 });
  }
  const priceId = locationPriceId();
  if (!priceId) return NextResponse.json({ error: "Paid plans are not open yet. Please start the free trial or email enquiries@aiert.co.uk." }, { status: 503 });

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

  await setOrgBilling(orgId, { seat_band: "locations", locations, seat_limit: cardAllowance(locations) });

  const origin = req.nextUrl.origin.includes("localhost") ? req.nextUrl.origin : "https://tapcard.aiert.co.uk";
  const checkoutSession = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer_email: email,
    client_reference_id: orgId,
    // The buyer can still change the number on the Stripe page; the webhook reads the final quantity.
    line_items: [{ price: priceId, quantity: locations, adjustable_quantity: { enabled: true, minimum: MIN_LOCATIONS, maximum: MAX_LOCATIONS } }],
    success_url: `${origin}/business/welcome?org=${orgId}`,
    cancel_url: existingOrg ? `${origin}/business/admin/billing?canceled=1` : `${origin}/business?canceled=1`,
    metadata: { orgId, adminEmail: email, adminName: typeof body.name === "string" ? body.name.trim().slice(0, 100) : "" },
  });

  if (!checkoutSession.url) return NextResponse.json({ error: "could not start checkout" }, { status: 502 });
  return NextResponse.json({ url: checkoutSession.url });
}
