import { rateLimited } from "@/lib/rateLimit";
import { NextRequest, NextResponse } from "next/server";
import { findSiteLinks } from "@/lib/siteLinks";

// The booking / menu / review links a business's own website already has, for the
// card editor's "Found on your website" suggestions. Reads one page, stores nothing.
export async function GET(req: NextRequest) {
  if (rateLimited(req, "site-links", 20)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const website = req.nextUrl.searchParams.get("website") ?? "";
  if (!website || website.length > 200) return NextResponse.json({ links: [], details: {}, branches: [] });
  const address = (req.nextUrl.searchParams.get("address") ?? "").slice(0, 300);
  const name = (req.nextUrl.searchParams.get("name") ?? "").slice(0, 120);
  const { links, details, branches } = await findSiteLinks(website, address, name).catch(() => ({ links: [], details: {}, branches: [] }));
  return NextResponse.json({ links, details, branches }, { headers: { "Cache-Control": "public, max-age=300" } });
}

// The same, from a home page the phone read itself (a site that blocks our servers still opens on a phone). Stores nothing.
export async function POST(req: NextRequest) {
  if (rateLimited(req, "site-links-post", 20)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const body = (await req.json().catch(() => null)) as { website?: string; address?: string; name?: string; url?: string; html?: string } | null;
  const website = body?.website ?? "";
  if (!body || !website || website.length > 200 || typeof body.html !== "string" || typeof body.url !== "string" || body.html.length > 2 * 1024 * 1024) {
    return NextResponse.json({ links: [], details: {}, branches: [] });
  }
  const { links, details, branches } = await findSiteLinks(website, (body.address ?? "").slice(0, 300), (body.name ?? "").slice(0, 120), { html: body.html, url: body.url })
    .catch(() => ({ links: [], details: {}, branches: [] }));
  return NextResponse.json({ links, details, branches });
}
