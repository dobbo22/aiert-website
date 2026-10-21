import { send } from "@/lib/tapcardBizEmail";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const date = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" });
export const ADMIN_INBOX = process.env.ADMIN_NOTIFY_EMAIL ?? "enquiries@aiert.co.uk";

export async function sendGrantedEmail(to: string, groupName: string, until: string): Promise<void> {
  const name = groupName || "your group";
  await send(
    to, "TapCard Promote is free for your group",
    `<p>Good news: TapCard Promote is now free for ${esc(name)} until <strong>${date(until)}</strong>.</p>
     <p>Open TapCard, go to your card and tap <strong>Promote</strong> to post news, events and offers. Everyone who follows your card is told, at most twice a week each.</p>
     <p>When the free period is coming to an end we will write to you first. Reply to this email if you have any questions.</p><p>TapCard by AIERT Ltd</p>`,
    `Good news: TapCard Promote is now free for ${name} until ${date(until)}.\n\nOpen TapCard, go to your card and tap Promote to post news, events and offers. Everyone who follows your card is told, at most twice a week each.\n\nWhen the free period is coming to an end we will write to you first. Reply to this email if you have any questions.\n\nTapCard by AIERT Ltd`,
  );
}

export async function sendDeclinedEmail(to: string, groupName: string, note: string): Promise<void> {
  const name = groupName || "your group";
  await send(
    to, "About your TapCard Promote request",
    `<p>Thank you for asking about free TapCard Promote for ${esc(name)}.</p><p>We are not able to offer it this time${note ? `: ${esc(note)}` : "."}</p><p>Your card still works as normal, and TapCard Promote is free for the first 3 months. Reply to this email if you would like us to look again.</p><p>TapCard by AIERT Ltd</p>`,
    `Thank you for asking about free TapCard Promote for ${name}.\n\nWe are not able to offer it this time${note ? `: ${note}` : "."}\n\nYour card still works as normal, and TapCard Promote is free for the first 3 months. Reply to this email if you would like us to look again.\n\nTapCard by AIERT Ltd`,
  );
}

export async function notifyAdminOfRequest(info: { groupName: string; email: string; cardId: string; charityNumber: string; reason: string }): Promise<void> {
  const link = `https://tapcard.aiert.co.uk/c/${info.cardId}`;
  await send(
    ADMIN_INBOX, `TapCard free Promote request: ${info.groupName || info.email}`,
    `<p>A group asked for free TapCard Promote and was <strong>not</strong> approved automatically.</p>
     <p>Group: ${esc(info.groupName)}<br>Email: ${esc(info.email)}<br>Charity number: ${esc(info.charityNumber || "none given")}<br>Card: <a href="${link}">${link}</a><br>Why not automatic: ${esc(info.reason)}</p>
     <p>Review it at <a href="https://www.aiert.co.uk/admin/social/grants">the grants page</a>.</p>`,
    `A group asked for free TapCard Promote and was not approved automatically.\n\nGroup: ${info.groupName}\nEmail: ${info.email}\nCharity number: ${info.charityNumber || "none given"}\nCard: ${link}\nWhy not automatic: ${info.reason}\n\nReview it at https://www.aiert.co.uk/admin/social/grants`,
  );
}
