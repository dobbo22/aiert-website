import { Resend } from "resend";
import { inviteEmailRoute } from "@/lib/inviteEmailRoute";

// Quiet "their TapCard changed" pings to people the owner picked from their
// phone's Contacts and sent a direct link to (app/api/tapcard/cards/[id]/recipients).
// Deliberately separate from lib/inviteEmail.ts (the richer personal-invite
// template) and lib/tapcardBizEmail.ts (business magic links) — short,
// plain, and the one email type here that needs List-Unsubscribe, since
// unlike those two it's sent without the recipient ever having asked for it.

const INVITE_LINK_ORIGIN = "https://tapcard.aiert.co.uk";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function sendCardUpdatedEmail(to: string, ownerName: string, cardLink: string, unsubscribeToken: string): Promise<void> {
  const name = escapeHtml(ownerName || "Someone");
  const unsubscribeUrl = `${INVITE_LINK_ORIGIN}/api/tapcard/unsubscribe/${unsubscribeToken}`;
  const subject = `${ownerName || "Someone"}'s TapCard was updated`;
  const html = `
    <p>${name}'s contact details have changed.</p>
    <p><a href="${cardLink}">${cardLink}</a> always shows their latest TapCard — nothing for you to do, it's already up to date.</p>
    <p style="color:#888;font-size:12px;margin-top:24px;">
      You're getting this because ${name} sent you their TapCard directly.
      <a href="${unsubscribeUrl}">Don't send me these</a>.
    </p>
  `;
  const text = `${ownerName || "Someone"}'s contact details have changed.\n\n${cardLink} always shows their latest TapCard.\n\n--\nDon't want these? ${unsubscribeUrl}`;

  const route = inviteEmailRoute();
  if (route.viaResend) {
    const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: route.from,
      to,
      replyTo: route.replyTo,
      subject,
      text,
      html,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    if (error) throw new Error(error.message ?? "Email send failed");
    return;
  }
  // Graph only allows custom X- headers, so no List-Unsubscribe header here
  // — the "Don't send me these" link in the body does that job, same as
  // the personal-invite send route's Graph fallback.
  const { sendMailbroomEmail } = await import("@/lib/mailbroomGraphMail");
  await sendMailbroomEmail({ to, subject, bodyHtml: html, signatureHtml: "" });
}
