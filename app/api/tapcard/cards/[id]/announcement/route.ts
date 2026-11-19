import { after, NextRequest, NextResponse } from "next/server";
import { pushToFollowers } from "@/lib/tapcardPush";
import { getCard } from "@/lib/tapcardDb";
import { canEdit, readEditToken } from "@/lib/tapcardAuth";
import { authorizePoster } from "@/lib/tapcardPost";
import { clearAnnouncement, publicAnnouncement, setAnnouncement } from "@/lib/tapcardOffers";
import { isBusinessLabel } from "@/lib/tapcardLinks";
import { validAudience } from "@/lib/tapcardGroups";
import { promoteAllowed } from "@/lib/tapcardPromote";

// A short news line on a business card ("New autumn menu"). GET is public; PUT / DELETE need the edit token.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await getCard(id))) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ announcement: await publicAnnouncement(id) });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getCard(id);
  if (!card) return NextResponse.json({ error: "not found" }, { status: 404 });
  const who = await authorizePoster(req, card);
  if (!who.ok) return who.response;
  // A listed company's headlines go through its web admin, where post types, senior-only regulatory news, the website check,
  // second approval and the audit trail apply. A phone's edit key must not be a way around them.
  if (await (await import("@/lib/tapcardShare")).isListedCard(id).catch(() => false)) {
    return NextResponse.json({ error: "This company posts its headlines from its web admin, where regulatory news is checked and recorded.", code: "web_admin_only" }, { status: 403 });
  }
  if (!isBusinessLabel(card.label)) return NextResponse.json({ error: "announcements are for business cards" }, { status: 400 });
  if (!(await promoteAllowed(id))) return NextResponse.json({ error: "Posting news needs TapCard Promote on this card. One subscription covers one card; email enquiries@aiert.co.uk to add more locations." }, { status: 402 });
  const body = (await req.json().catch(() => null)) as { text?: unknown; link?: unknown; groups?: unknown } | null;
  const aud = await validAudience(id, body?.groups);
  if (!aud.ok) return NextResponse.json({ error: aud.error }, { status: 400 });
  const r = await setAnnouncement(id, body?.text, body?.link);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  const posted = await publicAnnouncement(id);
  if (posted) after(() => pushToFollowers(id, "news", { title: card.company || card.name, body: posted.text, ref: String(posted.id), extra: { announcementId: posted.id, link: posted.link ?? "", postedAt: posted.postedAt }, groups: aud.groups }));
  return NextResponse.json({ ok: true, announcement: posted });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getCard(id);
  if (!card) return NextResponse.json({ error: "not found" }, { status: 404 });
  const who = await authorizePoster(req, card);
  if (!who.ok) return who.response;
  // A listed company's headlines go through its web admin, where post types, senior-only regulatory news, the website check,
  // second approval and the audit trail apply. A phone's edit key must not be a way around them.
  if (await (await import("@/lib/tapcardShare")).isListedCard(id).catch(() => false)) {
    return NextResponse.json({ error: "This company posts its headlines from its web admin, where regulatory news is checked and recorded.", code: "web_admin_only" }, { status: 403 });
  }
  await clearAnnouncement(id);
  return NextResponse.json({ ok: true });
}
