import { NextResponse } from "next/server";
import { Resend } from "resend";
import sql from "@/lib/db";
import { isAdminRequest } from "@/lib/adminRequest";
import { DAILY_EMAIL_LIMIT, inviteEmailHtml, inviteEmailText } from "@/lib/inviteEmail";
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
  shareLink,
  socialOpenUrl,
  whatsappNumber,
} from "@/lib/tapcardInvites";

// Invite emails go out from martin@mailbroom.app through Microsoft Graph by
// default: a real Microsoft 365 mailbox sending one-to-one mail is far less
// likely to land in junk than a bulk email service, and replies and Sent
// Items stay in Outlook. TAPCARD_INVITE_EMAIL_VIA=resend switches back to
// Resend (from aiert.co.uk, with delivery/bounce webhooks).
const VIA_RESEND = process.env.TAPCARD_INVITE_EMAIL_VIA === "resend";
const RESEND_FROM = process.env.TAPCARD_INVITE_FROM || "Martin Dobson <martin@aiert.co.uk>";
const RESEND_REPLY_TO = process.env.TAPCARD_INVITE_REPLY_TO || "Martin@aiert.co.uk";

/// Invite emails already sent today (UK time), for the daily limit.
async function emailsSentToday(): Promise<number> {
  const rows = (await sql`
    SELECT COUNT(*)::int AS n FROM tapcard_invite_sends
    WHERE channel = 'email' AND bounced_at IS NULL
      AND sent_at >= (date_trunc('day', now() AT TIME ZONE 'Europe/London') AT TIME ZONE 'Europe/London')
  `) as { n: number }[];
  return rows[0]?.n ?? 0;
}

export async function POST(req: Request) {
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
  if (channel === "email") {
    const sentToday = await emailsSentToday();
    if (sentToday >= DAILY_EMAIL_LIMIT) {
      return NextResponse.json(
        { error: `Today's limit of ${DAILY_EMAIL_LIMIT} emails is reached. Carry on tomorrow.`, limitReached: true },
        { status: 429 },
      );
    }
  }

  const token = newInviteToken();
  const link = inviteLink(token);
  const passOnLink = shareLink(token);
  const androidLink = androidWaitlistLink(token);
  const message = personalise(messageTemplate, contact, link, passOnLink, androidLink);
  const subject = personalise(subjectTemplate || "A free gift for you: TapCard", contact, link);

  const inserted = (await sql`
    INSERT INTO tapcard_invite_sends (token, contact_id, channel, campaign, subject, message)
    VALUES (${token}, ${contactId}, ${channel}, ${campaign}, ${channel === "email" ? subject : ""}, ${message})
    RETURNING id
  `) as { id: number }[];
  const sendId = inserted[0].id;

  if (channel === "email") {
    const unsubscribeUrl = `${INVITE_LINK_ORIGIN}/u/${token}`;
    const html = inviteEmailHtml({ text: message, link, passOnLink, androidLink, unsubscribeUrl });
    try {
      if (VIA_RESEND) {
        const { data, error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
          from: RESEND_FROM,
          to: contact.email,
          replyTo: RESEND_REPLY_TO,
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

  if (channel === "whatsapp") {
    return NextResponse.json({ ok: true, link, waUrl: `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}` });
  }

  // LinkedIn / Messenger: the page copies the text and opens openUrl.
  if (SOCIAL_CHANNELS.includes(channel as SocialChannel)) {
    return NextResponse.json({ ok: true, link, text: message, openUrl: socialOpenUrl(channel as SocialChannel, contact) });
  }

  return NextResponse.json({ ok: true, link, text: message });
}
