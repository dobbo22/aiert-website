import { after, NextResponse } from "next/server";
import { pushToFollowers } from "@/lib/tapcardPush";
import sql from "@/lib/db";
import { requireBizUser } from "@/lib/tapcardBizSession";
import { getOrg, isOrgActive } from "@/lib/tapcardBiz";
import { clearAnnouncement, clearOffers, setAnnouncement, setOffer } from "@/lib/tapcardOffers";

// An admin posts or withdraws any shop's offer or news from the web; a manager only for their own shops. Only for the company's own
// cards, and only while the company's billing is active.
export async function POST(req: Request) {
  const session = await requireBizUser();
  if (!session) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const org = await getOrg(session.orgId);
  if (!org || !isOrgActive(org)) return NextResponse.json({ error: "Your company's billing isn't active, so offers and news are paused." }, { status: 402 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const cardId = String(body?.cardId ?? "");
  const owns = ((await sql`SELECT 1 FROM tapcard_cards WHERE id = ${cardId} AND org_id = ${org.id}`) as unknown[]).length > 0;
  if (!owns) return NextResponse.json({ error: "That card isn't one of your company's." }, { status: 404 });
  if (session.role === "manager") {
    const mine = ((await sql`SELECT 1 FROM tapcard_biz_locations WHERE org_id = ${org.id} AND claimed_card_id = ${cardId} AND id = ANY(${session.locationIds})`) as unknown[]).length > 0;
    if (!mine) return NextResponse.json({ error: "That isn't one of your shops' cards." }, { status: 403 });
    if (!session.canPost) return NextResponse.json({ error: "Your admin has switched off posting for you. Ask them to post, or to turn it back on." }, { status: 403 });
  }

  switch (body?.action) {
    case "offer": {
      const days = Number(body.days ?? 0);
      const expiresAt = days > 0 ? new Date(Date.now() + days * 86_400_000).toISOString() : undefined;
      const r = await setOffer(cardId, { text: body.text, expiresAt, maxClaims: body.maxClaims || undefined, pin: body.pin, kind: body.kind, stampsRequired: body.stampsRequired, rewardText: body.rewardText, stampGapHours: body.stampGapHours, requireAppAfterFirst: body.requireAppAfterFirst }, "admin");
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
      const card = ((await sql`SELECT name, company FROM tapcard_cards WHERE id = ${cardId}`) as { name: string; company: string }[])[0];
      after(() => pushToFollowers(cardId, "offers", { title: card?.company || card?.name || "New offer", body: String(body.text ?? "").trim().slice(0, 140), ref: String(r.id) }));
      return NextResponse.json({ ok: true });
    }
    case "withdrawOffer":
      await clearOffers(cardId);
      return NextResponse.json({ ok: true });
    case "news": {
      const r = await setAnnouncement(cardId, body.text, body.link);
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
      const card = ((await sql`SELECT name, company FROM tapcard_cards WHERE id = ${cardId}`) as { name: string; company: string }[])[0];
      after(() => pushToFollowers(cardId, "news", { title: card?.company || card?.name || "News", body: String(body.text ?? "").trim().slice(0, 140), ref: `a${Date.now()}` }));
      return NextResponse.json({ ok: true });
    }
    case "withdrawNews":
      await clearAnnouncement(cardId);
      return NextResponse.json({ ok: true });
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}

// CSV of the dashboard numbers, per location.
export async function GET() {
  const session = await requireBizUser();
  if (session && session.role !== "admin") return new Response("Admins only.", { status: 403 });
  if (!session) return new Response("Please sign in again.", { status: 401 });
  const { orgPromoteRows } = await import("@/lib/tapcardOffers");
  const rows = await orgPromoteRows(session.orgId);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["Location", "Card views", "QR scans", "Installs from your sign", "Saves", "Following", "Current offer", "Claimed (this offer)", "Used (this offer)", "Claimed (all time)", "Used (all time)", "News"];
  const lines = rows.map((r) => [r.company || r.name, r.views, r.qrViews, r.installs, r.saves, r.followers, r.offerText ?? "", r.offerClaimed, r.offerRedeemed, r.claimedTotal, r.redeemedTotal, r.news ?? ""].map(esc).join(","));
  return new Response([head.map(esc).join(","), ...lines].join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="tapcard-locations.csv"' },
  });
}
