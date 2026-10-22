import { NextRequest, NextResponse } from "next/server";
import { rateLimited } from "@/lib/rateLimit";
import { matchBusiness } from "@/lib/tapcardVerify";

// Is this business already on TapCard? GET ?website=&phone=&name= (what Google Places gave the app). Public facts only.
export async function GET(req: NextRequest) {
  if (rateLimited(req, "business-match", 30)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const q = req.nextUrl.searchParams;
  const match = await matchBusiness({ website: q.get("website") ?? "", phone: q.get("phone") ?? "", name: q.get("name") ?? "" }).catch(() => null);
  return NextResponse.json({ match }, { headers: { "Cache-Control": "private, max-age=60" } });
}
