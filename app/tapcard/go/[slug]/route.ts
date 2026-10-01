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
    const query = new URLSearchParams({ pt, ct: "tapcard-web", mt: "8" });
    destination = `https://apps.apple.com/app/apple-store/id${link.appStoreId}?${query}`;
  }
  const res = NextResponse.redirect(destination, 302);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
