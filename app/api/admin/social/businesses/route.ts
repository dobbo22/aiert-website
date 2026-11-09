import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidAdminSession, COOKIE_NAME } from "@/lib/mailbroomAdminAuth";
import { allBusinesses, applyFilters, parseFilters, toCsv } from "@/lib/businessUsers";

// CSV of the Businesses page (same filters). Contains contact emails, so admin only.
export async function GET(req: NextRequest) {
  const session = (await cookies()).get(COOKIE_NAME)?.value;
  if (!isValidAdminSession(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sp = req.nextUrl.searchParams;
  const f = parseFilters({ q: sp.get("q") ?? undefined, type: sp.get("type") ?? undefined, little: sp.get("little") ?? undefined });
  const csv = toCsv(applyFilters((await allBusinesses()).rows, f));
  return new NextResponse(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="tapcard-businesses.csv"', "cache-control": "no-store" } });
}
