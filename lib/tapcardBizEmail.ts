import { Resend } from "resend";
import { inviteEmailRoute } from "@/lib/inviteEmailRoute";

// TapCard for Business's own small set of transactional emails — magic
// links and employee claim invites. Deliberately separate from
// lib/inviteEmail.ts, which is built around the personal-card invite
// flow's rich card-preview image; these are plain, short, and don't need
// any of that machinery. Reuses the same Resend/from-address wiring
// (lib/inviteEmailRoute.ts) rather than inventing new sender config.

async function send(to: string, subject: string, html: string, text: string): Promise<void> {
  const route = inviteEmailRoute();
  if (route.viaResend) {
    const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: route.from,
      to,
      bcc: route.fromEmail,
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

export async function sendBizClaimEmail(email: string, name: string, companyName: string, link: string): Promise<void> {
  const html = `
    <p>Hi ${name || "there"},</p>
    <p>${companyName} has set you up with a TapCard — your digital business card.</p>
    <p><a href="${link}">Tap here to set up your card</a></p>
  `;
  await send(
    email,
    `${companyName} has set you up with TapCard`,
    html,
    `Hi ${name || "there"},\n\n${companyName} has set you up with a TapCard — your digital business card.\n\nSet up your card: ${link}`
  );
}
