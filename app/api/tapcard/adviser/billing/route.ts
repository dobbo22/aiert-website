import { NextResponse } from "next/server";
import { requireAdviser } from "@/lib/tapcardAdvisers";
import { acceptTerms, adviserSummary, createAdviserCheckout, createAdviserPortal } from "@/lib/tapcardAdviserBilling";
import { ADVISER_TERMS_VERSION } from "@/lib/tapcardAdviserPricing";

// The adviser's own billing (separate from TapCard for Business). Senior staff only. Actions: summary, accept (the terms), checkout
// (card payment through Stripe), portal (change card, see invoices).
export async function POST(req: Request) {
  const me = await requireAdviser();
  if (!me) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { action?: string; version?: string; accept?: boolean } | null;
  const origin = "https://tapcard.aiert.co.uk";
  if (body?.action === "summary") return NextResponse.json(await adviserSummary(me.adviserId));
  if (!me.senior) return NextResponse.json({ error: "Only senior staff can sign up or change payment." }, { status: 403 });
  if (body?.action === "accept") {
    if (body.accept !== true || body.version !== ADVISER_TERMS_VERSION) return NextResponse.json({ error: "Please read and accept the current terms." }, { status: 400 });
    await acceptTerms(me.adviserId, me.email);
    return NextResponse.json({ ok: true });
  }
  if (body?.action === "checkout") {
    const r = await createAdviserCheckout(me.adviserId, me.email, origin);
    return r.ok ? NextResponse.json({ url: r.url }) : NextResponse.json({ error: r.error }, { status: 400 });
  }
  if (body?.action === "portal") {
    const r = await createAdviserPortal(me.adviserId, origin);
    return r.ok ? NextResponse.json({ url: r.url }) : NextResponse.json({ error: r.error }, { status: 400 });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
