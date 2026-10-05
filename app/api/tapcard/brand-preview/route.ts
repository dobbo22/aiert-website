import { NextRequest, NextResponse } from "next/server";
import { resolveSiteBranding } from "@/lib/siteBrandColor";

// On-demand brand colour + address lookup for a website, without saving a
// card: tapcard.aiert.co.uk/api/brand-preview?website=example.com
// Used by "Add missing details to my contact" so it can look up the
// company's address right away, instead of waiting on the deferred
// resolution that normally runs after a card is saved (see cards/route.ts's
// resolveAndSaveSiteBranding). Same source, same guarantees — address only
// from the site's own schema.org structured data, never scraped free text.

export async function GET(req: NextRequest) {
  const website = (req.nextUrl.searchParams.get("website") ?? "").trim();
  if (!website) return NextResponse.json({ error: "website is required" }, { status: 400 });

  const branding = await resolveSiteBranding(website).catch(() => ({ color: null, address: null }));
  return NextResponse.json(branding, {
    headers: { "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" },
  });
}
