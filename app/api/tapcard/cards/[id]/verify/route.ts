import { NextRequest, NextResponse } from "next/server";
import { getCard } from "@/lib/tapcardDb";
import { canEdit, readEditToken } from "@/lib/tapcardAuth";
import { rateLimited } from "@/lib/rateLimit";
import { checkWebsiteProof, confirmVerification, proofInstructions, startVerification, verifyStatus } from "@/lib/tapcardVerify";

// The business proves it owns this card: POST { action: "start", email } sends a 6-digit code to an address on the card's website
// domain; POST { action: "confirm", code } checks it; POST { action: "check" } looks for the tapcard-verification line (or a link to the
// card) on the website itself. GET returns the status and what to add to the website, and quietly checks it. All need the card's edit token.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getCard(id);
  if (!card) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!(await canEdit(card, readEditToken(req)))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  let status = await verifyStatus(id);
  // Quiet automatic check: a business that has already put the line (or a link to its TapCard page) on its website becomes verified
  // as soon as the owner opens the verify screen.
  if (!status.verified && status.ownDomain) {
    const auto = await checkWebsiteProof(card, { quiet: true }).catch(() => null);
    if (auto?.ok) status = await verifyStatus(id);
  }
  return NextResponse.json({ ...status, proof: proofInstructions(card) });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (rateLimited(req, "verify", 12, 10 * 60_000)) return NextResponse.json({ error: "Too many tries. Wait a few minutes." }, { status: 429 });
  const { id } = await params;
  const card = await getCard(id);
  if (!card) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!(await canEdit(card, readEditToken(req)))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { action?: string; email?: string; code?: string } | null;
  if (body?.action === "start") {
    const r = await startVerification(card, String(body.email ?? "")).catch(() => ({ ok: false as const, error: "Couldn't send the code. Try again.", code: "send" }));
    return NextResponse.json(r, { status: r.ok ? 200 : 400 });
  }
  if (body?.action === "check") {
    const r = await checkWebsiteProof(card).catch(() => ({ ok: false as const, error: "Couldn't check the website. Try again.", code: "fetch" }));
    return NextResponse.json(r, { status: r.ok ? 200 : 400 });
  }
  if (body?.action === "confirm") {
    const r = await confirmVerification(card, String(body.code ?? ""));
    return NextResponse.json(r, { status: r.ok ? 200 : 400 });
  }
  return NextResponse.json({ error: "invalid" }, { status: 400 });
}
