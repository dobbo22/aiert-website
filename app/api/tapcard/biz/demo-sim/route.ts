import { after, NextRequest, NextResponse } from "next/server";
import { requireBizSession } from "@/lib/tapcardBizSession";
import sql from "@/lib/db";
import { simArrive, simClear, simEvent, simHeadline, simResults } from "@/lib/tapcardDemoSim";

// The simulated AGM for the demo company only (Example Resources plc, on the demo list). Admins of that company; refused for anyone else.
// The page calls it in small batches so the admin moves while it runs. See lib/tapcardDemoSim.ts.
export async function POST(req: NextRequest) {
  const session = await requireBizSession();
  if (!session) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { action?: unknown; event?: unknown; count?: unknown; start?: unknown; taps?: unknown; late?: unknown; label?: unknown; startsAt?: unknown; endsAt?: unknown; text?: unknown; link?: unknown } | null;
  let r;
  if (body?.action === "arrive") r = await simArrive(session.orgId, String(body.event ?? ""), body.count, body.start);
  else if (body?.action === "results") r = await simResults(session.orgId, body.taps, body.late, body.start);
  else if (body?.action === "clear") r = await simClear(session.orgId);
  else if (body?.action === "event") r = await simEvent(session.orgId, String(body.label ?? ""), body.startsAt, body.endsAt);
  else if (body?.action === "headline") {
    const h = await simHeadline(session.orgId, body.text, body.link);
    if (!h.ok) return NextResponse.json({ error: h.error }, { status: 403 });
    // The same push the News page sends, so followers' phones get it.
    const { publicAnnouncement } = await import("@/lib/tapcardOffers");
    const { pushToFollowers } = await import("@/lib/tapcardPush");
    const card = ((await sql`SELECT name, company FROM tapcard_cards WHERE id = ${h.cardId}`) as { name: string; company: string }[])[0];
    const posted = await publicAnnouncement(h.cardId);
    after(() => pushToFollowers(h.cardId, "news", { title: card?.company || card?.name || "News", body: posted?.text ?? String(body.text ?? "").trim().slice(0, 140), ref: posted ? String(posted.id) : `a${Date.now()}`,
      extra: posted ? { announcementId: posted.id, link: posted.link ?? "", postedAt: posted.postedAt } : undefined }));
    return NextResponse.json({ ok: true });
  }
  else return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  return r && r.ok ? NextResponse.json(r) : NextResponse.json({ error: (r as { error: string }).error }, { status: 403 });
}
