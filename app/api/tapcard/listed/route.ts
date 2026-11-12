import { NextRequest, NextResponse } from "next/server";
import { rateLimited } from "@/lib/rateLimit";
import { LISTED_AS_OF, searchListed } from "@/lib/tapcardListed";

// Search the listed companies (name or ticker): tapcard.aiert.co.uk/api/listed?q=steppe. Public, rate limited. Returns the name, ticker,
// ISIN and market only; see lib/tapcardListed.ts.
export async function GET(req: NextRequest) {
  if (rateLimited(req, "listed", 60)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 80);
  const items = searchListed(q, Number(req.nextUrl.searchParams.get("limit") ?? 20) || 20);
  return NextResponse.json({ items, asOf: LISTED_AS_OF }, { headers: { "Cache-Control": "public, max-age=300" } });
}
