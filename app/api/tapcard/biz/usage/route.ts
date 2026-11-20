import { NextRequest, NextResponse } from "next/server";
import { requireBizSession } from "@/lib/tapcardBizSession";
import { createUsageLink, listUsageLinks, orgUsage, revokeUsageLink, usageCsv } from "@/lib/tapcardUsage";

// The company's own usage report as a CSV, and its read-only usage links. Admins only. A new link's address is shown once, here, and never stored.
export async function GET() {
  const session = await requireBizSession();
  if (!session) return new NextResponse("Please sign in again.", { status: 401 });
  const r = await orgUsage(session.orgId);
  if (!r) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(usageCsv(r), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="tapcard-usage.csv"', "cache-control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const session = await requireBizSession();
  if (!session) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { action?: string; label?: unknown; id?: unknown } | null;
  if (body?.action === "create") {
    const made = await createUsageLink(session.orgId, session.email, typeof body.label === "string" ? body.label : "");
    if (!made.ok) return NextResponse.json({ error: made.error }, { status: 400 });
    return NextResponse.json({ ok: true, url: `https://tapcard.aiert.co.uk/usage/${made.token}`, links: await listUsageLinks(session.orgId) });
  }
  if (body?.action === "revoke" && Number.isInteger(body.id)) {
    const ok = await revokeUsageLink(session.orgId, Number(body.id));
    return ok ? NextResponse.json({ ok: true, links: await listUsageLinks(session.orgId) }) : NextResponse.json({ error: "That link is already revoked or isn't yours." }, { status: 404 });
  }
  return NextResponse.json({ error: "bad request" }, { status: 400 });
}
