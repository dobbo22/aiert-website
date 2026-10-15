import { NextRequest, NextResponse } from "next/server";
import { getCard } from "@/lib/tapcardDb";
import { cardMayPost } from "@/lib/tapcardBiz";
import { canEdit, readEditToken } from "@/lib/tapcardAuth";
import { PromoteLimitError, promoteStatus, saveVerified, verifyAndroid, verifyIos } from "@/lib/tapcardPromote";

// The business proves its Promote subscription for this card. POST { platform: "ios", jws } (the signed
// transaction) or { platform: "android", purchaseToken }, with the card's edit token. GET returns the status.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getCard(id);
  if (!card) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!(await canEdit(card, readEditToken(req)))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json({ ...(await promoteStatus(id)), canPost: await cardMayPost(id) });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getCard(id);
  if (!card) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!(await canEdit(card, readEditToken(req)))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { platform?: string; jws?: string; purchaseToken?: string; move?: boolean } | null;
  try {
    const verified = body?.platform === "android" ? await verifyAndroid(String(body.purchaseToken ?? "")) : await verifyIos(String(body?.jws ?? ""));
    return NextResponse.json(await saveVerified(id, verified, { move: body?.move === true }));
  } catch (err) {
    if (err instanceof PromoteLimitError) return NextResponse.json({ error: err.message, code: "on_another_card", canMove: err.canMove, limit: err.limit }, { status: 409 });
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't verify the subscription" }, { status: 400 });
  }
}
