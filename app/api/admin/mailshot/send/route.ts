import { NextResponse } from "next/server";
import { Resend } from "resend";
import sql from "@/lib/db";
import { isAdminRequest } from "@/lib/adminRequest";
import { inviteEmailRoute } from "@/lib/inviteEmailRoute";
import { INVITE_LINK_ORIGIN, ensureInviteSchema, newInviteToken } from "@/lib/tapcardInvites";
import { codesForContact } from "@/lib/promoCodes";
import {
  MAILSHOT_SUBJECTS,
  restaurantHtml,
  restaurantSubject,
  restaurantText,
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

/// An error about one recipient's address (as opposed to the sending domain, the key, or a rate limit).
function refusedAddress(message: string): boolean {
  return /invalid (?:\w+ )?(?:email|address|recipient)|invalid `?to`? field|recipient|mailbox|does not exist|not a valid|suppress|undeliverable|no such user|bad address|malformed/i.test(message) && !/api key|rate limit|domain is not verified|not verified|quota|unauthor/i.test(message);
}

function subjectFor(index: number, firstName: string): string {
  const template = MAILSHOT_SUBJECTS[Math.min(Math.max(index, 0), MAILSHOT_SUBJECTS.length - 1)];
  // No first name: drop the "{FirstName}, " opening rather than send "Hi there, 2 minutes…" style gaps.
  return firstName ? template.replaceAll("{FirstName}", firstName) : template.replace("{FirstName}, ", "").replace("{FirstName}", "");
}

async function sendOne(resend: Resend, from: string, replyTo: string, campaign: string, contact: Contact, subjectIndex: number, isTest = false) {
  await ensureInviteSchema();
  const token = newInviteToken();
  const links = mailshotLinks(token);
  // A greeting set in the queue wins (an empty one means just "Hi,"); otherwise the contact's first name.
  const firstName = safeFirstName(contact.greeting !== undefined && contact.greeting !== null ? contact.greeting : contact.first_name);
  const subject = contact.relationship === "restaurant" ? restaurantSubject(subjectIndex, contact.name) : subjectFor(subjectIndex, firstName);
  const relationship: Relationship = contact.relationship === "personal" ? "personal" : contact.relationship === "restaurant" ? "restaurant" : "business";
  // A restaurant's own free-months codes (a test shows made-up ones and takes nothing from the pool).
  const codes = relationship === "restaurant" ? (isTest ? { ios: "EXAMPLE0CODE", android: "EXAMPLE0CODE" } : await codesForContact(contact.id)) : undefined;
  const text = relationship === "restaurant" ? restaurantText(contact.name, links, codes) : mailshotText(firstName, links, relationship);
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
      html: relationship === "restaurant" ? restaurantHtml(contact.name, links, links.phoneImage, codes) : mailshotHtml(firstName, links, relationship),
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
    // A restaurant test uses a made-up restaurant (own record, so it never changes your normal contact).
    const isRestaurantTest = body?.relationship === "restaurant";
    const useNewFortune = isRestaurantTest && body?.sample === "newfortune";
    const testKey = isRestaurantTest ? (useNewFortune ? `r:test:nf:${to}` : `r:test:${to}`) : `e:${to}`;
    if (useNewFortune) {
      // A real restaurant's published details (a test only: it goes to the address you typed).
      await sql`
        INSERT INTO tapcard_invite_contacts (dedupe_key, name, first_name, email, phone, website, address, booking_url, menu_url, kind)
        VALUES (${testKey}, 'New Fortune Cookie', '', ${to}, '+44 20 7727 7260', 'nfcrestaurant.co.uk', 'W2 4QJ', '', 'nfcrestaurant.co.uk/menu', 'restaurant')
        ON CONFLICT (dedupe_key) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone, website = EXCLUDED.website, address = EXCLUDED.address, booking_url = EXCLUDED.booking_url, menu_url = EXCLUDED.menu_url, kind = EXCLUDED.kind
      `;
    } else if (isRestaurantTest) {
      await sql`
        INSERT INTO tapcard_invite_contacts (dedupe_key, name, first_name, email, phone, website, address, booking_url, menu_url, kind)
        VALUES (${testKey}, 'The Olive Table', '', ${to}, '020 7946 0123', '', '12 Warrington Crescent, London W9', 'olivetable.example/book', 'olivetable.example/menu', 'restaurant')
        ON CONFLICT (dedupe_key) DO NOTHING
      `;
    } else {
      await sql`
        INSERT INTO tapcard_invite_contacts (dedupe_key, name, first_name, email)
        VALUES (${testKey}, ${String(body?.testName ?? "Martin")}, ${String(body?.testName ?? "Martin")}, ${to})
        ON CONFLICT (dedupe_key) DO NOTHING
      `;
    }
    const contact = ((await sql`SELECT id, first_name, name, email, do_not_contact FROM tapcard_invite_contacts WHERE dedupe_key = ${testKey}`) as (Contact & { do_not_contact: boolean })[])[0];
    if (contact.do_not_contact) return NextResponse.json({ error: `${to} has unsubscribed, so no test can be sent there` }, { status: 409 });
    await sendOne(resend, from, route.replyTo, `${campaign}-test`, { ...contact, relationship: body?.relationship === "personal" ? "personal" : body?.relationship === "restaurant" ? "restaurant" : "business" }, subjectIndex, true);
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
  // Only the last 12 hours count: bounced addresses are taken off the list for good as soon as they bounce, so an old bad run
  // should not block the next send for ever.
  const kind = ((await sql`
    SELECT COUNT(*)::int AS sent, COUNT(s.bounced_at)::int AS bounced
    FROM tapcard_invite_sends s JOIN tapcard_mailshot_list l ON l.contact_id = s.contact_id AND l.campaign = s.campaign
    WHERE s.campaign = ${campaign} AND l.relationship = ${nextKind} AND s.sent_at > now() - interval '12 hours'
  `) as { sent: number; bounced: number }[])[0];
  if (kind.sent >= 25 && kind.bounced / kind.sent > 0.08) {
    return NextResponse.json({
      error: `Paused for now: ${kind.bounced} of the last ${kind.sent} emails bounced (over 8%). Those addresses are already taken off the list and will not be emailed again. Try again later today or tomorrow; the pause lifts by itself once those sends are 12 hours old.`,
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
  const refused: string[] = [];
  for (const contact of next) {
    try {
      await sendOne(resend, from, route.replyTo, campaign, contact, subjectIndex);
      sent++;
      consecutiveFailures = 0;
    } catch (err) {
      const message = err instanceof Error ? err.message : "failed";
      if (refusedAddress(message)) {
        // This one address was refused (invalid, no mailbox, suppressed): take it off the list so it never holds up the others.
        await sql`UPDATE tapcard_mailshot_list SET status = 'skipped', skip_reason = ${"refused: " + message.slice(0, 120)} WHERE campaign = ${campaign} AND contact_id = ${contact.id}`;
        refused.push(contact.email);
        continue;
      }
      failed++;
      consecutiveFailures++;
      if (errors.length < 3) errors.push(`${contact.email}: ${message}`);
      if (consecutiveFailures >= 3) break; // something is wrong (sending domain, limits): stop rather than burn through the list
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return NextResponse.json({ ok: true, sent, failed, refused, errors, stats: await mailshotStats(campaign) });
}
