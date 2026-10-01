// Which way TapCard invite emails go out (server only — reads env).
// Default: martin@mailbroom.app through Microsoft Graph (Outlook).
// TAPCARD_INVITE_EMAIL_VIA=resend: through Resend instead, from
// TAPCARD_INVITE_FROM (default martin@aiert.co.uk) — e.g. while Microsoft
// is blocking the tenant's outbound mail.

export type InviteEmailRoute = { viaResend: boolean; from: string; fromEmail: string; replyTo: string };

export function inviteEmailRoute(): InviteEmailRoute {
  const viaResend = process.env.TAPCARD_INVITE_EMAIL_VIA === "resend";
  const from = viaResend
    ? process.env.TAPCARD_INVITE_FROM || "Martin Dobson <martin@aiert.co.uk>"
    : "Martin Dobson <martin@mailbroom.app>";
  return {
    viaResend,
    from,
    fromEmail: from.match(/<([^>]+)>/)?.[1] ?? from,
    // Replies land in the Outlook mailbox either way (incoming mail isn't blocked).
    replyTo: process.env.TAPCARD_INVITE_REPLY_TO || "martin@mailbroom.app",
  };
}
