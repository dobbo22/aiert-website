import { NextResponse, type NextRequest } from "next/server";
import { logLinkClick } from "@/lib/linkClicks";
import { isBotUserAgent } from "@/lib/tapcardInvites";
import { TRACKED_LINKS } from "@/lib/trackedLinks";

// tapcard.aiert.co.uk/go/<slug>: the "Get TapCard", MailBroom and
// PowerSearch links on shared card pages. Logs the click (anonymised, in
// link_clicks — shown under Social → Links & Invites → Link clicks) and
// redirects, adding App Store campaign attribution (ct=tapcard-web) so
// installs show up per source in each app's App Store Connect analytics.
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const link = slug.startsWith("tapcard-web-") ? TRACKED_LINKS[slug] : undefined;
  if (!link?.to) return new NextResponse("Not found", { status: 404 });

  if (!isBotUserAgent(req.headers.get("user-agent") ?? "")) {
    await logLinkClick(slug, req.headers).catch(() => {});
  }

  let destination = link.to;
  const pt = process.env.TAPCARD_APPSTORE_PROVIDER_TOKEN;
  if (link.appStoreId && pt) {
    const query = new URLSearchParams({ pt, ct: link.campaign ?? "tapcard-web", mt: "8" });
    destination = `https://apps.apple.com/app/apple-store/id${link.appStoreId}?${query}`;
  }
  // Android visitors get the Google Play listing instead of the App Store.
  if (link.playPackage && /android/i.test(req.headers.get("user-agent") ?? "")) {
    // A card page passes ?card=<id>: it rides in the Play install referrer, so the app opens on that business after installing.
    const card = req.nextUrl.searchParams.get("card") ?? "";
    const carried = /^[A-Za-z0-9_-]{16,40}$/.test(card) ? `&card=${card}` : "";
    destination = `https://play.google.com/store/apps/details?id=${link.playPackage}&referrer=${encodeURIComponent(`utm_source=${link.playSource ?? "tapcard-web"}&utm_medium=${link.playMedium ?? "card-page"}${carried}`)}`;
  }
  const res = NextResponse.redirect(destination, 302);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
