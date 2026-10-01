import { NextResponse } from "next/server";
import { Resend } from "resend";
import sql from "@/lib/db";
import { isAdminRequest } from "@/lib/adminRequest";
import {
  INVITE_CHANNELS,
  INVITE_LINK_ORIGIN,
  type InviteChannel,
  type InviteContact,
  ensureInviteSchema,
  inviteLink,
  newInviteToken,
  personalise,
  whatsappNumber,
} from "@/lib/tapcardInvites";

const FROM = process.env.TAPCARD_INVITE_FROM || "Martin Dobson <martin@aiert.co.uk>";
const REPLY_TO = process.env.TAPCARD_INVITE_REPLY_TO || "Martin@aiert.co.uk";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Plain, personal-looking email (this is one person writing to someone they
// know, not a newsletter): the message as typed, the tracked link made
// clickable, a "Get TapCard free" button, an open pixel and an unsubscribe.
function emailHtml(text: string, link: string, token: string): string {
  const paragraphs = escapeHtml(text)
    .split(/\n{2,}/)
    .map((p) =>
      `<p style="margin:0 0 14px;">${p
        .replace(/\n/g, "<br>")
        .replaceAll(escapeHtml(link), `<a href="${link}" style="color:#0f766e;">${escapeHtml(link)}</a>`)}</p>`,
    )
    .join("");
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1f2937;max-width:560px;">
${paragraphs}
<p style="margin:22px 0;"><a href="${link}" style="display:inline-block;background:#111318;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:10px;">Get TapCard free</a></p>
<p style="margin:28px 0 0;font-size:12px;color:#9ca3af;">You're getting this because you're in Martin Dobson's contacts. <a href="${INVITE_LINK_ORIGIN}/u/${token}" style="color:#9ca3af;">Don't send me these</a></p>
<img src="${INVITE_LINK_ORIGIN}/api/invite-open/${token}" width="1" height="1" alt="" style="display:block;border:0;" />
</div>`;
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

  await ensureInviteSchema();
  const contact = ((await sql`
    SELECT id, name, first_name, email, phone, company, do_not_contact
    FROM tapcard_invite_contacts WHERE id = ${contactId}
  `) as InviteContact[])[0];
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  if (contact.do_not_contact) return NextResponse.json({ error: `${contact.name} asked not to be contacted` }, { status: 409 });

  if (!body?.allowRepeat) {
    const prior = (await sql`
      SELECT 1 FROM tapcard_invite_sends
      WHERE contact_id = ${contactId} AND channel = ${channel} AND campaign = ${campaign} LIMIT 1
    `) as unknown[];
    if (prior.length) return NextResponse.json({ error: "already-sent", skipped: true }, { status: 409 });
  }

  const waNumber = channel === "whatsapp" ? whatsappNumber(contact.phone) : null;
  if (channel === "email" && !contact.email) return NextResponse.json({ error: "No email address" }, { status: 400 });
  if (channel === "whatsapp" && !waNumber) return NextResponse.json({ error: "No usable mobile number" }, { status: 400 });

  const token = newInviteToken();
  const link = inviteLink(token);
  const message = personalise(messageTemplate, contact, link);
  const subject = personalise(subjectTemplate || "A free gift for you: TapCard", contact, link);

  const inserted = (await sql`
    INSERT INTO tapcard_invite_sends (token, contact_id, channel, campaign, subject, message)
    VALUES (${token}, ${contactId}, ${channel}, ${campaign}, ${channel === "email" ? subject : ""}, ${message})
    RETURNING id
  `) as { id: number }[];
  const sendId = inserted[0].id;

  if (channel === "email") {
    const { data, error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: FROM,
      to: contact.email,
      replyTo: REPLY_TO,
      subject,
      text: `${message}\n\n--\nDon't want these? ${INVITE_LINK_ORIGIN}/u/${token}`,
      html: emailHtml(message, link, token),
      headers: {
        "List-Unsubscribe": `<${INVITE_LINK_ORIGIN}/api/unsubscribe/${token}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    if (error || !data) {
      await sql`DELETE FROM tapcard_invite_sends WHERE id = ${sendId}`;
      return NextResponse.json({ error: error?.message ?? "Email send failed" }, { status: 502 });
    }
    await sql`UPDATE tapcard_invite_sends SET resend_id = ${data.id} WHERE id = ${sendId}`;
    return NextResponse.json({ ok: true, link });
  }

  if (channel === "whatsapp") {
    return NextResponse.json({ ok: true, link, waUrl: `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}` });
  }

  return NextResponse.json({ ok: true, link, text: message });
}
