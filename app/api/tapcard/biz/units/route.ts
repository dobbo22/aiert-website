import { NextRequest, NextResponse } from "next/server";
import { requireBizSession } from "@/lib/tapcardBizSession";
import { assignCard, createUnit, deleteUnit, listUnits, moveUnit, renameUnit, rolledUpFollowers, setUnitOwner, unitOfCards } from "@/lib/tapcardUnits";

// The Structure tab's actions: build the company tree, move a group, change who owns it, put a card in a group. Admins only.
export async function POST(req: NextRequest) {
  const session = await requireBizSession();
  if (!session) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const org = session.orgId;
  const b = (await req.json().catch(() => null)) as { action?: string; id?: unknown; name?: unknown; parentId?: unknown; cardId?: unknown } | null;
  const str = (v: unknown) => (typeof v === "string" && v ? v : null);
  const state = async () => ({ units: await listUnits(org), cards: await unitOfCards(org), followers: await rolledUpFollowers(org) });
  let r: { ok: boolean; error?: string } = { ok: false, error: "bad request" };
  switch (b?.action) {
    case "create": r = await createUnit(org, b.name, str(b.parentId)); break;
    case "rename": r = str(b.id) ? await renameUnit(org, str(b.id)!, b.name) : r; break;
    case "move": r = str(b.id) ? await moveUnit(org, str(b.id)!, str(b.parentId)) : r; break;
    case "owner": r = str(b.id) ? await setUnitOwner(org, str(b.id)!, str(b.cardId)) : r; break;
    case "delete": r = str(b.id) ? await deleteUnit(org, str(b.id)!) : r; break;
    case "assign": r = str(b.cardId) ? await assignCard(org, str(b.cardId)!, str(b.id)) : r; break;
  }
  if (!r.ok) return NextResponse.json({ error: r.error ?? "bad request" }, { status: 400 });
  return NextResponse.json({ ok: true, ...(await state()) });
}
