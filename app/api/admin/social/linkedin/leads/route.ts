import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidAdminSession, COOKIE_NAME } from "@/lib/mailbroomAdminAuth";
import { scanEngagement, setLeadStatus, lastScanAt } from "@/lib/linkedinEngagement";

export async function POST(req: NextRequest) {
  const session = (await cookies()).get(COOKIE_NAME)?.value;
  if (!isValidAdminSession(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { action, id, status } = (await req.json().catch(() => ({}))) as { action?: string; id?: string; status?: string };
  try {
    if (action === "status" && id) { await setLeadStatus(id, status ?? ""); return NextResponse.json({ ok: true }); }
    if (action === "scan") {
      // A scan costs LinkedIn calls out of a 100-a-day allowance, so a manual one is limited to every 30 minutes.
      const last = await lastScanAt();
      if (last && Date.now() - new Date(last).getTime() < 30 * 60_000) return NextResponse.json({ error: "Scanned less than 30 minutes ago" }, { status: 429 });
      return NextResponse.json({ ok: true, ...(await scanEngagement()) });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
