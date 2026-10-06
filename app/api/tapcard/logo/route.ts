import { NextRequest, NextResponse } from "next/server";
import { findSiteLogo, normalizeDomain } from "@/lib/siteIcon";

// Company logo for a card's website: tapcard.aiert.co.uk/api/logo?domain=example.com
// — the logo the site declares or shows in its header (lib/siteIcon
// findSiteLogo), shown across the card banner by the public card page and
// both apps. 404 when the site has no real logo, so callers fall back to
// the small icon from /api/favicon. Nothing is stored: like /api/favicon,
// the CDN caches the response.

export async function GET(req: NextRequest) {
  const domain = normalizeDomain(req.nextUrl.searchParams.get("domain") ?? "");
  if (!domain) return NextResponse.json({ error: "invalid domain" }, { status: 400 });

  const logo = await findSiteLogo(domain, { iconFallback: false }).catch(() => null);
  if (!logo) {
    return new NextResponse(null, { status: 404, headers: { "cache-control": "public, s-maxage=86400" } });
  }
  return new NextResponse(new Uint8Array(logo.bytes), {
    headers: {
      "content-type": logo.contentType,
      "cache-control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800",
      "content-security-policy": "default-src 'none'; sandbox",
      "x-content-type-options": "nosniff",
    },
  });
}
