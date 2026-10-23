import { NextRequest, NextResponse } from "next/server";
import { getCard } from "@/lib/tapcardDb";
import { googleWalletOfferSaveUrl } from "@/lib/googleWallet";
import { codeStatus } from "@/lib/tapcardOffers";
import { rateLimited } from "@/lib/rateLimit";

// "Add to Google Wallet" for a customer's claimed offer or stamp card.
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  if (rateLimited(req, "offer-gwallet", 30)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const code = (await params).code.toUpperCase();
  const status = await codeStatus(code);
  if (status.state !== "valid" || !status.cardId) return NextResponse.json({ error: "not available" }, { status: 404 });
  const card = await getCard(status.cardId);
  if (!card) return NextResponse.json({ error: "not found" }, { status: 404 });
  try {
    return NextResponse.redirect(await googleWalletOfferSaveUrl(card, code, status), 302);
  } catch (err) {
    console.error("google wallet offer", err);
    return NextResponse.json({ error: "google wallet unavailable" }, { status: 503 });
  }
}
