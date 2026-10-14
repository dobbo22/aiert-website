import { NextRequest, NextResponse } from "next/server";
import { getCard } from "@/lib/tapcardDb";
import { canEdit, readEditToken } from "@/lib/tapcardAuth";
import { clearOffers, currentOffer, offerCounts, publicOffer, setOffer } from "@/lib/tapcardOffers";
import { isBusinessLabel } from "@/lib/tapcardLinks";
import { promoteAllowed } from "@/lib/tapcardPromote";

// The card's special offer. GET is public (what a person with the card sees);
// with the owner's edit token it also returns how many claimed / used it.
// PUT replaces the offer, DELETE withdraws it.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getCard(id);
  if (!card) return NextResponse.json({ error: "not found" }, { status: 404 });
  const offer = await publicOffer(id);
  let stats: { claimed: number; redeemed: number } | undefined;
  if (offer && (await canEdit(card, readEditToken(req)))) {
    const o = await currentOffer(id);
    if (o) stats = await offerCounts(o.id);
  }
  return NextResponse.json({ offer, ...(stats ? { stats } : {}) });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getCard(id);
  if (!card) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!(await canEdit(card, readEditToken(req)))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!isBusinessLabel(card.label)) return NextResponse.json({ error: "offers are for business cards" }, { status: 400 });
  if (!(await promoteAllowed(id))) return NextResponse.json({ error: "Posting offers needs TapCard Promote." }, { status: 402 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "invalid json" }, { status: 400 });
  const result = await setOffer(id, body as Record<string, unknown> as never);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, offer: await publicOffer(id) });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getCard(id);
  if (!card) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!(await canEdit(card, readEditToken(req)))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await clearOffers(id);
  return NextResponse.json({ ok: true });
}
