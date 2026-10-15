import { NextRequest, NextResponse } from "next/server";
import { recordDemoEvent } from "@/lib/tapcardPrebuilt";

// The emailed link's landing page reports that it was opened, or that an App Store / Play button was tapped.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { token?: unknown; event?: unknown; platform?: unknown } | null;
  const token = String(body?.token ?? "");
  const event = body?.event === "store" ? "store" : body?.event === "opened" ? "opened" : null;
  if (!event) return NextResponse.json({ ok: false }, { status: 400 });
  await recordDemoEvent(token, event, String(body?.platform ?? "")).catch(() => {});
  return NextResponse.json({ ok: true });
}
