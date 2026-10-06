import { NextResponse } from "next/server";
import { getOrg } from "@/lib/tapcardBiz";
import { requireBizSession } from "@/lib/tapcardBizSession";
import { stripe } from "@/lib/tapcardBizBilling";

export async function POST() {
  const session = await requireBizSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const org = await getOrg(session.orgId);
  if (!org?.stripe_customer_id) return NextResponse.json({ error: "no billing account yet" }, { status: 400 });

  const portal = await stripe().billingPortal.sessions.create({
    customer: org.stripe_customer_id,
    return_url: "https://tapcard.aiert.co.uk/business/admin/billing",
  });

  return NextResponse.json({ url: portal.url });
}
