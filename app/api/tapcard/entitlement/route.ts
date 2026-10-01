import { NextResponse } from "next/server";
import { claimPlace, ladderStatus, verifyAppleJws } from "@/lib/tapcardFounders";

// tapcard.aiert.co.uk/api/entitlement — see lib/tapcardFounders.ts.
// POST { appTransaction: <AppTransaction.jwsRepresentation> } from the app on
// launch: counts the person once and says whether sharing is free for them
// (founder) or which lifetime unlock to offer.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
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
export async function GET() {
  const status = await ladderStatus();
  return NextResponse.json(
    { freePlacesLeft: status.freePlacesLeft, price: status.nextPrice },
    { headers: { "Cache-Control": "public, s-maxage=60" } },
  );
}
