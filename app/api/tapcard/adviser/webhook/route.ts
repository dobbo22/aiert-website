import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/tapcardBizBilling";
import { applyCheckoutCompleted, applySubscription, type SubLike } from "@/lib/tapcardAdviserBilling";

// Stripe events for ADVISER subscriptions only. It has its own endpoint and signing secret (TAPCARD_ADVISER_STRIPE_WEBHOOK_SECRET),
// so TapCard for Business's webhook is untouched. Events that aren't for an adviser are ignored.
export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.TAPCARD_ADVISER_STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "not configured" }, { status: 500 });
  if (!signature) return NextResponse.json({ error: "missing signature" }, { status: 400 });
  const body = await req.text();
  let event: Stripe.Event;
  try { event = stripe().webhooks.constructEvent(body, signature, secret); } catch { return NextResponse.json({ error: "invalid signature" }, { status: 400 }); }

  const subOf = async (id: string) => (await stripe().subscriptions.retrieve(id)) as unknown as SubLike;
  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      const adviserId = s.metadata?.adviser_id;
      const subId = typeof s.subscription === "string" ? s.subscription : s.subscription?.id;
      if (adviserId && subId) await applyCheckoutCompleted(adviserId, typeof s.customer === "string" ? s.customer : s.customer?.id ?? null, await subOf(subId));
      break;
    }
    case "invoice.paid":
    case "invoice.payment_failed": {
      const inv = event.data.object as Stripe.Invoice;
      const ref = inv.parent?.subscription_details?.subscription;
      const subId = typeof ref === "string" ? ref : ref?.id;
      if (subId) await applySubscription(await subOf(subId));
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await applySubscription(event.data.object as unknown as SubLike);
      break;
    default:
      break;
  }
  return NextResponse.json({ received: true });
}
