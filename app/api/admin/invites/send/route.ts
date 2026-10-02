import { NextResponse } from "next/server";
import { Resend } from "resend";
import sql from "@/lib/db";
import { isAdminRequest } from "@/lib/adminRequest";
import { inviteEmailHtml, inviteEmailText } from "@/lib/inviteEmail";
import { inviteEmailRoute } from "@/lib/inviteEmailRoute";
import { founderOffer } from "@/lib/tapcardFounders";
import { sendMailbroomEmail } from "@/lib/mailbroomGraphMail";
import {
  INVITE_CHANNELS,
  INVITE_LINK_ORIGIN,
  PERSONAL_NOTE_MARKER,
  SOCIAL_CHANNELS,
  type InviteChannel,
  type SocialChannel,
  type InviteContact,
  androidWaitlistLink,
  ensureInviteSchema,
  inviteLink,
  newInviteToken,
  personalise,
  playStoreLive,
  playStoreUrl,
  shareLink,
  socialOpenUrl,
  whatsappNumber,
} from "@/lib/tapcardInvites";

// Invite emails go out from martin@mailbroom.app through Microsoft Graph by
// default: a real Microsoft 365 mailbox sending one-to-one mail is far less
// likely to land in junk than a bulk email service, and replies and Sent
// Items stay in Outlook. TAPCARD_INVITE_EMAIL_VIA=resend switches to Resend
// (with delivery/bounce webhooks) — see lib/inviteEmailRoute.ts.

// Sending can wait on Outlook/Resend; don't let a slow reply cut it off.
export const maxDuration = 30;

// Any unexpected failure comes back as JSON with its message, so the Send tab
// can show what went wrong instead of "undefined".
export async function POST(req: Request) {
  try {
    return await handleSend(req);
  } catch (err) {
    console.error("TapCard invite send failed", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Send failed" }, { status: 500 });
  }
}

async function handleSend(req: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const contactId = Number(body?.contactId);
  const channel = body?.channel as InviteChannel;
  const campaign = String(body?.campaign ?? "").trim().slice(0, 30);
  const subjectTemplate = String(body?.subject ?? "").slice(0, 200);
  let messageTemplate = String(body?.message ?? "").slice(0, 5000);
  if (!Number.isInteger(contactId) || !INVITE_CHANNELS.includes(channel) || !campaign || !messageTemplate.trim()) {
    return NextResponse.json({ error: "contactId, channel, campaign and message are required" }, { status: 400 });
  }
  if (!messageTemplate.includes("{link}")) messageTemplate += "\n\n{link}";
  const route = inviteEmailRoute();
  messageTemplate = messageTemplate.replaceAll("{fromEmail}", route.fromEmail);
  // Live at the moment of sending, so nobody is promised a free place that's gone.
  const offer = await founderOffer();
  messageTemplate = messageTemplate.replaceAll("{freeOffer}", offer.line);
  if (PERSONAL_NOTE_MARKER.test(messageTemplate)) {
    return NextResponse.json({ error: "Replace the [personalise here…] line before sending" }, { status: 400 });
  }

  await ensureInviteSchema();
  const contact = ((await sql`
    SELECT id, name, first_name, email, phone, company, linkedin_url, facebook_url, do_not_contact
    FROM tapcard_invite_contacts WHERE id = ${contactId}
  `) as InviteContact[])[0];
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  if (contact.do_not_contact) return NextResponse.json({ error: `${contact.name} asked not to be contacted` }, { status: 409 });

  if (!body?.allowRepeat) {
    const prior = (await sql`
      SELECT 1 FROM tapcard_invite_sends
      WHERE contact_id = ${contactId} AND channel = ${channel} AND campaign = ${campaign} AND bounced_at IS NULL LIMIT 1
    `) as unknown[];
    if (prior.length) return NextResponse.json({ error: "already-sent", skipped: true }, { status: 409 });
  }

  const waNumber = channel === "whatsapp" ? whatsappNumber(contact.phone) : null;
  if (channel === "email" && !contact.email) return NextResponse.json({ error: "No email address" }, { status: 400 });
  if (channel === "whatsapp" && !waNumber) return NextResponse.json({ error: "No usable mobile number" }, { status: 400 });

  const token = newInviteToken();
  const link = inviteLink(token);
  const passOnLink = shareLink(token);
  // Once Google's approved the listing (TAPCARD_PLAY_LIVE=1), send Android
  // straight to the real Play Store page instead of the waitlist.
  const androidLink = playStoreLive() ? playStoreUrl(campaign, channel) : androidWaitlistLink(token);
  const message = personalise(messageTemplate, contact, link, passOnLink, androidLink);
  const subject = personalise((subjectTemplate || "{offerSubject}").replaceAll("{offerSubject}", offer.subject), contact, link);

  const inserted = (await sql`
    INSERT INTO tapcard_invite_sends (token, contact_id, channel, campaign, subject, message)
    VALUES (${token}, ${contactId}, ${channel}, ${campaign}, ${channel === "email" ? subject : ""}, ${message})
    RETURNING id
  `) as { id: number }[];
  const sendId = inserted[0].id;

  if (channel === "email") {
    const unsubscribeUrl = `${INVITE_LINK_ORIGIN}/u/${token}`;
    const html = inviteEmailHtml({
      text: message,
      link,
      passOnLink,
      androidLink,
      cardImageUrl: `${INVITE_LINK_ORIGIN}/api/invite-card/${token}`,
      unsubscribeUrl,
    });
    try {
      if (route.viaResend) {
        const { data, error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
          from: route.from,
          to: contact.email,
          // Resend sends don't touch the real mailbox, so there's no Sent
          // Items copy otherwise — bcc gives a record in the inbox instead.
          bcc: route.fromEmail,
          replyTo: route.replyTo,
          subject,
          text: `${inviteEmailText(message)}\n\n--\nDon't want these? ${unsubscribeUrl}`,
          html,
          headers: {
            "List-Unsubscribe": `<${INVITE_LINK_ORIGIN}/api/unsubscribe/${token}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        });
        if (error || !data) throw new Error(error?.message ?? "Email send failed");
        await sql`UPDATE tapcard_invite_sends SET resend_id = ${data.id} WHERE id = ${sendId}`;
      } else {
        // Graph only allows custom X- headers, so no List-Unsubscribe header
        // here — the "Don't send me these" link in the body does that job.
        await sendMailbroomEmail({ to: contact.email, subject, bodyHtml: html, signatureHtml: "" });
      }
    } catch (err) {
      await sql`DELETE FROM tapcard_invite_sends WHERE id = ${sendId}`;
      return NextResponse.json({ error: err instanceof Error ? err.message : "Email send failed" }, { status: 502 });
    }
    return NextResponse.json({ ok: true, link });
  }

  // WhatsApp, LinkedIn and Messenger preview the link with a picture of
  // their card, but only wait a few seconds for it. Draw it now (it's then
  // in Vercel's cache) so it's ready when their preview fetcher asks.
  await fetch(`${INVITE_LINK_ORIGIN}/api/invite-card/${token}`, { signal: AbortSignal.timeout(9000) }).catch(() => {});

  if (channel === "whatsapp") {
    return NextResponse.json({ ok: true, link, waUrl: `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}` });
  }

  // LinkedIn / Messenger: the page copies the text and opens openUrl.
  if (SOCIAL_CHANNELS.includes(channel as SocialChannel)) {
    return NextResponse.json({ ok: true, link, text: message, openUrl: socialOpenUrl(channel as SocialChannel, contact) });
  }

  return NextResponse.json({ ok: true, link, text: message });
}
