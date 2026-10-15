import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/tapcardBizBilling";

// TEMPORARY: reports which Stripe account the site's key belongs to (id and live/test only, never the key). Removed straight after use.
export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("k") !== "77c3f227aca170d3ad36a869") return NextResponse.json({ error: "no" }, { status: 404 });
  try {
    const s = stripe();
    const bal = await s.balance.retrieve();
    type Acct = { id?: string; business_profile?: { name?: string }; settings?: { dashboard?: { display_name?: string } } };
    let acct: Acct | null = null;
    try {
      const raw = (await s.rawRequest("GET", "/v1/account")) as unknown as { json?: () => Promise<Acct> } & Acct;
      acct = typeof raw.json === "function" ? await raw.json() : raw;
    } catch { /* the key may not be allowed to read its account; the balance still says live or test */ }
    const prices = await s.prices.list({ limit: 20, active: true });
    return NextResponse.json({
      livemode: bal.livemode,
      account: acct?.id ?? null,
      name: acct?.business_profile?.name ?? acct?.settings?.dashboard?.display_name ?? null,
      prices: prices.data.map((p) => ({ id: p.id, amount: (p.unit_amount ?? 0) / 100, currency: p.currency, interval: p.recurring?.interval ?? null, nickname: p.nickname, product: p.product })),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}
