import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// TapCard is served on its own subdomain (tapcard.aiert.co.uk) for a clean,
// on-brand link/QR target, but lives inside this same Next.js app/repo
// rather than a separate Vercel project — see the TapCard plan's "fold into
// aiert-website" decision. This rewrites the subdomain onto the existing
// /tapcard (pages) and /api/tapcard (API) route groups; the URL bar keeps
// showing tapcard.aiert.co.uk, only the internal routing changes.
export function proxy(request: NextRequest) {
  const host = request.headers.get("host") || "";

  // TapCard's Universal Links file (see app/api/tapcard/aasa) — on both the
  // TapCard subdomain and www.aiert.co.uk, whose /tapcard/c/* is the same
  // card page. Not on the mailbroom.app hosts.
  if (
    request.nextUrl.pathname === "/.well-known/apple-app-site-association" &&
    (host.startsWith("tapcard.") || /^(www\.)?aiert\.co\.uk$/.test(host.split(":")[0]))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/api/tapcard/aasa";
    return NextResponse.rewrite(url);
  }

  // Same idea for Android App Links (see app/api/tapcard/assetlinks).
  if (request.nextUrl.pathname === "/.well-known/assetlinks.json" && host.startsWith("tapcard.")) {
    const url = request.nextUrl.clone();
    url.pathname = "/api/tapcard/assetlinks";
    return NextResponse.rewrite(url);
  }

  if (!host.startsWith("tapcard.")) {
    return NextResponse.next();
  }

  // Already-prefixed paths pass through: the TapCard for Business pages
  // call /api/tapcard/biz/… from the browser, which must work on this host
  // as well as www.aiert.co.uk — rewriting them again gave
  // /api/tapcard/tapcard/… (a 404, and a signup form stuck on "Please wait").
  if (request.nextUrl.pathname.startsWith("/api/tapcard/")) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = url.pathname.startsWith("/api/")
    ? `/api/tapcard${url.pathname.slice(4)}`
    : `/tapcard${url.pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
