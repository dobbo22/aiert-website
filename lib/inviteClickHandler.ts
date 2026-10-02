import crypto from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import {
  INVITE_LINK_ORIGIN,
  type InviteSource,
  appStoreUrl,
  clickFingerprint,
  getSendByToken,
  isBotUserAgent,
  platformFromUserAgent,
  playStoreUrl,
  recordInviteClick,
} from "@/lib/tapcardInvites";

const VISITOR_COOKIE = "tc_vid";
const TWO_YEARS = 60 * 60 * 24 * 365 * 2;

// The invite links: tapcard.aiert.co.uk/i/<token> (the person's own link)
// and /p/<token> (their "pass it on" link). A route handler rather than a
// page so it can set the visitor cookie that tells the recipient's own
// clicks apart from forwarded ones. Phones go straight to their store with
// campaign attribution; computers and link-preview fetchers get the
// landing page at /get/<token>.
export async function handleInviteClick(req: NextRequest, token: string, source: InviteSource) {
  const ua = req.headers.get("user-agent") ?? "";
  const bot = isBotUserAgent(ua);
  const platform = platformFromUserAgent(ua);
  const send = await getSendByToken(token).catch(() => null);

  const existingVisitor = req.cookies.get(VISITOR_COOKIE)?.value;
  const visitorId = existingVisitor ?? crypto.randomBytes(12).toString("base64url");

  if (send && !bot) {
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
    await recordInviteClick(token, {
      ua,
      country: req.headers.get("x-vercel-ip-country"),
      visitorId,
      fingerprint: clickFingerprint(ip, ua),
      source,
    }).catch(() => {});
  }

  const campaign = send?.campaign ?? "unknown";
  const storeChannel = source === "share" ? "share" : (send?.channel ?? "unknown");
  let destination = `${INVITE_LINK_ORIGIN}/get/${token}${source === "share" ? "?via=share" : ""}`;
  if (!bot && platform === "ios") destination = appStoreUrl(campaign, storeChannel);
  if (!bot && platform === "android") destination = playStoreUrl(campaign, storeChannel);

  const res = NextResponse.redirect(destination, 302);
  res.headers.set("Cache-Control", "no-store");
  if (!existingVisitor && !bot) {
    res.cookies.set(VISITOR_COOKIE, visitorId, { httpOnly: true, secure: true, sameSite: "lax", maxAge: TWO_YEARS, path: "/" });
  }
  return res;
}
