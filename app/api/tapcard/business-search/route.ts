import { NextRequest, NextResponse } from "next/server";
import { rateLimited } from "@/lib/rateLimit";
import { searchBusinesses } from "@/lib/tapcardBusinessSearch";

// tapcard.aiert.co.uk/api/business-search?q=maguro+bristol — see lib/tapcardBusinessSearch.ts.
export async function GET(req: NextRequest) {
  if (rateLimited(req, "business-search", 30)) return NextResponse.json({ error: "Too many requests", hits: [] }, { status: 429 });
  const hits = await searchBusinesses(req.nextUrl.searchParams.get("q") ?? "").catch(() => []);
  return NextResponse.json({ hits }, { headers: { "Cache-Control": "public, max-age=300" } });
}
