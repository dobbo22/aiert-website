import { NextRequest, NextResponse } from "next/server";
import { rateLimited } from "@/lib/rateLimit";
import { recordFunnel } from "@/lib/tapcardFunnel";

// The apps report that someone reached a setup step: {step, platform, route} only. Nothing that could identify the
// person or the card is sent or stored (see lib/tapcardFunnel.ts).
export async function POST(req: NextRequest) {
  if (rateLimited(req, "funnel", 120)) return NextResponse.json({ ok: false }, { status: 429 });
  const body = (await req.json().catch(() => null)) as { step?: unknown; platform?: unknown; route?: unknown } | null;
  const ok = await recordFunnel(String(body?.step ?? ""), String(body?.platform ?? ""), String(body?.route ?? "")).catch(() => false);
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
}
