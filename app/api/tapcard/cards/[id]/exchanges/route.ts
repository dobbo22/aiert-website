import { NextRequest, NextResponse } from "next/server";
import {
  addExchange,
  countRecentExchangesFrom,
  deleteExchanges,
  getCard,
  listExchanges,
  publicCardJSON,
} from "@/lib/tapcardDb";
import { canEdit, readEditToken } from "@/lib/tapcardAuth";

// "Send your card back". [id] is the card that was scanned; the receiver's
// app returns its own shared card to it. Both directions are gated on edit
// tokens: sending proves you own the card you're sending (so nobody can
// push someone else's card, or spam from cards they don't hold), and
// collecting proves you own the card it was sent to.

const MAX_SENDS_PER_HOUR = 30;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { fromCardId?: string };
  const fromCardId = body.fromCardId?.trim();
  if (!fromCardId) return NextResponse.json({ error: "fromCardId is required" }, { status: 400 });
  if (fromCardId === id) return NextResponse.json({ error: "can't send a card to itself" }, { status: 400 });

  const [to, from] = await Promise.all([getCard(id), getCard(fromCardId)]);
  if (!to || !from) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!(await canEdit(from, readEditToken(req)))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if ((await countRecentExchangesFrom(fromCardId)) >= MAX_SENDS_PER_HOUR) {
    return NextResponse.json({ error: "too many cards sent, try again later" }, { status: 429 });
  }
  await addExchange(id, fromCardId);
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getCard(id);
  if (!card) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!(await canEdit(card, readEditToken(req)))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const exchanges = await listExchanges(id);
  return NextResponse.json({
    exchanges: exchanges.map((e) => ({ id: e.exchangeId, card: publicCardJSON(e.card) })),
  });
}

/// The app acknowledges the exchanges it has stored: ?ids=1,2,3
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getCard(id);
  if (!card) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!(await canEdit(card, readEditToken(req)))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const ids = (req.nextUrl.searchParams.get("ids") ?? "")
    .split(",")
    .map(Number)
    .filter((n) => Number.isSafeInteger(n) && n > 0)
    .slice(0, 100);
  await deleteExchanges(id, ids);
  return NextResponse.json({ ok: true });
}
