import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/tapcardBizBilling";
import { addAdmin, claimWelcomeEmail, getOrg, getOrgByStripeSubscriptionId, setOrgBilling } from "@/lib/tapcardBiz";
import { createLoginToken } from "@/lib/tapcardBizAuth";
import { sendBizLoginEmail, sendBizWelcomeEmail } from "@/lib/tapcardBizEmail";
import { cardAllowance } from "@/lib/tapcardBizPricing";

/// The number of locations on a per-location subscription (its quantity), and the card allowance that goes with it.
async function locationFields(subscriptionId: string | null | undefined): Promise<{ locations: number; seat_limit: number } | null> {
  if (!subscriptionId) return null;
  const sub = await stripe().subscriptions.retrieve(subscriptionId);
  const qty = sub.items.data[0]?.quantity ?? 0;
  return qty > 0 ? { locations: qty, seat_limit: cardAllowance(qty) } : null;
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.TAPCARD_BIZ_STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "not configured" }, { status: 500 });
  if (!signature) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId = session.client_reference_id ?? session.metadata?.orgId;
      const email = session.metadata?.adminEmail ?? session.customer_details?.email;
      if (!orgId || !email) break;
      const org = await getOrg(orgId);
      if (!org) break;

      await setOrgBilling(orgId, {
        billing_status: "active",
        stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
        stripe_subscription_id: typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null,
        ...(org.seat_band === "locations" ? await locationFields(typeof session.subscription === "string" ? session.subscription : session.subscription?.id) : {}),
      });
      await addAdmin(orgId, email, "admin");

      const token = await createLoginToken(email, orgId);
      const origin = "https://tapcard.aiert.co.uk";
      await sendBizLoginEmail(email, `${origin}/api/biz/login/${token}`).catch((e) => console.error("tapcard biz email failed:", e));
      // The full welcome and how-to-use email, once per paid start (a repeated Stripe event does not send it again).
      const paid = await getOrg(orgId);
      if (paid && (await claimWelcomeEmail(orgId, "paid").catch(() => false))) {
        await sendBizWelcomeEmail(email, paid.name, { kind: "paid", locations: paid.locations || 0, name: session.metadata?.adminName || session.customer_details?.name || "" }).catch((e) => console.error("tapcard biz welcome email failed:", e));
      }
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = typeof invoice.parent?.subscription_details?.subscription === "string"
        ? invoice.parent.subscription_details.subscription
        : invoice.parent?.subscription_details?.subscription?.id;
      if (!subscriptionId) break;
      const org = await getOrgByStripeSubscriptionId(subscriptionId);
      if (!org) break;
      const sub = await stripe().subscriptions.retrieve(subscriptionId);
      await setOrgBilling(org.id, {
        billing_status: "active",
        current_period_end: new Date(sub.items.data[0]?.current_period_end * 1000),
      });
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const org = await getOrgByStripeSubscriptionId(sub.id);
      if (!org) break;
      const status: "active" | "past_due" | "canceled" =
        sub.status === "active" || sub.status === "trialing" ? "active" : sub.status === "past_due" ? "past_due" : "canceled";
      // Changing the number of locations (Stripe checkout or the billing portal) changes what the company may have.
      const qty = sub.items.data[0]?.quantity ?? 0;
      await setOrgBilling(org.id, {
        billing_status: status,
        current_period_end: new Date(sub.items.data[0]?.current_period_end * 1000),
        ...(org.seat_band === "locations" && qty > 0 && status === "active" ? { locations: qty, seat_limit: cardAllowance(qty) } : {}),
      });
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
