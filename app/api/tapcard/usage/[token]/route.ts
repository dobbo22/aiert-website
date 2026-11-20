import { NextRequest, NextResponse } from "next/server";
import { rateLimited } from "@/lib/rateLimit";
import { usageCsv, usageForToken } from "@/lib/tapcardUsage";

// The usage report behind a company's read-only link, as JSON (or CSV with ?format=csv). Counts only; never cached, never indexed.
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  if (rateLimited(req, "usage-link", 60)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const { token } = await params;
  const r = await usageForToken(token).catch(() => null);
  if (!r) return NextResponse.json({ error: "not found" }, { status: 404, headers: { "cache-control": "no-store" } });
  const headers = { "cache-control": "no-store", "x-robots-tag": "noindex" };
  if (req.nextUrl.searchParams.get("format") === "csv") {
    return new NextResponse(usageCsv(r), { headers: { ...headers, "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="tapcard-usage.csv"' } });
  }
  return NextResponse.json(r, { headers });
}
