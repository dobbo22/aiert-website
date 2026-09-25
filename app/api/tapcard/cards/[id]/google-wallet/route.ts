import { NextResponse } from "next/server";
import { getCard } from "@/lib/tapcardDb";
import { googleWalletSaveUrl } from "@/lib/googleWallet";

// Android's "Add to Google Wallet": creates/updates the card's pass, then
// redirects to Google's save page. Public like the Apple pass route — it only
// ever exposes what the public card page already shows.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getCard(id);
  if (!card) return NextResponse.json({ error: "not found" }, { status: 404 });
  try {
    const url = await googleWalletSaveUrl(card, `https://tapcard.aiert.co.uk/c/${id}`);
    return NextResponse.redirect(url, 302);
  } catch (err) {
    console.error("google wallet", err);
    return NextResponse.json({ error: "google wallet unavailable" }, { status: 503 });
  }
}
