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

  // Links marked perSource take ?src=<page name>, so each local page or group gets its own count and campaign.
  const rawSrc = link.perSource ? (req.nextUrl.searchParams.get("src") ?? "") : "";
  const src = /^[a-z0-9-]{1,24}$/i.test(rawSrc) ? rawSrc.toLowerCase() : "";

  if (!isBotUserAgent(req.headers.get("user-agent") ?? "")) {
    await logLinkClick(src ? `${slug}:${src}` : slug, req.headers).catch(() => {});
  }

  let destination = link.to;
  const pt = process.env.TAPCARD_APPSTORE_PROVIDER_TOKEN;
  if (link.appStoreId && pt) {
    const query = new URLSearchParams({ pt, ct: `${link.campaign ?? "tapcard-web"}${src ? `-${src}` : ""}`.slice(0, 40), mt: "8" });
    destination = `https://apps.apple.com/app/apple-store/id${link.appStoreId}?${query}`;
  }
  // Android visitors get the Google Play listing instead of the App Store.
  if (link.playPackage && /android/i.test(req.headers.get("user-agent") ?? "")) {
    // A card page passes ?card=<id>: it rides in the Play install referrer, so the app opens on that business after installing.
    const card = req.nextUrl.searchParams.get("card") ?? "";
    // A stamp card claimed on the web: its code rides along too, so the app can take over the card with its stamps.
    const claim = req.nextUrl.searchParams.get("claim") ?? "";
    const carried = (/^[A-Za-z0-9_-]{16,40}$/.test(card) ? `&card=${card}` : "") + (/^[A-Z0-9]{10}$/.test(claim) ? `&claim=${claim}` : "");
    destination = `https://play.google.com/store/apps/details?id=${link.playPackage}&referrer=${encodeURIComponent(`utm_source=${link.playSource ?? "tapcard-web"}&utm_medium=${link.playMedium ?? "card-page"}${src ? `&utm_campaign=${src}` : ""}${carried}`)}`;
  }
  const res = NextResponse.redirect(destination, 302);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
