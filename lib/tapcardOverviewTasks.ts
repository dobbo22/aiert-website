// What the investor-relations Overview tells a person to do: "needs attention" items (things waiting for them right now) and a
// self-ticking set-up list with a single next step. Pure, so it can be tested; the data is gathered in ListedOverview.

export interface OverviewInput {
  viewer: { email: string; senior: boolean };
  waitingDrafts: { createdBy: string }[];           // headlines waiting for approval
  adviserRequests: number;                           // advisers who have asked and not been answered
  seniorCount: number;
  adminCount: number;
  approvalOn: boolean;
  announcementsPageSet: boolean;
  privacyUrlSet: boolean;
  teamCards: number;                                 // cards besides the company card
  events: number;
  hasPosted: boolean;
  shared: number;
  adviserCover: { adviserName: string; ending: boolean; until: string | null }[];
  adviserPaymentProblem: string | null;              // the adviser who pays has a failed payment
}
export interface AttentionItem { id: string; level: "action" | "warning" | "info"; text: string; href: string; cta: string }
export interface SetupStep { id: string; done: boolean; title: string; text: string; href: string; seniorOnly?: boolean; optional?: boolean }

const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" }) : "");

export function attentionItems(i: OverviewInput): AttentionItem[] {
  const out: AttentionItem[] = [];
  const me = i.viewer.email.toLowerCase();
  const forMe = i.waitingDrafts.filter((d) => d.createdBy !== me).length;
  const mine = i.waitingDrafts.filter((d) => d.createdBy === me).length;
  if (i.viewer.senior && i.approvalOn && i.seniorCount < 2) out.push({ id: "one-senior", level: "warning", text: "Second approval is on, but there is only one senior admin, so a regulatory headline can't be approved. Make another admin senior, or switch it off.", href: "/business/admin/news?tab=people", cta: "Fix this" });
  if (i.viewer.senior && forMe > 0) out.push({ id: "approvals", level: "action", text: `${forMe} ${forMe === 1 ? "headline is" : "headlines are"} waiting for your approval.`, href: "/business/admin/news?tab=approvals", cta: "Review" });
  if (mine > 0) out.push({ id: "my-drafts", level: "info", text: `${mine === 1 ? "Your headline is" : `${mine} of your headlines are`} waiting for a senior admin to approve.`, href: "/business/admin/news?tab=approvals", cta: "See" });
  if (i.viewer.senior && i.adviserRequests > 0) out.push({ id: "adviser-request", level: "action", text: `${i.adviserRequests} ${i.adviserRequests === 1 ? "adviser has" : "advisers have"} asked to work with you. Nothing is allowed until you decide.`, href: "/business/admin/news?tab=people#advisers", cta: "Decide" });
  if (i.viewer.senior && i.adviserPaymentProblem) out.push({ id: "adviser-payment", level: "warning", text: `${i.adviserPaymentProblem} has a payment problem. Your TapCard keeps working for 30 days after its last paid period. You can take over billing yourselves.`, href: "/business/admin/news?tab=people#advisers", cta: "See options" });
  for (const c of i.adviserCover) if (c.ending && i.viewer.senior) out.push({ id: "cover-ending", level: "warning", text: `${c.adviserName}'s payment for your TapCard is ending${c.until ? ` (covered until ${day(c.until)})` : ""}. After that you have 30 days to start your own plan.`, href: "/business/admin/billing", cta: "Billing" });
  if (!i.announcementsPageSet) out.push({ id: "announcements-page", level: "action", text: "TapCard isn't watching your announcements page yet, so new RNS items can't be offered as headlines or checked.", href: "/business/admin/news?tab=post", cta: "Set it up" });
  return out;
}

export function setupSteps(i: OverviewInput, primaryCardId: string | null): SetupStep[] {
  return [
    { id: "card", done: !!primaryCardId, title: "Check your company card", text: "This is what a shareholder sees after scanning: your logo, investor pages and the follow button.", href: primaryCardId ? `/c/${primaryCardId}?preview=1` : "/business/admin/cards" },
    { id: "admins", done: i.adminCount >= 2 && i.seniorCount >= 1, title: "Add your admins and choose who is senior", text: "Senior admins can post regulatory news. Everyone you add starts as a general admin. Two or three seniors is usual.", href: "/business/admin/admins", seniorOnly: true },
    { id: "page", done: i.announcementsPageSet, title: "Point TapCard at your announcements page", text: "New RNS items become one-tap headlines, and regulatory headlines are checked against this page.", href: "/business/admin/news?tab=post" },
    { id: "approval", done: i.approvalOn || i.seniorCount < 2, title: "Decide on second approval", text: "Optional: one admin writes a regulatory headline and a different senior admin approves it. Needs two senior admins.", href: "/business/admin/news?tab=people", seniorOnly: true, optional: true },
    { id: "privacy", done: i.privacyUrlSet, title: "Link your privacy notice", text: "The app shows it next to the form where a shareholder chooses to share their name and email.", href: "/business/admin/settings" },
    { id: "team", done: i.teamCards > 0, title: "Add the people who speak for the company", text: "The chair, CEO, CFO and IR contact each get a card and QR code.", href: "/business/admin/cards?tab=team" },
    { id: "event", done: i.events > 0, title: "Make a QR code for your AGM or a roadshow", text: "One code per event, with optional time slots, and a list of who registered.", href: "/business/admin/cards?tab=events", optional: true },
    { id: "qr", done: false, title: "Put your QR code where shareholders look", text: "Results slides, the annual report, the AGM notice and your website. Download it on Cards & QR.", href: "/business/admin/cards" },
    { id: "post", done: i.hasPosted, title: "Post your first headline", text: "Only after the announcement is public. Followers are notified.", href: "/business/admin/news?tab=post" },
    { id: "followers", done: i.shared > 0, title: "See who chose to share their details", text: "They appear on the Followers tab, with a CSV download.", href: "/business/admin/followers" },
  ];
}

/// The first step still to do that this person can do, or null when everything required is done.
export function nextStep(steps: SetupStep[], viewerSenior: boolean): SetupStep | null {
  return steps.find((s) => !s.done && !s.optional && !(s.seniorOnly && !viewerSenior)) ?? null;
}
