import { rateLimited } from "@/lib/rateLimit";
import { NextRequest, NextResponse } from "next/server";
import { findSiteLogo, normalizeDomain } from "@/lib/siteIcon";
import { orgLogoUrlForDomain } from "@/lib/tapcardBiz";

// Company logo for a card's website: tapcard.aiert.co.uk/api/logo?domain=example.com
// — the logo the site declares or shows in its header (lib/siteIcon
// findSiteLogo), shown across the card banner by the public card page and
// both apps. 404 when the site has no real logo, so callers fall back to
// the small icon from /api/favicon. Nothing is stored: like /api/favicon,
// the CDN caches the response.

export async function GET(req: NextRequest) {
  if (rateLimited(req, "logo", 60)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const domain = normalizeDomain(req.nextUrl.searchParams.get("domain") ?? "");
  if (!domain) return NextResponse.json({ error: "invalid domain" }, { status: 400 });

  // A TapCard for Business company that uploaded its logo: that one, ahead of anything read from its website.
  const own = await orgLogoUrlForDomain(domain).catch(() => null);
  if (own) {
    const res = await fetch(own, { signal: AbortSignal.timeout(4000) }).catch(() => null);
    if (res?.ok) {
      const bytes = Buffer.from(await res.arrayBuffer());
      if (bytes.length <= 2 * 1024 * 1024) {
        return new NextResponse(new Uint8Array(bytes), {
          headers: {
            "content-type": res.headers.get("content-type") ?? "image/png",
            "cache-control": "public, max-age=300, s-maxage=300",
            "content-security-policy": "default-src 'none'; sandbox",
            "x-content-type-options": "nosniff",
            "access-control-allow-origin": "*",
          },
        });
      }
    }
  }
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
      // Public images: readable cross-origin so the card page can pick the plate colour behind a logo from its pixels.
      "access-control-allow-origin": "*",
    },
  });
}
