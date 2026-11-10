import { NextRequest, NextResponse } from "next/server";
import { rateLimited } from "@/lib/rateLimit";
import { siteDetails } from "@/lib/tapcardSiteDetails";

// GET ?site=hobartcapital.com -> the company name, address, phone, social profiles and hours read from that site's home page.
// Public facts only, rate limited, nothing stored. Used by the App Clip's "I work there" card to fill in more than the website.
export async function GET(req: NextRequest) {
  if (rateLimited(req, "site-details", 10)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const site = (req.nextUrl.searchParams.get("site") ?? "").trim().slice(0, 200);
  if (!/^(https?:\/\/)?[^\s/]+\.[a-z]{2,}(\/\S*)?$/i.test(site)) return NextResponse.json({ error: "site" }, { status: 400 });
  const details = await siteDetails(site).catch(() => null);
  return NextResponse.json(details ?? {}, { headers: { "Cache-Control": "private, max-age=300" } });
}
