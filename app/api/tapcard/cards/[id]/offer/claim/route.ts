import { NextRequest, NextResponse } from "next/server";
import { getCard } from "@/lib/tapcardDb";
import { claimOffer } from "@/lib/tapcardOffers";

// A person with the card claims the offer. `claimant` is a random id the app
// keeps on the device, so claiming twice returns the same code (never a second one).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { claimant?: unknown } | null;
  const claimant = typeof body?.claimant === "string" ? body.claimant : "";
  if (claimant.length < 16 || claimant.length > 200) return NextResponse.json({ error: "claimant is required" }, { status: 400 });
  if (!(await getCard(id))) return NextResponse.json({ error: "not found" }, { status: 404 });
  const result = await claimOffer(id, claimant);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.error === "sold_out" ? 409 : 404 });
  return NextResponse.json({ code: result.code, redeemed: result.redeemed, url: `https://tapcard.aiert.co.uk/o/${result.code}` });
}
