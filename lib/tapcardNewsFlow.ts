// The rules for posting a headline, in one place so the route stays thin and the rules can be tested. See tapcardNewsPolicy.ts.
import { adviserApproverEmails } from "@/lib/tapcardAdvisers";
import {
  approvalRequired, audit, checkAgainstWebsite, closeDraft, createDraft, getDraft, isSenior, lastPostedKind, reopenDraft, seniorCount,
  type NewsKind, type WebsiteCheck,
} from "@/lib/tapcardNewsPolicy";

/// `adviser` is set when an IR firm acts for the company through its approved link: it may write headlines and manage groups, and may
/// post or approve regulatory news only when the staff member is senior at the adviser AND the company allowed regulatory news for it.
export interface Actor { orgId: string; email: string; support?: boolean; adviser?: { id: string; name: string; senior: boolean; canRegulatory: boolean } }
export type PostFn = (p: { text: string; link: string; groups: string[] }) => Promise<{ ok: true } | { ok: false; error: string }>;
export type FlowResult =
  | { ok: true; outcome: "posted" | "pending"; draftId?: number }
  | { ok: false; status: number; code: string; error: string; website?: WebsiteCheck };

const who = (a: Actor) => (a.support ? `AIERT support (${a.email})` : a.adviser ? `${a.email} (${a.adviser.name})` : a.email);
export async function isSeniorActor(a: Actor): Promise<boolean> {
  if (a.adviser) return a.adviser.senior && a.adviser.canRegulatory;
  return isSenior(a.orgId, a.email, a.support);
}
/// People who could approve a regulatory headline: the company's senior admins plus its allowed advisers' senior staff.
async function approverCount(orgId: string): Promise<number> {
  const adv = await adviserApproverEmails(orgId).catch(() => [] as string[]);
  return (await seniorCount(orgId)) + new Set(adv).size;
}
const notOnSite = (w: WebsiteCheck) => w.status === "not-found" || w.status === "no-feed";
const siteMessage = (w: WebsiteCheck) =>
  w.status === "no-feed" ? "No announcements page is being watched yet, so this can't be checked against your website."
  : "This announcement isn't on your announcements page yet. Regulatory news normally appears on your website as well.";

export async function submitNews(i: { actor: Actor; cardId: string; kind: NewsKind; text: string; link: string; groups: string[]; override: boolean; post: PostFn }): Promise<FlowResult> {
  const { actor, cardId, kind, text, link, groups } = i;
  const base = { orgId: actor.orgId, cardId, kind, actor: who(actor), text, link, groups };
  if (kind === "general") {
    const r = await i.post({ text, link, groups });
    if (!r.ok) return { ok: false, status: 400, code: "rejected", error: r.error };
    await audit({ ...base, action: "posted" });
    return { ok: true, outcome: "posted" };
  }
  // Regulatory
  if (!link.trim()) return { ok: false, status: 400, code: "link_required", error: "A regulatory headline needs a link to the announcement." };
  const senior = await isSeniorActor(actor);
  const approval = await approvalRequired(actor.orgId);
  const website = await checkAgainstWebsite(cardId, link, text);
  if (!approval) {
    if (!senior) {
      await audit({ ...base, action: "refused", detail: { reason: "not senior" } });
      return { ok: false, status: 403, code: "not_senior", error: "Regulatory news can only be posted by a senior admin of your company." };
    }
    if (notOnSite(website) && !i.override) return { ok: false, status: 409, code: "not_on_website", error: siteMessage(website), website };
    const r = await i.post({ text, link, groups });
    if (!r.ok) return { ok: false, status: 400, code: "rejected", error: r.error };
    await audit({ ...base, action: "posted", detail: { website: website.status, override: notOnSite(website), titleMatches: website.status === "found" ? website.titleMatches : null } });
    return { ok: true, outcome: "posted" };
  }
  // Second approval is on: it is written now and goes out only when a different senior admin approves it.
  const seniors = await approverCount(actor.orgId);
  const others = seniors - (senior ? 1 : 0);
  if (others < 1) return { ok: false, status: 409, code: "no_approver", error: "Second approval is on, but there is no other senior admin who could approve this. Add one, or turn approval off." };
  const draftId = await createDraft({ orgId: actor.orgId, cardId, kind, text, link, groups, createdBy: actor.email.toLowerCase(), websiteStatus: website.status });
  await audit({ ...base, action: "submitted", detail: { draftId, website: website.status } });
  return { ok: true, outcome: "pending", draftId };
}

export async function approveDraftNews(i: { actor: Actor; draftId: number; override: boolean; post: PostFn }): Promise<FlowResult> {
  const { actor } = i;
  const d = await getDraft(actor.orgId, i.draftId);
  if (!d || d.status !== "pending") return { ok: false, status: 404, code: "gone", error: "That headline is no longer waiting for approval." };
  const base = { orgId: actor.orgId, cardId: d.cardId, kind: d.kind, actor: who(actor), text: d.text, link: d.link, groups: d.groups };
  if (!(await isSeniorActor(actor))) return { ok: false, status: 403, code: "not_senior", error: "Only a senior admin can approve regulatory news." };
  if (d.createdBy === actor.email.toLowerCase()) return { ok: false, status: 403, code: "own_draft", error: "A different senior admin has to approve this. You wrote it." };
  const website = await checkAgainstWebsite(d.cardId, d.link, d.text);
  if (notOnSite(website) && !i.override) return { ok: false, status: 409, code: "not_on_website", error: siteMessage(website), website };
  if (!(await closeDraft(actor.orgId, d.id, "approved", actor.email.toLowerCase()))) return { ok: false, status: 409, code: "gone", error: "Someone else has just dealt with this headline." };
  const r = await i.post({ text: d.text, link: d.link, groups: d.groups });
  if (!r.ok) {
    await reopenDraft(actor.orgId, d.id);
    return { ok: false, status: 400, code: "rejected", error: r.error };
  }
  await audit({ ...base, action: "approved", detail: { draftId: d.id, writtenBy: d.createdBy } });
  await audit({ ...base, action: "posted", detail: { draftId: d.id, writtenBy: d.createdBy, website: website.status, override: notOnSite(website), titleMatches: website.status === "found" ? website.titleMatches : null } });
  return { ok: true, outcome: "posted" };
}

export async function rejectDraftNews(i: { actor: Actor; draftId: number; note: string }): Promise<FlowResult> {
  const { actor } = i;
  const d = await getDraft(actor.orgId, i.draftId);
  if (!d || d.status !== "pending") return { ok: false, status: 404, code: "gone", error: "That headline is no longer waiting for approval." };
  const mine = d.createdBy === actor.email.toLowerCase();
  if (!mine && !(await isSeniorActor(actor))) return { ok: false, status: 403, code: "not_senior", error: "Only a senior admin, or the person who wrote it, can turn this down." };
  if (!(await closeDraft(actor.orgId, d.id, mine ? "withdrawn" : "rejected", actor.email.toLowerCase(), i.note.slice(0, 300)))) return { ok: false, status: 409, code: "gone", error: "Someone else has just dealt with this headline." };
  await audit({ orgId: actor.orgId, cardId: d.cardId, kind: d.kind, actor: who(actor), action: mine ? "draft-withdrawn" : "rejected", text: d.text, link: d.link, groups: d.groups, detail: { draftId: d.id, note: i.note.slice(0, 300) } });
  return { ok: true, outcome: "posted" };
}

/// Taking a headline down: a regulatory one can only be withdrawn by a senior admin.
export async function withdrawNewsChecked(i: { actor: Actor; cardId: string; clear: () => Promise<void> }): Promise<FlowResult> {
  const kind = await lastPostedKind(i.actor.orgId, i.cardId);
  if (kind === "rns" && !(await isSeniorActor(i.actor))) {
    await audit({ orgId: i.actor.orgId, cardId: i.cardId, kind, actor: who(i.actor), action: "refused", detail: { reason: "withdraw needs senior" } });
    return { ok: false, status: 403, code: "not_senior", error: "Only a senior admin can withdraw a regulatory headline." };
  }
  await i.clear();
  await audit({ orgId: i.actor.orgId, cardId: i.cardId, kind, actor: who(i.actor), action: "withdrawn" });
  return { ok: true, outcome: "posted" };
}
