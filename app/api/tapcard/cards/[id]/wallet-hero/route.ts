import { NextRequest, NextResponse } from "next/server";
import { getCard } from "@/lib/tapcardDb";
import { renderBanner } from "@/lib/tapcardPassArt";
import { parsePassStyle } from "@/lib/tapcardPassStyle";

// The card's Wallet banner, in its chosen style (lib/tapcardPassArt.ts):
// - default: Google Wallet heroImage, 1032x336, no text (Google shows the
//   name and title as pass text).
// - ?apple=1: the Apple strip at 2x, name drawn in — what the apps show as
//   previews in their Wallet style picker, with ?style= to preview each one.
// The card and style are public (they're on the card page), so no auth.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getCard(id);
  if (!card) return NextResponse.json({ error: "not found" }, { status: 404 });

  const apple = req.nextUrl.searchParams.get("apple") === "1";
  const style = parsePassStyle(req.nextUrl.searchParams.get("style"));
  const png = await renderBanner(card, apple
    ? { width: 750, height: 288, withText: true, style }
    : { width: 1032, height: 336, withText: false, style });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
