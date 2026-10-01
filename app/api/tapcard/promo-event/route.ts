import { NextResponse } from "next/server";
import { logLinkClick } from "@/lib/linkClicks";
import { TRACKED_LINKS } from "@/lib/trackedLinks";

const PROMOS = new Set(["mailbroom", "powersearch"]);
const PLATFORMS = new Set(["ios", "android"]);

// tapcard.aiert.co.uk/api/promo-event: the TapCard apps report a tap on
// their MailBroom / PowerSearch promo card here, as {promo, platform} only —
// no card id, device id or anything else that could say who tapped. Counts
// appear under Social → Links & Invites → Link clicks.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const promo = String(body?.promo ?? "");
  const platform = String(body?.platform ?? "");
  const slug = `tapcard-app-${platform}-${promo}`;
  if (!PROMOS.has(promo) || !PLATFORMS.has(platform) || !TRACKED_LINKS[slug]?.inApp) {
    return NextResponse.json({ error: "Unknown promo" }, { status: 400 });
  }
  await logLinkClick(slug, req.headers).catch(() => {});
  return NextResponse.json({ ok: true });
}
