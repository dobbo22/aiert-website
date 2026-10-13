import { NextRequest, NextResponse } from "next/server";
import { codeStatus, redeemCode } from "@/lib/tapcardOffers";

// GET: is this code still good? (the customer's app and the staff page both use it)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const s = await codeStatus(code.toUpperCase());
  return NextResponse.json(s, { headers: { "Cache-Control": "no-store" } });
}

// POST {pin}: the business marks it used. Only the first POST per code works.
export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const body = (await req.json().catch(() => null)) as { pin?: unknown } | null;
  const r = await redeemCode(code.toUpperCase(), body?.pin);
  if (r.ok) return NextResponse.json({ ok: true, offerText: r.offerText });
  const status = r.error === "bad_pin" ? 403 : r.error === "locked" ? 429 : 409;
  return NextResponse.json({ ok: false, error: r.error, state: r.state }, { status });
}
