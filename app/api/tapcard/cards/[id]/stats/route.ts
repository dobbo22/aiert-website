import { NextRequest, NextResponse } from "next/server";
import { getCard } from "@/lib/tapcardDb";
import { followerCount, installCount } from "@/lib/tapcardOffers";

// Same no-auth model as the rest of TapCard's API (see cards/route.ts) — the
// unguessable id is the credential, and view/save counts carry no more
// sensitivity than the card fields already exposed at the public /c/[id] page.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getCard(id);
  if (!card) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({
    views: card.view_count,
    saves: card.save_count,
    followers: await followerCount(id),
    // People who installed TapCard after scanning this card's QR code or opening its link.
    installs: await installCount(id),
    // Views that came from scanning the QR code, and from a plain card link.
    qrViews: card.qr_view_count,
    linkViews: Math.max(0, card.view_count - card.qr_view_count),
  });
}
