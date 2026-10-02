import { NextResponse } from "next/server";
import { claimAndroidPlace, claimPlace, ladderStatus, verifyAppleJws } from "@/lib/tapcardFounders";

// tapcard.aiert.co.uk/api/entitlement — see lib/tapcardFounders.ts.
// POST { appTransaction: <AppTransaction.jwsRepresentation> } from the iPhone
// app, or { platform: "android", installId, debug } from the Android app, on
// launch: counts the person once and says whether sharing is free for them
// (founder) or which lifetime unlock to offer.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (body?.platform === "android") {
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0]!.trim();
    try {
      return NextResponse.json(await claimAndroidPlace(String(body.installId ?? ""), body.debug === true, ip));
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 400 });
    }
  }
  const jws = typeof body?.appTransaction === "string" ? body.appTransaction : "";
  if (!jws) return NextResponse.json({ error: "appTransaction required" }, { status: 400 });
  let app;
  try {
    app = verifyAppleJws(jws);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid appTransaction" }, { status: 400 });
  }
  try {
    return NextResponse.json(await claimPlace(app));
  } catch (err) {
    console.error("TapCard entitlement failed", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 400 });
  }
}

// Public: free places left and today's price, for the website and emails.
// Each platform has its own independent 1,000-place ladder — pass
// ?platform=ios or ?platform=android for just that one, or omit it for both.
export async function GET(req: Request) {
  const platform = new URL(req.url).searchParams.get("platform");
  if (platform === "ios" || platform === "android") {
    const status = await ladderStatus(platform);
    return NextResponse.json(
      { freePlacesLeft: status.freePlacesLeft, price: status.nextPrice },
      { headers: { "Cache-Control": "public, s-maxage=60" } },
    );
  }
  const [ios, android] = await Promise.all([ladderStatus("ios"), ladderStatus("android")]);
  return NextResponse.json(
    { ios: { freePlacesLeft: ios.freePlacesLeft, price: ios.nextPrice }, android: { freePlacesLeft: android.freePlacesLeft, price: android.nextPrice } },
    { headers: { "Cache-Control": "public, s-maxage=60" } },
  );
}
