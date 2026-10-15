import { NextRequest, NextResponse } from "next/server";
import { getPrebuilt } from "@/lib/tapcardPrebuilt";

// The prebuilt card for a token from the emailed link; the apps read it on first launch.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const card = await getPrebuilt(token);
  if (!card) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(card, { headers: { "Cache-Control": "no-store" } });
}
