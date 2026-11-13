import { NextRequest, NextResponse } from "next/server";
import { requireBizSession } from "@/lib/tapcardBizSession";
import { orgIsListed } from "@/lib/tapcardListedAdmin";
import { createEvent, deleteEvent, listEvents } from "@/lib/tapcardEvents";

// Event QR codes for a listed company (admins only): list, create, delete. See lib/tapcardEvents.ts.
async function gate() {
  const session = await requireBizSession();
  if (!session) return { error: NextResponse.json({ error: "Please sign in again." }, { status: 401 }) };
  if (!(await orgIsListed(session.orgId))) return { error: NextResponse.json({ error: "Event QR codes are for listed companies." }, { status: 403 }) };
  return { session };
}

export async function GET() {
  const g = await gate();
  if (g.error) return g.error;
  return NextResponse.json({ events: await listEvents(g.session!.orgId) });
}

export async function POST(req: NextRequest) {
  const g = await gate();
  if (g.error) return g.error;
  const body = (await req.json().catch(() => null)) as { label?: unknown; delete?: unknown; startsAt?: unknown; endsAt?: unknown } | null;
  if (typeof body?.delete === "string") {
    await deleteEvent(g.session!.orgId, body.delete);
    return NextResponse.json({ ok: true });
  }
  const r = await createEvent(g.session!.orgId, String(body?.label ?? ""), body?.startsAt, body?.endsAt);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true, code: r.code });
}
