// The headline and group actions of a listed company, shared by the company's own admin route and the adviser route.
// Settings (second approval, who is senior, which advisers are allowed) are only ever changed by the company's own senior admins.
import { after } from "next/server";
import sql from "@/lib/db";
import { pushToFollowers } from "@/lib/tapcardPush";
import { clearAnnouncement, publicAnnouncement, setAnnouncement } from "@/lib/tapcardOffers";
import { approveDraftNews, isSeniorActor, rejectDraftNews, submitNews, withdrawNewsChecked, type Actor } from "@/lib/tapcardNewsFlow";
import * as policy from "@/lib/tapcardNewsPolicy";
import { addGroup, listGroupsWithCounts, removeGroup, validAudience } from "@/lib/tapcardGroups";
import { decideLink, getLink, revokeLink, setLinkRegulatory } from "@/lib/tapcardAdvisers";
import { activateCover, endCover, recordAgreementEvent } from "@/lib/tapcardAdviserBilling";
import { approvedLinkForOrg } from "@/lib/tapcardAdvisers";
import { DATA_TERMS_VERSION, dataOwnershipStatement } from "@/lib/tapcardAdviserPricing";

export const NEWS_ACTIONS = ["news", "approveNews", "rejectNews", "withdrawNews", "addGroup", "removeGroup", "setApproval", "setSenior", "adviserDecide", "adviserSetRegulatory", "adviserRevoke", "adviserEndCover"] as const;
export type Reply = { status: number; json: Record<string, unknown> };
const fail = (r: { status: number; code: string; error: string; website?: unknown }): Reply => ({ status: r.status, json: { error: r.error, code: r.code, website: r.website } });
const ok = (extra: Record<string, unknown> = {}): Reply => ({ status: 200, json: { ok: true, ...extra } });

export async function runNewsAction(actor: Actor, cardId: string, body: Record<string, unknown>): Promise<Reply> {
  const card = ((await sql`SELECT name, company FROM tapcard_cards WHERE id = ${cardId} AND org_id = ${actor.orgId}`) as { name: string; company: string }[])[0];
  if (!card) return { status: 404, json: { error: "That card isn't one of this company's." } };

  // The one place a headline actually goes out: saves it, then notifies (only the chosen groups when some are chosen).
  const post = async (p: { text: string; link: string; groups: string[] }) => {
    const aud = await validAudience(cardId, p.groups);
    if (!aud.ok) return { ok: false as const, error: aud.error };
    const r = await setAnnouncement(cardId, p.text, p.link || undefined);
    if (!r.ok) return r;
    const posted = await publicAnnouncement(cardId);
    after(() => pushToFollowers(cardId, "news", { title: card.company || card.name || "News", body: posted?.text ?? p.text.slice(0, 140), ref: posted ? String(posted.id) : `a${Date.now()}`,
      extra: posted ? { announcementId: posted.id, link: posted.link ?? "", postedAt: posted.postedAt } : undefined, groups: aud.groups }));
    return { ok: true as const };
  };

  switch (body.action) {
    case "addGroup": {
      const g = await addGroup(cardId, body.name);
      if (!g.ok) return { status: 400, json: { error: g.error } };
      await policy.audit({ orgId: actor.orgId, cardId, kind: "general", actor: actor.adviser ? `${actor.email} (${actor.adviser.name})` : actor.email, action: "group-added", detail: { group: g.group.slug } });
      return ok({ group: g.group, groups: await listGroupsWithCounts(cardId) });
    }
    case "removeGroup":
      await removeGroup(cardId, String(body.slug ?? ""));
      await policy.audit({ orgId: actor.orgId, cardId, kind: "general", actor: actor.adviser ? `${actor.email} (${actor.adviser.name})` : actor.email, action: "group-removed", detail: { group: String(body.slug ?? "") } });
      return ok({ groups: await listGroupsWithCounts(cardId) });
    case "news": {
      const r = await submitNews({ actor, cardId, kind: policy.cleanKind(body.kind), text: String(body.text ?? ""), link: String(body.link ?? ""), groups: Array.isArray(body.groups) ? (body.groups as string[]) : [], override: body.override === true, post });
      return r.ok ? ok({ outcome: r.outcome, draftId: r.draftId }) : fail(r);
    }
    case "approveNews": {
      const r = await approveDraftNews({ actor, draftId: Number(body.draftId), override: body.override === true, post });
      return r.ok ? ok() : fail(r);
    }
    case "rejectNews": {
      const r = await rejectDraftNews({ actor, draftId: Number(body.draftId), note: String(body.note ?? "") });
      return r.ok ? ok() : fail(r);
    }
    case "withdrawNews": {
      const r = await withdrawNewsChecked({ actor, cardId, clear: () => clearAnnouncement(cardId) });
      return r.ok ? ok() : fail(r);
    }
  }

  // Everything below changes the company's own settings: its own senior admins only, never an adviser or AIERT support.
  if (actor.adviser || !(await isSeniorActor(actor))) return { status: 403, json: { error: "Only a senior admin of the company can change this.", code: "not_senior" } };
  const by = actor.email;
  if (body.action === "setApproval") {
    const on = body.on === true;
    if (on && (await policy.seniorCount(actor.orgId)) < 2) return { status: 409, json: { error: "Second approval needs at least two senior admins. Add another admin first.", code: "no_approver" } };
    await policy.setApprovalRequired(actor.orgId, on);
    await policy.audit({ orgId: actor.orgId, cardId, kind: "rns", actor: by, action: on ? "approval-on" : "approval-off" });
    return ok();
  }
  if (body.action === "setSenior") {
    const r = await policy.setSenior(actor.orgId, String(body.email ?? ""), body.on === true);
    if (!r.ok) return { status: 409, json: { error: r.error } };
    await policy.audit({ orgId: actor.orgId, cardId, kind: "rns", actor: by, action: body.on === true ? "senior-on" : "senior-off", detail: { admin: String(body.email ?? "") } });
    return ok();
  }
  // Advisers: the company decides, for each adviser, whether it may act at all and whether it may do regulatory news.
  const link = await getLink(String(body.linkId ?? ""));
  if (!link || link.orgId !== actor.orgId) return { status: 404, json: { error: "No such adviser request." } };
  const detail = { adviser: link.adviserName, linkId: link.id };
  if (body.action === "adviserDecide") {
    const approve = body.approve === true;
    if (approve) {
      // One adviser at a time, and the company confirms it stays the owner of its data.
      const current = await approvedLinkForOrg(actor.orgId);
      if (current && current.id !== link.id) return { status: 409, json: { error: `${current.adviserName} is your adviser. A company can have only one at a time: remove it first if you want to change.`, code: "one_adviser" } };
      if (body.ackData !== true) return { status: 400, json: { error: "Please confirm the data ownership statement before approving.", code: "ack_required" } };
    }
    if (!(await decideLink(actor.orgId, link.id, approve, by))) return { status: 409, json: { error: "That request has already been answered." } };
    await policy.audit({ orgId: actor.orgId, cardId, kind: "general", actor: by, action: approve ? "adviser-approved" : "adviser-declined", detail });
    await recordAgreementEvent(link.id, approve ? "adviser-approved" : "adviser-declined", by, approve ? { companyConfirmed: dataOwnershipStatement(link.orgName, link.adviserName), dataTermsVersion: DATA_TERMS_VERSION, adviserOffersToPay: link.coversRequested, companyAcceptsPayment: body.acceptCover === true } : {});
    // The adviser offered to pay for this company: the company's own senior admin accepts that separately and knowingly.
    if (approve && body.acceptCover === true && link.coversRequested) {
      const c = await activateCover(link.id);
      if (!c.ok) return ok({ coverError: c.error });
      await policy.audit({ orgId: actor.orgId, cardId, kind: "general", actor: by, action: "adviser-cover-accepted", detail });
      await recordAgreementEvent(link.id, "cover-accepted", by);
    }
    return ok();
  }
  if (body.action === "adviserSetRegulatory") {
    const on = body.on === true;
    if (!(await setLinkRegulatory(actor.orgId, link.id, on))) return { status: 409, json: { error: "That adviser isn't approved." } };
    await policy.audit({ orgId: actor.orgId, cardId, kind: "rns", actor: by, action: on ? "adviser-regulatory-on" : "adviser-regulatory-off", detail });
    await recordAgreementEvent(link.id, on ? "regulatory-allowed" : "regulatory-removed", by);
    return ok();
  }
  if (body.action === "adviserEndCover") {
    // The company takes over its own billing: the adviser's cover stops at the end of its committed term, then the 30-day grace begins.
    const r = await endCover(link.id);
    if (!r.ok) return { status: 409, json: { error: r.error } };
    await policy.audit({ orgId: actor.orgId, cardId, kind: "general", actor: by, action: "adviser-cover-ended", detail: { ...detail, endsAt: r.endsAt.toISOString() } });
    await recordAgreementEvent(link.id, "cover-ended", by, { by: "company", endsAt: r.endsAt.toISOString(), companyTakesOverBilling: true });
    return ok({ endsAt: r.endsAt.toISOString() });
  }
  if (body.action === "adviserRevoke") {
    if (!(await revokeLink(actor.orgId, link.id, by))) return { status: 409, json: { error: "That adviser has no access to remove." } };
    await endCover(link.id).catch(() => {}); // removing an adviser also ends its cover (at the end of the committed term)
    await policy.audit({ orgId: actor.orgId, cardId, kind: "general", actor: by, action: "adviser-revoked", detail });
    await recordAgreementEvent(link.id, "adviser-removed", by);
    return ok();
  }
  return { status: 400, json: { error: "Unknown action" } };
}
