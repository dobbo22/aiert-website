import { NextRequest, NextResponse } from "next/server";
import { getCard } from "@/lib/tapcardDb";
import { buildOfferPkpass } from "@/lib/pkpass";
import { codeStatus } from "@/lib/tapcardOffers";
import { rateLimited } from "@/lib/rateLimit";

// Apple Wallet pass for a customer's claimed offer or stamp card. The code is the customer's secret, as on the till QR.
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  if (rateLimited(req, "offer-pass", 30)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const code = (await params).code.toUpperCase();
  const status = await codeStatus(code);
  if (status.state !== "valid" || !status.cardId) return NextResponse.json({ error: "not available" }, { status: 404 });
  const card = await getCard(status.cardId);
  if (!card) return NextResponse.json({ error: "not found" }, { status: 404 });
  const pkpass = await buildOfferPkpass(card, code, status);
  return new NextResponse(new Uint8Array(pkpass), {
    headers: { "Content-Type": "application/vnd.apple.pkpass", "Content-Disposition": `attachment; filename="offer-${code}.pkpass"`, "Cache-Control": "no-store" },
  });
}
