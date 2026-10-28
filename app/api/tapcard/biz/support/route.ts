import { NextRequest, NextResponse } from "next/server";
import { requireBizSession } from "@/lib/tapcardBizSession";
import { setSupportAccess, supportAccessUntil } from "@/lib/tapcardBizSupport";

// The company's own say over AIERT support access: allow it for a limited time, or turn it off. Admins only (not support itself).
export async function GET() {
  const session = await requireBizSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ until: (await supportAccessUntil(session.orgId))?.toISOString() ?? null });
}

export async function POST(req: NextRequest) {
  const session = await requireBizSession();
  if (!session || session.support) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { allow?: boolean } | null;
  await setSupportAccess(session.orgId, body?.allow ? 7 : null, session.email);
  return NextResponse.json({ until: (await supportAccessUntil(session.orgId))?.toISOString() ?? null });
}
