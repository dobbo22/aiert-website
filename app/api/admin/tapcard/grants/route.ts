import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, isValidAdminSession } from "@/lib/mailbroomAdminAuth";
import { getCard } from "@/lib/tapcardDb";
import { lookupCharity } from "@/lib/charityCheck";
import { grantPromote, revokeGrant, setRequestStatus } from "@/lib/tapcardGrants";
import { sendDeclinedEmail, sendGrantedEmail } from "@/lib/tapcardGrantMail";

const cardIdFrom = (input: string): string | null => {
  const t = input.trim();
  const m = t.match(/\/c\/([A-Za-z0-9_-]{16,40})/) ?? t.match(/^([A-Za-z0-9_-]{16,40})$/);
  return m ? m[1] : null;
};

async function authed(): Promise<boolean> {
  return isValidAdminSession((await cookies()).get(COOKIE_NAME)?.value);
}

// Admin only. GET ?charity=<number>: what the Charity Commission register says. POST: grant, decline or revoke a complimentary Promote.
export async function GET(req: NextRequest) {
  if (!(await authed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await lookupCharity(req.nextUrl.searchParams.get("charity") ?? ""));
}

export async function POST(req: NextRequest) {
  if (!(await authed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = (await req.json().catch(() => null)) as { action?: string; card?: string; months?: number; reason?: string; charityNumber?: string; requestId?: number; email?: string; groupName?: string; note?: string } | null;
  if (!b) return NextResponse.json({ error: "invalid" }, { status: 400 });
  if (b.action === "grant") {
    const id = cardIdFrom(String(b.card ?? ""));
    if (!id || !(await getCard(id))) return NextResponse.json({ error: "No card found for that link or id." }, { status: 404 });
    const g = await grantPromote(id, Number(b.months) || 12, String(b.reason ?? "Granted by admin"), "admin", String(b.charityNumber ?? ""));
    if (b.requestId) {
      const r = await setRequestStatus(Number(b.requestId), "granted", String(b.reason ?? ""));
      if (r) await sendGrantedEmail(r.email, r.group_name, g.until).catch(() => {});
    }
    return NextResponse.json({ ok: true, until: g.until });
  }
  if (b.action === "decline") {
    const r = await setRequestStatus(Number(b.requestId), "declined", String(b.note ?? ""));
    if (!r) return NextResponse.json({ error: "not found" }, { status: 404 });
    if (b.note !== undefined) await sendDeclinedEmail(r.email, r.group_name, String(b.note ?? "")).catch(() => {});
    return NextResponse.json({ ok: true });
  }
  if (b.action === "revoke") {
    const id = cardIdFrom(String(b.card ?? ""));
    if (!id) return NextResponse.json({ error: "invalid card" }, { status: 400 });
    await revokeGrant(id);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
