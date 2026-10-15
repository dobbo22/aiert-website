import { NextRequest, NextResponse } from "next/server";
import { safeFetch } from "@/lib/siteIcon";

// Can this page be shown inside the demo phone's screen? Many sites (Facebook, Instagram, X, Maps) refuse to be framed
// (X-Frame-Options / CSP frame-ancestors), so the demo shows its own preview for those. The fetch goes through the same
// SSRF-safe helper the site finder uses; only https pages are looked at.
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url") ?? "";
  let u: URL;
  try { u = new URL(raw); } catch { return NextResponse.json({ frameable: false }); }
  if (u.protocol !== "https:" || raw.length > 400) return NextResponse.json({ frameable: false });
  const page = await safeFetch(u.toString()).catch(() => null);
  if (!page) return NextResponse.json({ frameable: false }, { headers: { "Cache-Control": "public, s-maxage=600" } });
  const xfo = (page.res.headers.get("x-frame-options") ?? "").toLowerCase();
  const csp = (page.res.headers.get("content-security-policy") ?? "").toLowerCase();
  const blockedByCsp = /frame-ancestors/.test(csp) && !/frame-ancestors[^;]*(\*|https:\/\/tapcard\.aiert\.co\.uk)/.test(csp);
  const html = (page.res.headers.get("content-type") ?? "").includes("text/html");
  const frameable = html && !xfo && !blockedByCsp;
  return NextResponse.json({ frameable }, { headers: { "Cache-Control": "public, s-maxage=3600" } });
}
