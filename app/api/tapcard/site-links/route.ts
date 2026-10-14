import { NextRequest, NextResponse } from "next/server";
import { findSiteLinks } from "@/lib/siteLinks";
import { reviewNotes } from "@/lib/reviewLookup";

// The booking / menu / review links a business's own website already has, for the
// card editor's "Found on your website" suggestions. Reads one page, stores nothing.
export async function GET(req: NextRequest) {
  const website = req.nextUrl.searchParams.get("website") ?? "";
  if (!website || website.length > 200) return NextResponse.json({ links: [], details: {}, branches: [] });
  const address = (req.nextUrl.searchParams.get("address") ?? "").slice(0, 300);
  const name = (req.nextUrl.searchParams.get("name") ?? "").slice(0, 120);
  const { links, details, branches } = await findSiteLinks(website, address, name).catch(() => ({ links: [], details: {}, branches: [] }));
  return NextResponse.json({ links, details, branches, ...(req.nextUrl.searchParams.get("debug") === "1" ? { reviewNotes: reviewNotes.splice(0) } : {}) }, { headers: { "Cache-Control": "public, max-age=300" } });
}
