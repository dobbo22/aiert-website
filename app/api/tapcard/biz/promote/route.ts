import { after, NextResponse } from "next/server";
import { pushToFollowers } from "@/lib/tapcardPush";
import sql from "@/lib/db";
import { requireBizUser } from "@/lib/tapcardBizSession";
import { getOrg, isOrgActive } from "@/lib/tapcardBiz";
import { clearAnnouncement, clearOffers, publicAnnouncement, setAnnouncement, setOffer } from "@/lib/tapcardOffers";

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
    case "addGroup": {
      const { addGroup, listGroupsWithCounts } = await import("@/lib/tapcardGroups");
      const g = await addGroup(cardId, body.name);
      if (!g.ok) return NextResponse.json({ error: g.error }, { status: 400 });
      return NextResponse.json({ ok: true, group: g.group, groups: await listGroupsWithCounts(cardId) });
    }
    case "removeGroup": {
      const { removeGroup, listGroupsWithCounts } = await import("@/lib/tapcardGroups");
      await removeGroup(cardId, String(body.slug ?? ""));
      return NextResponse.json({ ok: true, groups: await listGroupsWithCounts(cardId) });
    }
    case "news":
    case "approveNews":
    case "rejectNews":
    case "withdrawNews":
    case "setApproval":
    case "setSenior": {
      const flow = await import("@/lib/tapcardNewsFlow");
      const policy = await import("@/lib/tapcardNewsPolicy");
      const actor = { orgId: org.id, email: session.email, support: session.support === true };
      const card = ((await sql`SELECT name, company FROM tapcard_cards WHERE id = ${cardId}`) as { name: string; company: string }[])[0];
      const fail = (r: { status: number; code: string; error: string; website?: unknown }) => NextResponse.json({ error: r.error, code: r.code, website: r.website }, { status: r.status });

      // The one place a headline actually goes out: saves it, then notifies (only the chosen groups when some are chosen).
      const post = async (p: { text: string; link: string; groups: string[] }) => {
        const { validAudience } = await import("@/lib/tapcardGroups");
        const aud = await validAudience(cardId, p.groups);
        if (!aud.ok) return { ok: false as const, error: aud.error };
        const r = await setAnnouncement(cardId, p.text, p.link || undefined);
        if (!r.ok) return r;
        const posted = await publicAnnouncement(cardId);
        after(() => pushToFollowers(cardId, "news", { title: card?.company || card?.name || "News", body: posted?.text ?? p.text.slice(0, 140), ref: posted ? String(posted.id) : `a${Date.now()}`,
          extra: posted ? { announcementId: posted.id, link: posted.link ?? "", postedAt: posted.postedAt } : undefined, groups: aud.groups }));
        return { ok: true as const };
      };

      if (body.action === "news") {
        // A shop manager posts general news for their own shops only; regulatory news is refused for them by the rules.
        const r = await flow.submitNews({ actor, cardId, kind: policy.cleanKind(body.kind), text: String(body.text ?? ""), link: String(body.link ?? ""), groups: Array.isArray(body.groups) ? (body.groups as string[]) : [], override: body.override === true, post });
        return r.ok ? NextResponse.json({ ok: true, outcome: r.outcome, draftId: r.draftId }) : fail(r);
      }
      if (body.action === "approveNews") {
        const r = await flow.approveDraftNews({ actor, draftId: Number(body.draftId), override: body.override === true, post });
        return r.ok ? NextResponse.json({ ok: true }) : fail(r);
      }
      if (body.action === "rejectNews") {
        const r = await flow.rejectDraftNews({ actor, draftId: Number(body.draftId), note: String(body.note ?? "") });
        return r.ok ? NextResponse.json({ ok: true }) : fail(r);
      }
      if (body.action === "withdrawNews") {
        const r = await flow.withdrawNewsChecked({ actor, cardId, clear: () => clearAnnouncement(cardId) });
        return r.ok ? NextResponse.json({ ok: true }) : fail(r);
      }
      // Settings: senior admins only.
      if (!(await policy.isSenior(org.id, session.email, session.support === true))) return NextResponse.json({ error: "Only a senior admin can change this.", code: "not_senior" }, { status: 403 });
      if (body.action === "setApproval") {
        const on = body.on === true;
        if (on && (await policy.seniorCount(org.id)) < 2) return NextResponse.json({ error: "Second approval needs at least two senior admins. Add another admin first.", code: "no_approver" }, { status: 409 });
        await policy.setApprovalRequired(org.id, on);
        await policy.audit({ orgId: org.id, cardId, kind: "rns", actor: session.email, action: on ? "approval-on" : "approval-off" });
        return NextResponse.json({ ok: true });
      }
      const r = await policy.setSenior(org.id, String(body.email ?? ""), body.on === true);
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: 409 });
      await policy.audit({ orgId: org.id, cardId, kind: "rns", actor: session.email, action: body.on === true ? "senior-on" : "senior-off", detail: { admin: String(body.email ?? "") } });
      return NextResponse.json({ ok: true });
    }
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
