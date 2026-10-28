import { NextRequest, NextResponse } from "next/server";
import { rateLimited } from "@/lib/rateLimit";
import { placeRating } from "@/lib/tapcardRating";

// tapcard.aiert.co.uk/api/rating?place=<google place id> → { rating, count } (or {} when unknown). See lib/tapcardRating.ts.
export async function GET(req: NextRequest) {
  if (rateLimited(req, "rating", 60)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const value = await placeRating(req.nextUrl.searchParams.get("place") ?? "").catch(() => null);
  return NextResponse.json(value ?? {}, { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400", "Access-Control-Allow-Origin": "*" } });
}
