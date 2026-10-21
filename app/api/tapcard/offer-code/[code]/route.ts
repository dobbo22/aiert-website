import { NextRequest, NextResponse } from "next/server";
import { codeStatus, redeemCode, rewardCode, stampCode } from "@/lib/tapcardOffers";
import { rateLimited } from "@/lib/rateLimit";

// GET: is this code still good, and for a stamp card how many stamps it has (the customer's screen and the staff page both use it)
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  if (rateLimited(req, "offer-code-status", 300)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const { code } = await params;
  const s = await codeStatus(code.toUpperCase());
  return NextResponse.json(s, { headers: { "Cache-Control": "no-store" } });
}

// POST {pin}: the business marks a one-off offer used. Only the first POST per code works.
// POST {pin, action: "stamp" | "reward"}: the business adds a stamp to a stamp card, or gives its reward.
export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  if (rateLimited(req, "offer-code-staff", 60)) return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
  const { code } = await params;
  const body = (await req.json().catch(() => null)) as { pin?: unknown; action?: unknown } | null;
  const c = code.toUpperCase();
  if (body?.action === "stamp" || body?.action === "reward") {
    const r = body.action === "stamp" ? await stampCode(c, body.pin) : await rewardCode(c, body.pin);
    if (r.ok) return NextResponse.json({ ok: true, status: r.status });
    const status = r.error === "bad_pin" ? 403 : r.error === "locked" ? 429 : 409;
    return NextResponse.json({ ok: false, error: r.error, state: r.state, status: r.status }, { status });
  }
  const r = await redeemCode(c, body?.pin);
  if (r.ok) return NextResponse.json({ ok: true, offerText: r.offerText });
  const status = r.error === "bad_pin" ? 403 : r.error === "locked" ? 429 : 409;
  return NextResponse.json({ ok: false, error: r.error, state: r.state }, { status });
}
