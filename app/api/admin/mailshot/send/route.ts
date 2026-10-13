import { NextResponse } from "next/server";
import { Resend } from "resend";
import sql from "@/lib/db";
import { isAdminRequest } from "@/lib/adminRequest";
import { inviteEmailRoute } from "@/lib/inviteEmailRoute";
import { INVITE_LINK_ORIGIN, ensureInviteSchema, newInviteToken } from "@/lib/tapcardInvites";
import {
  MAILSHOT_SUBJECTS,
  ensureMailshotSchema,
  mailshotHtml,
  mailshotLinks,
  mailshotStats,
  mailshotText,
  safeFirstName,
  type Relationship,
} from "@/lib/mailshot";

// Sends the cold mailshot through Resend only (never your own Outlook mailbox). "test" sends one copy to an
// address you choose; "batch" sends the next few people in the list, within a daily limit, so a new sending
// address warms up gradually instead of mailing everyone at once.
export const maxDuration = 60;

const HARD_DAILY_LIMIT = 300;
const MAX_PER_CALL = 40;

type Contact = { id: number; first_name: string; name: string; email: string; relationship?: Relationship; greeting?: string | null };

export async function POST(req: Request) {
  try {
    return await handle(req);
  } catch (err) {
    console.error("Mailshot send failed", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Send failed" }, { status: 500 });
  }
}

function subjectFor(index: number, firstName: string): string {
  const template = MAILSHOT_SUBJECTS[Math.min(Math.max(index, 0), MAILSHOT_SUBJECTS.length - 1)];
  // No first name: drop the "{FirstName}, " opening rather than send "Hi there, 2 minutes…" style gaps.
  return firstName ? template.replaceAll("{FirstName}", firstName) : template.replace("{FirstName}, ", "").replace("{FirstName}", "");
}

async function sendOne(resend: Resend, from: string, replyTo: string, campaign: string, contact: Contact, subjectIndex: number) {
  await ensureInviteSchema();
  const token = newInviteToken();
  const links = mailshotLinks(token);
  // A greeting set in the queue wins (an empty one means just "Hi,"); otherwise the contact's first name.
  const firstName = safeFirstName(contact.greeting !== undefined && contact.greeting !== null ? contact.greeting : contact.first_name);
  const subject = subjectFor(subjectIndex, firstName);
  const relationship: Relationship = contact.relationship === "personal" ? "personal" : "business";
  const text = mailshotText(firstName, links, relationship);
  const inserted = (await sql`
    INSERT INTO tapcard_invite_sends (token, contact_id, channel, campaign, subject, message)
    VALUES (${token}, ${contact.id}, 'email', ${campaign}, ${subject}, ${text})
    RETURNING id
  `) as { id: number }[];
  const sendId = inserted[0].id;
  try {
    const { data, error } = await resend.emails.send({
      from,
      to: contact.email,
      replyTo,
      subject,
      text,
      html: mailshotHtml(firstName, links, relationship),
      headers: {
        "List-Unsubscribe": `<${INVITE_LINK_ORIGIN}/api/unsubscribe/${token}>, <mailto:${replyTo}?subject=Unsubscribe>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    if (error || !data) throw new Error(error?.message ?? "Email send failed");
    await sql`UPDATE tapcard_invite_sends SET resend_id = ${data.id} WHERE id = ${sendId}`;
  } catch (err) {
    await sql`DELETE FROM tapcard_invite_sends WHERE id = ${sendId}`;
    throw err;
  }
}

async function handle(req: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY is not set, so the mailshot cannot send" }, { status: 500 });
  }
  const body = await req.json().catch(() => null);
  const campaign = String(body?.campaign ?? "").trim().slice(0, 30);
  const mode = body?.mode === "test" ? "test" : "batch";
  const subjectIndex = Number.isInteger(body?.subjectIndex) ? body.subjectIndex : 0;
  if (!campaign) return NextResponse.json({ error: "campaign is required" }, { status: 400 });

  await ensureMailshotSchema();
  const route = inviteEmailRoute();
  const from = process.env.MAILSHOT_FROM || process.env.TAPCARD_INVITE_FROM || "Martin Dobson <martin@aiert.co.uk>";
  const resend = new Resend(process.env.RESEND_API_KEY);

  if (mode === "test") {
    const to = String(body?.testTo ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return NextResponse.json({ error: "Enter an email address for the test" }, { status: 400 });
    await sql`
      INSERT INTO tapcard_invite_contacts (dedupe_key, name, first_name, email)
      VALUES (${`e:${to}`}, ${String(body?.testName ?? "Martin")}, ${String(body?.testName ?? "Martin")}, ${to})
      ON CONFLICT (dedupe_key) DO NOTHING
    `;
    const contact = ((await sql`SELECT id, first_name, name, email, do_not_contact FROM tapcard_invite_contacts WHERE dedupe_key = ${`e:${to}`}`) as (Contact & { do_not_contact: boolean })[])[0];
    if (contact.do_not_contact) return NextResponse.json({ error: `${to} has unsubscribed, so no test can be sent there` }, { status: 409 });
    await sendOne(resend, from, route.replyTo, `${campaign}-test`, { ...contact, relationship: body?.relationship === "personal" ? "personal" : "business" }, subjectIndex);
    return NextResponse.json({ ok: true, sent: 1, test: true, to });
  }

  const stats = await mailshotStats(campaign);
  // Protect the sending address: if many have bounced, stop until the list has been cleaned.
  // Judged separately for past business contacts and personal contacts, so one old list's bounces don't block
  // a different list, but a bad run in the list being sent now does stop it.
  const nextKind = ((await sql`
    SELECT l.relationship FROM tapcard_mailshot_list l JOIN tapcard_invite_contacts c ON c.id = l.contact_id
    WHERE l.campaign = ${campaign} AND l.status = 'queued' AND NOT c.do_not_contact
      AND NOT EXISTS (SELECT 1 FROM tapcard_invite_sends s WHERE s.contact_id = c.id AND s.campaign = ${campaign})
    ORDER BY l.added_at, c.id LIMIT 1
  `) as { relationship: string }[])[0]?.relationship ?? "business";
  const kind = ((await sql`
    SELECT COUNT(*)::int AS sent, COUNT(s.bounced_at)::int AS bounced
    FROM tapcard_invite_sends s JOIN tapcard_mailshot_list l ON l.contact_id = s.contact_id AND l.campaign = s.campaign
    WHERE s.campaign = ${campaign} AND l.relationship = ${nextKind}
  `) as { sent: number; bounced: number }[])[0];
  if (kind.sent >= 25 && kind.bounced / kind.sent > 0.08) {
    return NextResponse.json({
      error: `Paused: ${kind.bounced} of ${kind.sent} bounced (over 8%) in this list. Check the bounced list and clean it before sending more.`,
    }, { status: 409 });
  }
  const dailyCap = Math.min(Math.max(Number(body?.dailyCap) || 50, 1), HARD_DAILY_LIMIT);
  const room = dailyCap - stats.sentToday;
  if (room <= 0) {
    return NextResponse.json({ ok: true, sent: 0, failed: 0, message: `Today's limit of ${dailyCap} is reached. Carry on tomorrow.`, stats });
  }
  const n = Math.min(Math.max(Number(body?.count) || 25, 1), MAX_PER_CALL, room);
  const next = (await sql`
    SELECT c.id, c.first_name, c.name, c.email, l.relationship, l.greeting
    FROM tapcard_mailshot_list l
    JOIN tapcard_invite_contacts c ON c.id = l.contact_id
    WHERE l.campaign = ${campaign} AND l.status = 'queued' AND NOT c.do_not_contact
      AND NOT EXISTS (SELECT 1 FROM tapcard_invite_sends s WHERE s.contact_id = c.id AND s.campaign = ${campaign})
    ORDER BY l.added_at, c.id
    LIMIT ${n}
  `) as Contact[];

  let sent = 0;
  let failed = 0;
  let consecutiveFailures = 0;
  const errors: string[] = [];
  for (const contact of next) {
    try {
      await sendOne(resend, from, route.replyTo, campaign, contact, subjectIndex);
      sent++;
      consecutiveFailures = 0;
    } catch (err) {
      failed++;
      consecutiveFailures++;
      if (errors.length < 3) errors.push(`${contact.email}: ${err instanceof Error ? err.message : "failed"}`);
      if (consecutiveFailures >= 3) break; // something is wrong (sending domain, limits): stop rather than burn through the list
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return NextResponse.json({ ok: true, sent, failed, errors, stats: await mailshotStats(campaign) });
}
