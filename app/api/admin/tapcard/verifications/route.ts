import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, isValidAdminSession } from "@/lib/mailbroomAdminAuth";
import { resolveReport, unverify } from "@/lib/tapcardVerify";

// Admin only. POST { action: "unverify", card } removes a card's Verified tick (so the domain can be verified by the right owner);
// { action: "report", id, status: "resolved" | "dismissed" } closes a report.
export async function POST(req: NextRequest) {
  if (!isValidAdminSession((await cookies()).get(COOKIE_NAME)?.value)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = (await req.json().catch(() => null)) as { action?: string; card?: string; id?: number; status?: string } | null;
  if (b?.action === "unverify" && /^[A-Za-z0-9_-]{16,40}$/.test(String(b.card ?? ""))) {
    await unverify(String(b.card));
    return NextResponse.json({ ok: true });
  }
  if (b?.action === "report" && Number.isInteger(b.id) && (b.status === "resolved" || b.status === "dismissed")) {
    await resolveReport(Number(b.id), b.status);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "invalid" }, { status: 400 });
}
