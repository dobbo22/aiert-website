import { NextRequest, NextResponse } from "next/server";
import { rateLimited } from "@/lib/rateLimit";
import { searchBusinesses } from "@/lib/tapcardBusinessSearch";

// tapcard.aiert.co.uk/api/business-search?q=maguro+bristol — see lib/tapcardBusinessSearch.ts.
export async function GET(req: NextRequest) {
  if (rateLimited(req, "business-search", 30)) return NextResponse.json({ error: "Too many requests", hits: [] }, { status: 429 });
  // Vercel adds the approximate position of the connection; it only orders the results and is not stored or logged.
  const lat = Number(req.headers.get("x-vercel-ip-latitude")), lng = Number(req.headers.get("x-vercel-ip-longitude"));
  const near = req.headers.get("x-vercel-ip-latitude") && req.headers.get("x-vercel-ip-longitude") ? { lat, lng } : null;
  const hits = await searchBusinesses(req.nextUrl.searchParams.get("q") ?? "", near, req.nextUrl.searchParams.get("src") === "finder").catch(() => []);
  // Private: the order depends on where the person is.
  return NextResponse.json({ hits }, { headers: { "Cache-Control": "private, max-age=300" } });
}
