import { NextRequest, NextResponse } from "next/server";
import { getCard } from "@/lib/tapcardDb";
import { canEdit, readEditToken } from "@/lib/tapcardAuth";
import { authorizePoster, posterName } from "@/lib/tapcardPost";
import { clearOffers, currentOffer, offerCounts, offerLock, publicOffer, setOffer } from "@/lib/tapcardOffers";
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
  const viewer = offer ? await authorizePoster(req, card) : null;
  if (offer && (viewer?.ok || (await canEdit(card, readEditToken(req))))) {
    const o = await currentOffer(id);
    if (o) stats = await offerCounts(o.id);
  }
  return NextResponse.json({ offer, ...(stats ? { stats } : {}) });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getCard(id);
  if (!card) return NextResponse.json({ error: "not found" }, { status: 404 });
  const who = await authorizePoster(req, card);
  if (!who.ok) return who.response;
  if (!isBusinessLabel(card.label)) return NextResponse.json({ error: "offers are for business cards" }, { status: 400 });
  if (!(await promoteAllowed(id))) return NextResponse.json({ error: "Posting offers needs TapCard Promote on this card. One subscription covers one card; email enquiries@aiert.co.uk to add more locations." }, { status: 402 });
  // One live offer per shop: the person who posted it can change it that day; others have to wait until tomorrow.
  const lock = await offerLock(id, who.posterId);
  if (lock.locked) {
    return NextResponse.json({ error: `An offer is already live, posted by ${await posterName(lock.postedBy)}. They can change it today; after today anyone allowed to post for this location can replace it.`, code: "offer_locked" }, { status: 409 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "invalid json" }, { status: 400 });
  const result = await setOffer(id, body as Record<string, unknown> as never, who.posterId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, offer: await publicOffer(id) });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getCard(id);
  if (!card) return NextResponse.json({ error: "not found" }, { status: 404 });
  const who = await authorizePoster(req, card);
  if (!who.ok) return who.response;
  const lock = await offerLock(id, who.posterId);
  if (lock.locked) {
    return NextResponse.json({ error: `This offer was posted by ${await posterName(lock.postedBy)} today, so only they can withdraw it today.`, code: "offer_locked" }, { status: 409 });
  }
  await clearOffers(id);
  return NextResponse.json({ ok: true });
}
