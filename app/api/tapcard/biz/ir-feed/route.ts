import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { requireBizSession } from "@/lib/tapcardBizSession";
import { cleanPageUrl, saveFeedPage, setItemStatus, syncFeed } from "@/lib/tapcardIrFeed";
import { isListedCard } from "@/lib/tapcardShare";
import { isThirdPartyRegulatoryUrl, THIRD_PARTY_MESSAGE } from "@/lib/tapcardRegulatoryHosts";

// A listed company's announcements page: save its address (and read it once), or ignore / restore one announcement. Admins only.
export async function POST(req: Request) {
  const session = await requireBizSession();
  if (!session) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { cardId?: string; action?: string; pageUrl?: string; url?: string } | null;
  const cardId = String(body?.cardId ?? "");
  const owns = ((await sql`SELECT 1 FROM tapcard_cards WHERE id = ${cardId} AND org_id = ${session.orgId}`) as unknown[]).length > 0;
  if (!owns || !(await isListedCard(cardId))) return NextResponse.json({ error: "That isn't one of your company's listed cards." }, { status: 404 });

  if (body?.action === "save") {
    const pageUrl = cleanPageUrl(body.pageUrl);
    if (!pageUrl) return NextResponse.json({ error: "Enter the web address of the page that lists your announcements." }, { status: 400 });
    if (isThirdPartyRegulatoryUrl(pageUrl)) return NextResponse.json({ error: THIRD_PARTY_MESSAGE }, { status: 400 });
    const r = await saveFeedPage(cardId, pageUrl);
    return r.ok ? NextResponse.json({ ok: true, found: r.found }) : NextResponse.json({ error: r.error }, { status: 400 });
  }
  // "Refresh now": read the page again (not more than once every 10 seconds) and say when it was last checked.
  if (body?.action === "refresh") {
    const cfg = await syncFeed(cardId, 10_000).catch(() => null);
    return NextResponse.json({ ok: true, checkedAt: cfg?.lastCheckedAt ?? null, error: cfg?.lastError ?? "" });
  }
  if (body?.action === "ignore" || body?.action === "restore") {
    const url = String(body.url ?? "");
    if (!url.startsWith("https://") || url.length > 600) return NextResponse.json({ error: "Unknown announcement" }, { status: 400 });
    await setItemStatus(cardId, url, body.action === "ignore" ? "ignored" : "earlier");
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
