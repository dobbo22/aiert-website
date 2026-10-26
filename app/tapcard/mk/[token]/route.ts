import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { INVITE_LINK_ORIGIN, appStoreUrl, isBotUserAgent, platformFromUserAgent, playStoreUrl } from "@/lib/tapcardInvites";
import { recordClick } from "@/lib/marketing";

// The links in the restaurant / cafe mailshot (see lib/marketing.ts). Counts the click (not link scanners), then sends the person on:
// phones to their app store, computers to the Promote page; ?to=how and ?to=video / guide to those pages.
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const to = new URL(req.url).searchParams.get("to");
  const ua = req.headers.get("user-agent") ?? "";
  const bot = isBotUserAgent(ua);
  const platform = platformFromUserAgent(ua);
  const target = to === "how" ? "How it works" : to === "video" || to === "guide" ? "Demo" : "Get the app";
  if (!bot) await recordClick(token, target).catch(() => {});
  let destination = `${INVITE_LINK_ORIGIN}/promote`;
  if (!bot && platform === "ios") destination = appStoreUrl("restaurants", "email");
  if (!bot && platform === "android") destination = playStoreUrl("restaurants", "email");
  if (to === "how") destination = `${INVITE_LINK_ORIGIN}/how-it-works`;
  if (to === "video" || to === "guide") destination = to === "guide" ? `${INVITE_LINK_ORIGIN}/guide` : `${INVITE_LINK_ORIGIN}/`;
  const res = NextResponse.redirect(destination, 302);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
