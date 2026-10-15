import { NextRequest, NextResponse } from "next/server";
import { setCardCanPost } from "@/lib/tapcardBiz";
import { requireBizSession } from "@/lib/tapcardBizSession";

// The admin ticks (or unticks) which company cards may post offers and news from their owner's phone. Only cards of
// the admin's own company. Everyone can still confirm a customer's code with the offer's staff PIN.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireBizSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { canPost?: unknown } | null;
  if (typeof body?.canPost !== "boolean") return NextResponse.json({ error: "canPost must be true or false" }, { status: 400 });
  const ok = await setCardCanPost(session.orgId, id, body.canPost);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
