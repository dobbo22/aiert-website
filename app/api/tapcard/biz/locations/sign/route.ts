import { NextRequest, NextResponse } from "next/server";
import { requireBizSession } from "@/lib/tapcardBizSession";
import { saveSign, type SignSettings } from "@/lib/tapcardBizLocations";

// Saves the wording and options of a shop's QR sign (the QR sign page). Admin only; the page prints from the browser.
export async function PUT(req: NextRequest) {
  const session = await requireBizSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = (await req.json().catch(() => null)) as { id?: string; sign?: Partial<SignSettings> } | null;
  if (!b?.id || !b.sign || typeof b.sign !== "object") return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const ok = await saveSign(session.orgId, b.id, b.sign as SignSettings);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
