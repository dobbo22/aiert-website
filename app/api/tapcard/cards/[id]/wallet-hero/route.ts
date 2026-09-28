import { NextResponse } from "next/server";
import sharp from "sharp";
import { getCard } from "@/lib/tapcardDb";

// heroImage for the Google Wallet pass (lib/googleWallet.ts) — a 1032x812
// banner, same idea as the blurred-photo banner on the public card page and
// the in-app card: the person's photo, softly blurred, filling the width.
// Cards with no photo use the static brand-gradient PNG instead (see
// googleWallet.ts), so this route only ever runs for cards that have one.
//
// The URL is stable per card (no per-upload token), so it's cached with a
// short max-age; Wallet re-fetches images periodically rather than once.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getCard(id);
  if (!card?.photo_url) return NextResponse.json({ error: "no photo" }, { status: 404 });

  const photoRes = await fetch(card.photo_url);
  if (!photoRes.ok) return NextResponse.json({ error: "photo unavailable" }, { status: 502 });
  const photoBuffer = Buffer.from(await photoRes.arrayBuffer());

  const hero = await sharp(photoBuffer)
    .resize(1032, 812, { fit: "cover" })
    .blur(28)
    // Slight darken so a bright photo doesn't wash out; matches the fade
    // used on the public card page banner.
    .modulate({ brightness: 0.85 })
    .png()
    .toBuffer();

  return new NextResponse(new Uint8Array(hero), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
