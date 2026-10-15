import { NextRequest, NextResponse } from "next/server";
import { setIsLocation, setPostsFor } from "@/lib/tapcardBiz";
import { requireBizSession } from "@/lib/tapcardBizSession";

// The admin marks a company card as a shop / location, and says which locations a card's owner may post offers and news
// for. Only cards of the admin's own company. Everyone can still confirm a customer's code with the offer's staff PIN.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireBizSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { isLocation?: unknown; postsFor?: unknown } | null;
  if (typeof body?.isLocation === "boolean") {
    if (!(await setIsLocation(session.orgId, id, body.isLocation))) return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (Array.isArray(body?.postsFor)) {
    const ids = body.postsFor.filter((x): x is string => typeof x === "string").slice(0, 50);
    if (!(await setPostsFor(session.orgId, id, ids))) return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
