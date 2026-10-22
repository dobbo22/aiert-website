import { NextRequest, NextResponse } from "next/server";
import { rateLimited } from "@/lib/rateLimit";
import { saveReport } from "@/lib/tapcardVerify";

// POST { card, reason, details }: anyone can report a card, offer or news. Saved for the admin, and emailed to support.
export async function POST(req: NextRequest) {
  if (rateLimited(req, "report", 6, 10 * 60_000)) return NextResponse.json({ error: "Too many reports. Try later." }, { status: 429 });
  const b = (await req.json().catch(() => null)) as { card?: string; reason?: string; details?: string } | null;
  const card = String(b?.card ?? "").trim();
  if (!/^[A-Za-z0-9_-]{16,40}$/.test(card)) return NextResponse.json({ error: "card required" }, { status: 400 });
  const ok = await saveReport(card, String(b?.reason ?? "other"), String(b?.details ?? "")).catch(() => false);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
