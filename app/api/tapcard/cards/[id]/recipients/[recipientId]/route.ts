import { NextRequest, NextResponse } from "next/server";
import { deleteCardRecipient, getCard } from "@/lib/tapcardDb";
import { canEdit, readEditToken } from "@/lib/tapcardAuth";

// "Stop sharing with this contact": the owner removes one person they sent the card to.
// They stop getting update emails and drop off the owner's list. The card link itself is
// unchanged, and the recipient's own saved copy stays on their phone.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; recipientId: string }> },
) {
  const { id, recipientId } = await params;
  const token = readEditToken(req);
  if (!token) return NextResponse.json({ error: "edit token required" }, { status: 401 });

  const card = await getCard(id);
  if (!card) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!(await canEdit(card, token))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const rid = Number(recipientId);
  if (!Number.isInteger(rid)) return NextResponse.json({ error: "bad recipient id" }, { status: 400 });

  await deleteCardRecipient(id, rid);
  return NextResponse.json({ ok: true });
}
