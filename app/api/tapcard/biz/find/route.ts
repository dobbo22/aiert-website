import { NextRequest, NextResponse } from "next/server";
import { rateLimited } from "@/lib/rateLimit";
import { requireBizSession } from "@/lib/tapcardBizSession";
import { findSiteLinks } from "@/lib/siteLinks";
import { resolveSiteBranding } from "@/lib/siteBrandColor";

// The company setup's "Find your business": what the apps' card building reads from a business's website, for the web admin's
// Card template page: its brand colour, the social profiles on the site, and the address, phone, email, opening hours and booking,
// menu and review links (shown to the admin; the template itself holds the company-wide fields, the rest belong on each location's
// card). Signed-in admins only; stores nothing.
export async function POST(req: NextRequest) {
  const session = await requireBizSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (rateLimited(req, "biz-find", 20)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const body = (await req.json().catch(() => null)) as { website?: string; address?: string; name?: string } | null;
  const website = (body?.website ?? "").trim().slice(0, 200);
  if (!website) return NextResponse.json({ error: "website is required" }, { status: 400 });
  const address = (body?.address ?? "").slice(0, 300);
  const name = (body?.name ?? "").slice(0, 120);
  const [site, branding] = await Promise.all([
    findSiteLinks(website, address, name).catch(() => ({ links: [], details: {}, branches: [] })),
    // The bare domain first: some sites' logos are only found there, and the colour comes from the logo (else from the small icon).
    resolveSiteBranding(bareHost(website)).catch(() => ({ color: null, address: null })),
  ]);
  return NextResponse.json({
    brandColor: branding.color,
    details: site.details,
    links: site.links,
    branches: site.branches,
  });
}

function bareHost(website: string): string {
  try {
    return new URL(/^[a-z]+:\/\//i.test(website) ? website : `https://${website}`).hostname.replace(/^www\./i, "");
  } catch {
    return website;
  }
}
