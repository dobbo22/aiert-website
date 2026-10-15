import { NextRequest, NextResponse } from "next/server";
import { apnsConfigured, fcmConfigured, forgetDevice, registerDevice } from "@/lib/tapcardPush";

// An app install tells us its push token (Apple or Google), keyed by its random per-install id, which is hashed. No name,
// email or contact details. Send an empty token to forget the device (when the person turns notifications off everywhere).
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { follower?: unknown; platform?: unknown; token?: unknown } | null;
  const follower = typeof body?.follower === "string" ? body.follower : "";
  if (follower.length < 16 || follower.length > 200) return NextResponse.json({ error: "follower is required" }, { status: 400 });
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  if (!token) {
    await forgetDevice(follower);
    return NextResponse.json({ ok: true });
  }
  if (token.length < 20 || token.length > 400 || /\s/.test(token)) return NextResponse.json({ error: "invalid token" }, { status: 400 });
  const platform = body?.platform === "android" ? "android" : "ios";
  await registerDevice(follower, platform, token);
  // `push` tells the app the server really will push to it, so it can stop posting its own local notifications.
  return NextResponse.json({ ok: true, push: platform === "android" ? fcmConfigured() : apnsConfigured() });
}
