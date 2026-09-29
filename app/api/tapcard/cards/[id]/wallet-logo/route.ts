import { NextRequest, NextResponse } from "next/server";
import { getCard } from "@/lib/tapcardDb";
import { findSiteIcon } from "@/lib/siteIcon";
import { renderLogoLockup, renderRoundLogo } from "@/lib/tapcardPassArt";

// Logos for the Google Wallet pass (lib/googleWallet.ts):
// - ?wide=1: the wideLogo across the top, 1280x400 max — the same TapCard
//   mark + company icon + name lockup as the Apple pass header.
// - default: the round logo (list view), 660x660.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getCard(id);
  if (!card) return NextResponse.json({ error: "not found" }, { status: 404 });

  let domain: string | null = null;
  try {
    domain = card.website ? new URL(/^https?:\/\//i.test(card.website) ? card.website : `https://${card.website}`).hostname.replace(/^www\./, "") : null;
  } catch {}
  const icon = domain ? (await findSiteIcon(domain, { allowIco: false }))?.bytes ?? null : null;

  const png = req.nextUrl.searchParams.get("wide") === "1"
    ? await renderLogoLockup(card, icon, 400)
    : await renderRoundLogo(card, icon);

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
