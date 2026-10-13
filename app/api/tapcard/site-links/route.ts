import { NextRequest, NextResponse } from "next/server";
import { findSiteLinks } from "@/lib/siteLinks";

// The booking / menu / review links a business's own website already has, for the
// card editor's "Found on your website" suggestions. Reads one page, stores nothing.
export async function GET(req: NextRequest) {
  const website = req.nextUrl.searchParams.get("website") ?? "";
  if (!website || website.length > 200) return NextResponse.json({ links: [] });
  const links = await findSiteLinks(website).catch(() => []);
  return NextResponse.json({ links }, { headers: { "Cache-Control": "public, max-age=300" } });
}
