import { NextRequest, NextResponse } from "next/server";
import { getCard } from "@/lib/tapcardDb";
import { canEdit, readEditToken } from "@/lib/tapcardAuth";
import { clearCardOverrides, getCardOverrides } from "@/lib/tapcardBiz";

// What the company admin has changed on this card (a new address, phone or email), for the owner's app to apply to its own copy.
// Needs the card's edit token, so only its owner can read it.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getCard(id);
  if (!card || !(await canEdit(card, readEditToken(req)))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json({ overrides: await getCardOverrides(id) }, { headers: { "Cache-Control": "no-store" } });
}

// The app has applied the changes to its own copy: they no longer need holding against an older copy.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getCard(id);
  if (!card || !(await canEdit(card, readEditToken(req)))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await clearCardOverrides(id);
  return NextResponse.json({ ok: true });
}
