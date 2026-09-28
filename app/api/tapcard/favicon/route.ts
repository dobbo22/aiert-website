import { NextRequest, NextResponse } from "next/server";
import { findSiteIcon, normalizeDomain } from "@/lib/siteIcon";

// Company icon for a card's website: tapcard.aiert.co.uk/api/favicon?domain=example.com
// Used by the public card page and both apps in place of Google's favicon
// service (see lib/siteIcon). `noico=1` skips .ico results, for consumers
// that can't decode them (Google Wallet).

export async function GET(req: NextRequest) {
  const domain = normalizeDomain(req.nextUrl.searchParams.get("domain") ?? "");
  if (!domain) return NextResponse.json({ error: "invalid domain" }, { status: 400 });

  const icon = await findSiteIcon(domain, { allowIco: req.nextUrl.searchParams.get("noico") !== "1" });
  if (!icon) {
    return new NextResponse(null, { status: 404, headers: { "cache-control": "public, s-maxage=86400" } });
  }
  return new NextResponse(new Uint8Array(icon.bytes), {
    headers: {
      "content-type": icon.contentType,
      "cache-control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800",
      "content-security-policy": "default-src 'none'; sandbox",
      "x-content-type-options": "nosniff",
    },
  });
}
