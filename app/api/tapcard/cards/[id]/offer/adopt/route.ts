import { NextRequest, NextResponse } from "next/server";
import { getCard } from "@/lib/tapcardDb";
import { adoptClaim } from "@/lib/tapcardOffers";
import { rateLimited } from "@/lib/rateLimit";

// The app, first launched after the person claimed on the web (or in the App Clip), takes over that claim so its stamps come
// with them. `code` is the claim code the install was handed; `claimant` is the app's own random id.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (rateLimited(req, "offer-adopt", 30, 60 * 60_000)) return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { code?: unknown; claimant?: unknown } | null;
  const code = typeof body?.code === "string" ? body.code.toUpperCase() : "";
  const claimant = typeof body?.claimant === "string" ? body.claimant : "";
  if (claimant.length < 16 || claimant.length > 200) return NextResponse.json({ error: "claimant is required" }, { status: 400 });
  if (!(await getCard(id))) return NextResponse.json({ error: "not found" }, { status: 404 });
  const r = await adoptClaim(id, code, claimant);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.error === "has_own_card" ? 409 : 404 });
  return NextResponse.json({ ok: true, code: r.code, url: `https://tapcard.aiert.co.uk/o/${r.code}` });
}
