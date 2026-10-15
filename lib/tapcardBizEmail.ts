import { Resend } from "resend";
import { inviteEmailRoute } from "@/lib/inviteEmailRoute";

// TapCard for Business's own small set of transactional emails — magic
// links. (Employee invites go from the admin's own email — see
// lib/tapcardBizInvite.ts.) Deliberately separate from
// lib/inviteEmail.ts, which is built around the personal-card invite
// flow's rich card-preview image; these are plain, short, and don't need
// any of that machinery. Reuses the same Resend/from-address wiring
// (lib/inviteEmailRoute.ts) rather than inventing new sender config.

// No BCC to the sender (unlike the personal invites): every one of these
// carries a single-use sign-in or claim link, which shouldn't be copied
// into anyone else's mailbox — and when the recipient is the sender
// address itself, a BCC just delivers the same email twice.
export async function send(to: string, subject: string, html: string, text: string): Promise<void> {
  const route = inviteEmailRoute();
  if (route.viaResend) {
    const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: route.from,
      to,
      replyTo: route.replyTo,
      subject,
      text,
      html,
    });
    if (error) throw new Error(error.message ?? "Email send failed");
    return;
  }
  // Graph (M365) send path, same function the personal-invite send route
  // uses in its non-Resend branch.
  const { sendMailbroomEmail } = await import("@/lib/mailbroomGraphMail");
  await sendMailbroomEmail({ to, subject, bodyHtml: html, signatureHtml: "" });
}

export async function sendBizLoginEmail(email: string, link: string): Promise<void> {
  const html = `
    <p>Tap the link below to sign in to your TapCard for Business admin:</p>
    <p><a href="${link}">${link}</a></p>
    <p>This link works once and expires in 15 minutes.</p>
  `;
  await send(email, "Sign in to TapCard for Business", html, `Sign in: ${link}\n\nThis link works once and expires in 15 minutes.`);
}

export async function sendBizTrialReminderEmail(email: string, company: string, endsOn: string): Promise<void> {
  const link = "https://tapcard.aiert.co.uk/business/admin/billing";
  const html = `
    <p>Your free TapCard for Business trial for <strong>${company.replace(/</g, "&lt;")}</strong> ends on <strong>${endsOn}</strong>.</p>
    <p>After that, invites stop and your company cards are no longer covered for Promote (special offers and news). To keep everything working, choose a plan:</p>
    <p><a href="${link}">${link}</a></p>
    <p>Plans start at £20 a year for up to 10 people. If you're not going to carry on, there's nothing to do.</p>
  `;
  await send(email, `Your TapCard for Business trial ends on ${endsOn}`, html,
    `Your free TapCard for Business trial for ${company} ends on ${endsOn}.\n\nAfter that, invites stop and your company cards are no longer covered for Promote. To keep everything working, choose a plan: ${link}\n\nPlans start at £20 a year for up to 10 people. If you're not going to carry on, there's nothing to do.`);
}
