import sql from "@/lib/db";
import { INVITE_LINK_ORIGIN, ensureInviteSchema } from "@/lib/tapcardInvites";

// The cold-email "mailshot" to past business contacts: list import and checks, the email itself, and the
// results. Sending reuses the invite machinery (a tapcard_invite_sends row per person gives each recipient
// their own tracked links and one-click unsubscribe — see app/api/admin/mailshot/send).

export const MAILSHOT_COMPANY_LINE =
  "Aiert Ltd, registered in England & Wales (No. 16587000), registered office 8 Clarendon Gardens, London, England, W9 1AY";

export const MAILSHOT_SUBJECTS = [
  "Tap a contact, see every email they've sent you",
  "What if your contacts list showed you every email from each person?",
  "Find any email from anyone in seconds",
  "{FirstName}, your contacts and your inbox, finally connected",
];

const PERSONAL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "hotmail.com", "hotmail.co.uk", "outlook.com", "outlook.co.uk", "live.com", "live.co.uk", "msn.com",
  "yahoo.com", "yahoo.co.uk", "ymail.com", "icloud.com", "me.com", "mac.com", "aol.com", "aol.co.uk", "btinternet.com", "btopenworld.com",
  "sky.com", "talktalk.net", "virginmedia.com", "ntlworld.com", "blueyonder.co.uk", "protonmail.com", "proton.me", "gmx.com", "gmx.co.uk",
]);
const ROLE_LOCALS = new Set([
  "info", "sales", "admin", "support", "hello", "contact", "office", "enquiries", "enquiry", "accounts", "noreply", "no-reply", "reception",
  "hr", "jobs", "careers", "marketing", "webmaster", "postmaster", "help", "team", "mail", "billing", "orders", "service", "customerservice",
  "press", "media", "legal", "compliance", "finance", "bookings", "booking", "general", "reservations",
]);

export type MailshotRow = { email: string; firstName: string; name: string; company: string };
export type RowCheck = "ok" | "invalid" | "role" | "personal";

export function classifyEmail(email: string): RowCheck {
  if (!/^[^\s@,;<>()]+@[^\s@,;<>()]+\.[^\s@,;<>()]{2,}$/.test(email)) return "invalid";
  const [local, domain] = email.toLowerCase().split("@");
  if (ROLE_LOCALS.has(local)) return "role";
  if (PERSONAL_DOMAINS.has(domain)) return "personal";
  return "ok";
}

/// A first name must look like a name: letters only (with ' or -), never an email address or leftover text.
export function safeFirstName(raw: string | null | undefined): string {
  const v = (raw ?? "").trim().split(/\s+/)[0] ?? "";
  return /^[A-Za-z][A-Za-z'’-]{1,24}$/.test(v) ? v[0].toUpperCase() + v.slice(1) : "";
}

function tidyName(raw: string): string {
  return raw.replace(/["'<>()[\]]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);
}
function titleCase(s: string): string {
  return s.split(" ").map((w) => (w.length > 1 && w === w.toUpperCase() ? w[0] + w.slice(1).toLowerCase() : w)).join(" ");
}


const NOT_NAMES = new Set([...ROLE_LOCALS, "mr", "mrs", "ms", "dr", "the", "and", "group", "london", "uk", "ltd", "plc", "news", "email", "enquiry", "dept", "department", "admin", "web", "online"]);

/// "charles.bond@x.com" -> "Charles". Only for first.last style addresses, never for initials, role words or
/// a single run of letters ("gwlawson"), so a wrong name is unlikely; otherwise the greeting is just "Hi,".
export function guessFirstName(email: string): string {
  const local = email.split("@")[0].toLowerCase();
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length < 2) return "";
  const first = parts[0];
  if (!/^[a-z]{3,15}$/.test(first) || NOT_NAMES.has(first)) return "";
  if (parts[parts.length - 1].length < 3 || NOT_NAMES.has(parts[parts.length - 1])) return "";
  return first[0].toUpperCase() + first.slice(1);
}

/// Reads a pasted list or a CSV file's text. With a header row (email / first name / name / company columns) it
/// reads by column; otherwise it takes every email address it finds on each line and treats the rest of the
/// line as the name ("Jane Smith <jane@x.com>", "jane@x.com, Jane Smith", "Jane Smith jane@x.com"…).
export function parseMailshotList(text: string): MailshotRow[] {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const split = (line: string): string[] => {
    const out: string[] = [];
    let cur = "", q = false;
    const delim = line.includes("\t") ? "\t" : line.includes(";") && !line.includes(",") ? ";" : ",";
    for (const ch of line) {
      if (ch === '"') q = !q;
      else if (ch === delim && !q) { out.push(cur); cur = ""; }
      else cur += ch;
    }
    out.push(cur);
    return out.map((c) => c.trim());
  };
  const head = split(lines[0]).map((h) => h.toLowerCase());
  const col = (names: string[]) => head.findIndex((h) => names.includes(h));
  const emailCol = col(["email", "e-mail", "email address", "e-mail address", "email 1", "primary email"]);
  const rows: MailshotRow[] = [];
  if (emailCol >= 0 && !head[emailCol].includes("@")) {
    const first = col(["first name", "firstname", "first", "given name", "forename"]);
    const last = col(["last name", "lastname", "surname", "family name", "last"]);
    const full = col(["name", "full name", "contact", "display name"]);
    const comp = col(["company", "organisation", "organization", "business", "company name", "employer"]);
    for (const line of lines.slice(1)) {
      const c = split(line);
      const email = (c[emailCol] ?? "").trim().toLowerCase();
      if (!email) continue;
      const firstName = tidyName(first >= 0 ? c[first] ?? "" : "");
      const lastName = tidyName(last >= 0 ? c[last] ?? "" : "");
      const name = tidyName(full >= 0 && c[full] ? c[full] : `${firstName} ${lastName}`);
      rows.push({ email, firstName: titleCase(firstName || name.split(" ")[0] || guessFirstName(email)), name: titleCase(name), company: tidyName(comp >= 0 ? c[comp] ?? "" : "") });
    }
    return rows;
  }
  for (const line of lines) {
    const emails = line.match(/[^\s@,;<>()"']+@[^\s@,;<>()"']+\.[^\s@,;<>()"']+/g) ?? [];
    if (!emails.length) continue;
    let rest = line;
    for (const e of emails) rest = rest.replace(e, " ");
    const leftover = tidyName(rest.replace(/[,;|]/g, " "));
    // Leftover text only counts as a name for a single address on the line, and never if it holds an @ or digits.
    const name = emails.length === 1 && !/[@\d]/.test(leftover) ? titleCase(leftover) : "";
    for (const e of emails) {
      const address = e.toLowerCase().replace(/[.,;]+$/, "");
      const first = name ? safeFirstName(name) : guessFirstName(address);
      rows.push({ email: address, firstName: first, name: name || first, company: "" });
    }
  }
  return rows;
}

let schemaReady: Promise<unknown> | null = null;
export function ensureMailshotSchema(): Promise<unknown> {
  if (!schemaReady) {
    schemaReady = ensureInviteSchema()
      .then(() => sql`
        CREATE TABLE IF NOT EXISTS tapcard_mailshot_list (
          campaign TEXT NOT NULL,
          contact_id INTEGER NOT NULL REFERENCES tapcard_invite_contacts(id) ON DELETE CASCADE,
          added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          PRIMARY KEY (campaign, contact_id)
        )
      `)
      // Which wording the footer uses: 'business' (a past business contact) or 'personal' (a personal contact).
      .then(() => sql`ALTER TABLE tapcard_mailshot_list ADD COLUMN IF NOT EXISTS relationship TEXT NOT NULL DEFAULT 'business'`)
      // The name used in "Hi …," (null = use the contact's first name; empty = just "Hi,"), and queued or skipped (don't send).
      .then(() => sql`ALTER TABLE tapcard_mailshot_list ADD COLUMN IF NOT EXISTS greeting TEXT`)
      .then(() => sql`ALTER TABLE tapcard_mailshot_list ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'queued'`)
      // Why someone was marked don't send: 'no mail server' (from the domain check) or null (unticked by hand).
      .then(() => sql`ALTER TABLE tapcard_mailshot_list ADD COLUMN IF NOT EXISTS skip_reason TEXT`)
      // Anyone whose address bounced for good (anything but an explicit temporary bounce) is never emailed again,
      // in any campaign or on a re-import.
      .then(() => sql`
        UPDATE tapcard_invite_contacts SET do_not_contact = true
        WHERE NOT do_not_contact AND id IN (
          SELECT contact_id FROM tapcard_invite_sends
          WHERE bounced_at IS NOT NULL AND COALESCE(bounce_reason, '') NOT ILIKE 'transient%'
        )
      `)
      // One-off repair: contacts imported from a pasted list got an email-like fragment as their name.
      .then(async () => {
        const bad = (await sql`SELECT id, email FROM tapcard_invite_contacts WHERE first_name LIKE '%@%' OR name LIKE '%@%'`) as { id: number; email: string }[];
        for (const c of bad) {
          const first = guessFirstName(c.email);
          await sql`UPDATE tapcard_invite_contacts SET first_name = ${first}, name = ${first || c.email.split("@")[0]} WHERE id = ${c.id}`;
        }
      })
      .catch((err) => {
        schemaReady = null;
        throw err;
      });
  }
  return schemaReady;
}

export type ImportSummary = {
  found: number;
  added: number;
  alreadyInList: number;
  skipped: { invalid: number; role: number; personal: number; duplicates: number; unsubscribed: number };
  personalExamples: string[];
};

/// Adds the usable addresses to a campaign's list. Personal-looking addresses (Gmail etc.) and role addresses
/// (info@…) are held back unless asked for, and anyone who has already unsubscribed is never added.
export async function importMailshotList(campaign: string, rows: MailshotRow[], includePersonal: boolean): Promise<ImportSummary> {
  await ensureMailshotSchema();
  const summary: ImportSummary = {
    found: rows.length, added: 0, alreadyInList: 0,
    skipped: { invalid: 0, role: 0, personal: 0, duplicates: 0, unsubscribed: 0 }, personalExamples: [],
  };
  const seen = new Set<string>();
  for (const row of rows) {
    const email = row.email.toLowerCase();
    if (seen.has(email)) { summary.skipped.duplicates++; continue; }
    seen.add(email);
    const check = classifyEmail(email);
    if (check === "invalid") { summary.skipped.invalid++; continue; }
    if (check === "role") { summary.skipped.role++; continue; }
    if (check === "personal" && !includePersonal) {
      summary.skipped.personal++;
      if (summary.personalExamples.length < 8) summary.personalExamples.push(email);
      continue;
    }
    const key = `e:${email}`;
    const name = row.name || email.split("@")[0];
    await sql`
      INSERT INTO tapcard_invite_contacts (dedupe_key, name, first_name, email, company)
      VALUES (${key}, ${name}, ${row.firstName}, ${email}, ${row.company})
      ON CONFLICT (dedupe_key) DO NOTHING
    `;
    const contact = ((await sql`SELECT id, do_not_contact FROM tapcard_invite_contacts WHERE dedupe_key = ${key}`) as { id: number; do_not_contact: boolean }[])[0];
    if (!contact) continue;
    if (contact.do_not_contact) { summary.skipped.unsubscribed++; continue; }
    const res = (await sql`
      INSERT INTO tapcard_mailshot_list (campaign, contact_id) VALUES (${campaign}, ${contact.id})
      ON CONFLICT DO NOTHING RETURNING contact_id
    `) as unknown[];
    if (res.length) summary.added++; else summary.alreadyInList++;
  }
  return summary;
}

export type MailshotStats = {
  inList: number;
  sent: number;
  sentToday: number;
  queued: number;
  delivered: number;
  bounced: number;
  clickedAny: number;
  clickedApp: number;
  clickedHow: number;
  clickedVideo: number;
  unsubscribed: number;
  complained: number;
};

export type Relationship = "business" | "personal" | "restaurant";
const footerReason = (r: Relationship) =>
  r === "restaurant"
    ? "your restaurant's contact address is listed publicly on your website, and this is a one-off note about a tool for restaurants"
    : r === "personal"
      ? "you're a personal contact of mine"
      : "you're a past business contact of mine";

export type CandidateRow = { id: number; name: string; email: string; company: string; greeting: string };
export type ContactsCandidates = { total: number; ok: CandidateRow[]; personal: number; role: number; invalid: number };

/// People in the invite contacts (iCloud / LinkedIn imports) who have had no invite sent in any channel, have not
/// unsubscribed or bounced, and are not already in this mailshot. Only business-looking addresses are offered.
export async function contactsCandidates(campaign: string, includePersonal = false): Promise<ContactsCandidates> {
  await ensureMailshotSchema();
  const rows = (await sql`
    SELECT c.id, c.name, c.email, c.company, c.first_name AS greeting
    FROM tapcard_invite_contacts c
    WHERE c.email <> '' AND NOT c.do_not_contact
      AND NOT EXISTS (SELECT 1 FROM tapcard_invite_sends s WHERE s.contact_id = c.id AND s.bounced_at IS NULL)
      AND NOT EXISTS (SELECT 1 FROM tapcard_invite_sends s2 WHERE s2.contact_id = c.id AND s2.bounced_at IS NOT NULL)
      AND NOT EXISTS (SELECT 1 FROM tapcard_mailshot_list l WHERE l.campaign = ${campaign} AND l.contact_id = c.id)
    ORDER BY lower(c.name)
  `) as CandidateRow[];
  const out: ContactsCandidates = { total: rows.length, ok: [], personal: 0, role: 0, invalid: 0 };
  for (const r of rows) {
    r.greeting = safeFirstName(r.greeting) || guessFirstName(r.email.trim().toLowerCase());
    const check = classifyEmail(r.email.trim().toLowerCase());
    if (check === "ok" || (check === "personal" && includePersonal)) out.ok.push(r);
    else out[check]++;
  }
  return out;
}

export type AddItem = { id: number; greeting: string; send: boolean };

/// Adds people to the list: ticked ones queued with their greeting, unticked ones recorded as "don't send".
export async function addCandidatesToMailshot(campaign: string, items: AddItem[], relationship: Relationship = "personal"): Promise<{ queued: number; skipped: number }> {
  await ensureMailshotSchema();
  let queued = 0;
  let skipped = 0;
  for (const it of items) {
    const status = it.send ? "queued" : "skipped";
    const greeting = safeFirstName(it.greeting);
    const res = (await sql`
      INSERT INTO tapcard_mailshot_list (campaign, contact_id, relationship, greeting, status)
      VALUES (${campaign}, ${it.id}, ${relationship}, ${greeting}, ${status})
      ON CONFLICT DO NOTHING RETURNING contact_id
    `) as unknown[];
    if (res.length) { if (it.send) queued++; else skipped++; }
  }
  return { queued, skipped };
}

export type QueueRow = { id: number; name: string; email: string; greeting: string };

/// Everyone queued and not yet sent, with the greeting that will be used.
export async function mailshotQueue(campaign: string): Promise<QueueRow[]> {
  await ensureMailshotSchema();
  const rows = (await sql`
    SELECT c.id, c.name, c.email, COALESCE(l.greeting, c.first_name) AS greeting
    FROM tapcard_mailshot_list l JOIN tapcard_invite_contacts c ON c.id = l.contact_id
    WHERE l.campaign = ${campaign} AND l.status = 'queued' AND NOT c.do_not_contact
      AND NOT EXISTS (SELECT 1 FROM tapcard_invite_sends s WHERE s.contact_id = c.id AND s.campaign = ${campaign})
    ORDER BY lower(c.name)
  `) as QueueRow[];
  return rows.map((r) => ({ ...r, greeting: safeFirstName(r.greeting) }));
}

export type QueueEdit = { id: number; greeting?: string; skip?: boolean };

export async function updateMailshotQueue(campaign: string, edits: QueueEdit[]): Promise<number> {
  await ensureMailshotSchema();
  let n = 0;
  for (const e of edits) {
    if (e.skip) {
      await sql`UPDATE tapcard_mailshot_list SET status = 'skipped' WHERE campaign = ${campaign} AND contact_id = ${e.id}`;
      n++;
    } else if (typeof e.greeting === "string") {
      await sql`UPDATE tapcard_mailshot_list SET greeting = ${safeFirstName(e.greeting)} WHERE campaign = ${campaign} AND contact_id = ${e.id}`;
      n++;
    }
  }
  return n;
}

export type BouncedRow = { name: string; email: string; reason: string | null };

export async function mailshotBounces(campaign: string): Promise<BouncedRow[]> {
  await ensureMailshotSchema();
  return (await sql`
    SELECT c.name, c.email, s.bounce_reason AS reason
    FROM tapcard_invite_sends s JOIN tapcard_invite_contacts c ON c.id = s.contact_id
    WHERE s.campaign = ${campaign} AND s.bounced_at IS NOT NULL
    ORDER BY s.bounced_at DESC
  `) as BouncedRow[];
}

export async function mailshotStats(campaign: string): Promise<MailshotStats> {
  await ensureMailshotSchema();
  const r = ((await sql`
    SELECT
      (SELECT COUNT(*)::int FROM tapcard_mailshot_list WHERE campaign = ${campaign}) AS in_list,
      COUNT(s.id)::int AS sent,
      COUNT(s.id) FILTER (WHERE s.sent_at >= (date_trunc('day', now() AT TIME ZONE 'Europe/London') AT TIME ZONE 'Europe/London'))::int AS sent_today,
      COUNT(s.delivered_at)::int AS delivered,
      COUNT(s.bounced_at)::int AS bounced,
      COUNT(s.first_click_at)::int AS clicked_any,
      COUNT(DISTINCT s.id) FILTER (WHERE EXISTS (SELECT 1 FROM tapcard_invite_clicks k WHERE k.send_id = s.id AND k.target = 'app'))::int AS clicked_app,
      COUNT(DISTINCT s.id) FILTER (WHERE EXISTS (SELECT 1 FROM tapcard_invite_clicks k WHERE k.send_id = s.id AND k.target = 'how'))::int AS clicked_how,
      COUNT(DISTINCT s.id) FILTER (WHERE EXISTS (SELECT 1 FROM tapcard_invite_clicks k WHERE k.send_id = s.id AND k.target = 'video'))::int AS clicked_video,
      COUNT(DISTINCT s.id) FILTER (WHERE c.do_not_contact AND s.bounced_at IS NULL)::int AS unsubscribed
    FROM tapcard_invite_sends s
    JOIN tapcard_invite_contacts c ON c.id = s.contact_id
    WHERE s.campaign = ${campaign}
  `) as Record<string, number>[])[0];
  const queued = ((await sql`
    SELECT COUNT(*)::int AS n FROM tapcard_mailshot_list l
    JOIN tapcard_invite_contacts c ON c.id = l.contact_id
    WHERE l.campaign = ${campaign} AND l.status = 'queued' AND NOT c.do_not_contact
      AND NOT EXISTS (SELECT 1 FROM tapcard_invite_sends s WHERE s.contact_id = l.contact_id AND s.campaign = ${campaign})
  `) as { n: number }[])[0].n;
  return {
    inList: r.in_list, sent: r.sent, sentToday: r.sent_today, queued, delivered: r.delivered, bounced: r.bounced,
    clickedAny: r.clicked_any, clickedApp: r.clicked_app, clickedHow: r.clicked_how, clickedVideo: r.clicked_video,
    unsubscribed: r.unsubscribed, complained: 0,
  };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export type MailshotLinks = { app: string; how: string; video: string; unsubscribe: string };

export function mailshotLinks(token: string): MailshotLinks {
  return {
    app: `${INVITE_LINK_ORIGIN}/i/${token}`,
    how: `${INVITE_LINK_ORIGIN}/i/${token}?to=how`,
    video: `${INVITE_LINK_ORIGIN}/i/${token}?to=video`,
    unsubscribe: `${INVITE_LINK_ORIGIN}/u/${token}`,
  };
}

export const MAILSHOT_IMAGE_TAPCARD = "https://www.aiert.co.uk/mailshot/tapcard-contact.png";
export const MAILSHOT_IMAGE_POWERSEARCH = "https://www.aiert.co.uk/mailshot/powersearch-emails.png";
export const MAILSHOT_M365_NOTE = "* Some company Microsoft 365 accounts need your IT administrator to approve the connection.";

export function mailshotText(firstName: string, links: MailshotLinks, relationship: Relationship = "business"): string {
  const hi = firstName ? `Hi ${firstName},` : "Hi,";
  return `${hi}

What if your contacts list could show you every email from each person?

Tap a contact and see everything they've ever sent you, across all your email accounts. Then search inside those emails for the invoice, the contract, the thing they said last March.

That's PowerSearch. It works with TapCard, a digital business card app, so every contact in TapCard is one tap away from all their emails.

- One tap from a contact to all their emails, across Gmail, Outlook, Microsoft 365* and most other accounts
- Search inside them: subject, message text, even attachments
- Private: your emails stay on your phone

${MAILSHOT_M365_NOTE}

TapCard is also your digital business card. Share it with a QR code or a link and people save you in one tap, with no app needed on their side. Every card is one tap to call, message on WhatsApp, email, open their socials or get directions, and much more. It is free for life for the first 1,000 users on each phone, and PowerSearch has a free 7-day trial.

Get the app: ${links.app}
See how it works: ${links.how}
See everything it can do (with a short demo): ${links.video}

Martin Dobson
Aiert Ltd

--
You're receiving this because ${footerReason(relationship)}. ${MAILSHOT_COMPANY_LINE}. Privacy: https://www.aiert.co.uk/privacy
Not interested? Unsubscribe here and I won't email you again: ${links.unsubscribe}
`;
}

export function mailshotHtml(firstName: string, links: MailshotLinks, relationship: Relationship = "business"): string {
  const hi = firstName ? `Hi ${esc(firstName)},` : "Hi,";
  const btn = "display:inline-block;background:#4c2f93;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:10px;";
  const link = "color:#4c2f93;font-weight:600;";
  const li = "margin:0 0 8px;";
  return `<!doctype html><html><body style="margin:0;padding:0;background:#ffffff;">
<div style="max-width:560px;margin:0 auto;padding:24px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.55;color:#1f2937;">
<p style="margin:0 0 16px;">${hi}</p>
<p style="margin:0 0 16px;font-size:19px;line-height:1.4;"><strong>What if your contacts list could show you every email from each person?</strong></p>
<p style="margin:0 0 16px;">Tap a contact and see everything they've ever sent you, across all your email accounts. Then search inside those emails for the invoice, the contract, the thing they said last March.</p>
<p style="margin:0 0 16px;">That's <strong>PowerSearch</strong>. It works with <strong>TapCard</strong>, a digital business card app, so every contact in TapCard is one tap away from all their emails.</p>
<ul style="margin:0 0 20px;padding-left:20px;">
<li style="${li}"><strong>One tap</strong> from a contact to all their emails, across Gmail, Outlook, Microsoft 365* and most other accounts</li>
<li style="${li}"><strong>Search inside them:</strong> subject, message text, even attachments</li>
<li style="${li}"><strong>Private:</strong> your emails stay on your phone</li>
</ul>
<p style="margin:-8px 0 20px;font-size:12px;line-height:1.5;color:#6b7280;">${esc(MAILSHOT_M365_NOTE)}</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;"><tr>
<td width="50%" valign="top" style="padding:0 6px 0 0;text-align:center;"><a href="${esc(links.video)}"><img src="${MAILSHOT_IMAGE_TAPCARD}" alt="A contact in TapCard with a Find emails in PowerSearch button" width="250" style="width:100%;max-width:250px;border-radius:14px;border:1px solid #e5e7eb;"></a><div style="font-size:12px;line-height:1.4;color:#6b7280;margin-top:6px;"><strong>1.</strong> Tap a contact in TapCard</div></td>
<td width="50%" valign="top" style="padding:0 0 0 6px;text-align:center;"><a href="${esc(links.video)}"><img src="${MAILSHOT_IMAGE_POWERSEARCH}" alt="PowerSearch showing that contact's emails, searched for invoice" width="250" style="width:100%;max-width:250px;border-radius:14px;border:1px solid #e5e7eb;"></a><div style="font-size:12px;line-height:1.4;color:#6b7280;margin-top:6px;"><strong>2.</strong> See their emails, and search inside them</div></td>
</tr></table>
<p style="margin:0 0 20px;">TapCard is also your digital business card. Share it with a QR code or a link and people save you in one tap, with no app needed on their side. Every card is <strong>one tap to call, message on WhatsApp, email, open their socials or get directions</strong>, and much more. It is <strong>free for life for the first 1,000 users</strong> on each phone, and PowerSearch has a free 7-day trial.</p>
<p style="margin:0 0 20px;"><a href="${esc(links.app)}" style="${btn}">Get the app</a></p>
<p style="margin:0 0 24px;"><a href="${esc(links.how)}" style="${link}">See how it works</a> &nbsp;·&nbsp; <a href="${esc(links.video)}" style="${link}">See everything it can do</a></p>
<p style="margin:0 0 4px;">Martin Dobson</p>
<p style="margin:0 0 28px;">Aiert Ltd</p>
<p style="margin:0;font-size:12px;line-height:1.5;color:#6b7280;">You're receiving this because ${footerReason(relationship)}. ${esc(MAILSHOT_COMPANY_LINE)}. <a href="https://www.aiert.co.uk/privacy" style="color:#6b7280;">Privacy</a><br>Not interested? <a href="${esc(links.unsubscribe)}" style="color:#6b7280;">Unsubscribe here</a> and I won't email you again.</p>
</div></body></html>`;
}

// ---------- Restaurants ----------

export const RESTAURANT_SUBJECTS = [
  "Never order business cards again, {Name}",
  "A TapCard for {Name}: window, website, and every customer's phone",
  "{Name}: booking, menu and directions in one tap",
];

export function restaurantSubject(index: number, name: string): string {
  const t = RESTAURANT_SUBJECTS[Math.min(Math.max(index, 0), RESTAURANT_SUBJECTS.length - 1)];
  return t.replaceAll("{Name}", name || "your restaurant");
}

export function restaurantText(name: string, links: MailshotLinks): string {
  return `Hello ${name || "there"},

I made a sample TapCard for ${name || "your restaurant"}: one card with your phone number, Book a table, your menu and directions. You never have to order business cards again.

- Put it in your window or on the door: customers scan the QR code and save you in one tap
- Put it on your website, in emails and on social media as a link
- Book a table, View our menu and Get directions are each one tap
- Change your details once and every saved copy updates itself (new menu, new hours)
- No app needed on the customer's side

Free marketing built in: special offers
Everyone who saves your card becomes someone you can reach, with no mailing list to build. Post an offer from your card, for example "Free dessert with any main", with an end date and a limit if you like. People who have your card see it in TapCard, tap Claim, and get their own one-off QR code. When they show it, scan it with your phone camera, type your staff PIN, and it is marked as used, so it can never be used twice. You see how many people claimed and how many came in.

TapCard is free for life for the first 1,000 users.

Get TapCard: ${links.app}
See how it works: ${links.how}
See everything it can do (with a short demo): ${links.video}

Martin Dobson
Aiert Ltd

--
You're receiving this because ${footerReason("restaurant")}. ${MAILSHOT_COMPANY_LINE}. Privacy: https://www.aiert.co.uk/privacy
Not interested? Unsubscribe here and I won't email you again: ${links.unsubscribe}
`;
}

export function restaurantHtml(name: string, links: MailshotLinks, cardImageUrl: string): string {
  const btn = "display:inline-block;background:#4c2f93;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:10px;";
  const link = "color:#4c2f93;font-weight:600;";
  const li = "margin:0 0 8px;";
  return `<!doctype html><html><body style="margin:0;padding:0;background:#ffffff;">
<div style="max-width:560px;margin:0 auto;padding:24px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.55;color:#1f2937;">
<p style="margin:0 0 16px;">Hello ${esc(name || "there")},</p>
<p style="margin:0 0 16px;font-size:18px;line-height:1.45;"><strong>I made a sample TapCard for ${esc(name || "your restaurant")}:</strong> one card with your phone number, Book a table, your menu and directions. You never have to order business cards again.</p>
<p style="margin:0 0 20px;text-align:center;"><a href="${esc(links.app)}"><img src="${esc(cardImageUrl)}" alt="A sample TapCard for ${esc(name || "your restaurant")}" width="300" style="width:300px;max-width:100%;border-radius:14px;border:1px solid #e5e7eb;"></a></p>
<ul style="margin:0 0 20px;padding-left:20px;">
<li style="${li}">Put it <strong>in your window or on the door</strong>: customers scan the QR code and save you in one tap</li>
<li style="${li}">Put it <strong>on your website</strong>, in emails and on social media as a link</li>
<li style="${li}"><strong>Book a table, View our menu and Get directions</strong> are each one tap</li>
<li style="${li}">Change your details once and <strong>every saved copy updates itself</strong> (new menu, new hours)</li>
<li style="${li}">No app needed on the customer's side</li>
</ul>
<div style="margin:0 0 20px;padding:16px 18px;background:#f5f3ff;border-radius:12px;">
<p style="margin:0 0 8px;font-size:17px;"><strong>Free marketing built in: special offers</strong></p>
<p style="margin:0 0 10px;">Everyone who saves your card becomes someone you can reach, with no mailing list to build.</p>
<ol style="margin:0;padding-left:20px;">
<li style="${li}"><strong>Post an offer</strong> from your card, such as &ldquo;Free dessert with any main&rdquo;, with an end date and a limit if you like.</li>
<li style="${li}">People who have your card <strong>see it in TapCard</strong>, tap Claim, and get their own <strong>one-off QR code</strong>.</li>
<li style="${li}">When they show it, <strong>scan it with your phone camera</strong>, type your staff PIN, and it is marked as used. It can never be used twice.</li>
<li style="margin:0;">You see <strong>how many claimed</strong> and how many came in.</li>
</ol>
</div>
<p style="margin:0 0 20px;">TapCard is <strong>free for life for the first 1,000 users</strong>.</p>
<p style="margin:0 0 20px;"><a href="${esc(links.app)}" style="${btn}">Get TapCard</a></p>
<p style="margin:0 0 24px;"><a href="${esc(links.how)}" style="${link}">See how it works</a> &nbsp;·&nbsp; <a href="${esc(links.video)}" style="${link}">See everything it can do</a></p>
<p style="margin:0 0 4px;">Martin Dobson</p>
<p style="margin:0 0 28px;">Aiert Ltd</p>
<p style="margin:0;font-size:12px;line-height:1.5;color:#6b7280;">You're receiving this because ${esc(footerReason("restaurant"))}. ${esc(MAILSHOT_COMPANY_LINE)}. <a href="https://www.aiert.co.uk/privacy" style="color:#6b7280;">Privacy</a><br>Not interested? <a href="${esc(links.unsubscribe)}" style="color:#6b7280;">Unsubscribe here</a> and I won't email you again.</p>
</div></body></html>`;
}

export type RestaurantRow = { name: string; email: string; phone: string; website: string; address: string; booking: string; menu: string };

/// A CSV (or tab-separated) list with a header row: name (or restaurant), email, phone, website, address, booking, menu.
export function parseRestaurantList(text: string): RestaurantRow[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const split = (line: string): string[] => {
    const out: string[] = [];
    let cur = "", q = false;
    const delim = line.includes("\t") ? "\t" : ",";
    for (const ch of line) {
      if (ch === '"') q = !q;
      else if (ch === delim && !q) { out.push(cur); cur = ""; }
      else cur += ch;
    }
    out.push(cur);
    return out.map((c) => c.trim());
  };
  const head = split(lines[0]).map((h) => h.toLowerCase());
  const col = (names: string[]) => head.findIndex((h) => names.includes(h));
  const c = {
    name: col(["name", "restaurant", "restaurant name", "business"]),
    email: col(["email", "e-mail", "email address"]),
    phone: col(["phone", "telephone", "tel"]),
    website: col(["website", "web", "site", "url"]),
    address: col(["address", "location"]),
    booking: col(["booking", "booking url", "book", "reservations"]),
    menu: col(["menu", "menu url"]),
  };
  if (c.email < 0 || c.name < 0) return [];
  const get = (cells: string[], i: number) => (i >= 0 ? (cells[i] ?? "").trim() : "");
  return lines.slice(1).map((line) => {
    const cells = split(line);
    return {
      name: tidyName(get(cells, c.name)).slice(0, 80), email: get(cells, c.email).toLowerCase(),
      phone: get(cells, c.phone).slice(0, 40), website: get(cells, c.website).slice(0, 200),
      address: get(cells, c.address).slice(0, 200), booking: get(cells, c.booking).slice(0, 300), menu: get(cells, c.menu).slice(0, 300),
    };
  }).filter((r) => r.email);
}

/// Adds restaurants to a campaign's list. Role addresses (info@, bookings@) are what restaurants publish, so they are
/// allowed here; personal-domain addresses (Gmail etc.) are held back unless asked for, since a small restaurant using
/// one may be a sole trader, who would need to have agreed to marketing email.
export async function importRestaurants(campaign: string, rows: RestaurantRow[], includePersonal: boolean): Promise<ImportSummary> {
  await ensureMailshotSchema();
  const summary: ImportSummary = {
    found: rows.length, added: 0, alreadyInList: 0,
    skipped: { invalid: 0, role: 0, personal: 0, duplicates: 0, unsubscribed: 0 }, personalExamples: [],
  };
  const seen = new Set<string>();
  for (const r of rows) {
    const email = r.email.toLowerCase();
    if (seen.has(email)) { summary.skipped.duplicates++; continue; }
    seen.add(email);
    const check = classifyEmail(email);
    if (check === "invalid") { summary.skipped.invalid++; continue; }
    if (check === "personal" && !includePersonal) {
      summary.skipped.personal++;
      if (summary.personalExamples.length < 8) summary.personalExamples.push(email);
      continue;
    }
    const key = `e:${email}`;
    await sql`
      INSERT INTO tapcard_invite_contacts (dedupe_key, name, first_name, email, phone, company, website, address, booking_url, menu_url, kind)
      VALUES (${key}, ${r.name}, '', ${email}, ${r.phone}, '', ${r.website}, ${r.address}, ${r.booking}, ${r.menu}, 'restaurant')
      ON CONFLICT (dedupe_key) DO UPDATE SET
        kind = 'restaurant', name = EXCLUDED.name,
        phone = COALESCE(NULLIF(EXCLUDED.phone, ''), tapcard_invite_contacts.phone),
        website = COALESCE(NULLIF(EXCLUDED.website, ''), tapcard_invite_contacts.website),
        address = COALESCE(NULLIF(EXCLUDED.address, ''), tapcard_invite_contacts.address),
        booking_url = COALESCE(NULLIF(EXCLUDED.booking_url, ''), tapcard_invite_contacts.booking_url),
        menu_url = COALESCE(NULLIF(EXCLUDED.menu_url, ''), tapcard_invite_contacts.menu_url)
    `;
    const contact = ((await sql`SELECT id, do_not_contact FROM tapcard_invite_contacts WHERE dedupe_key = ${key}`) as { id: number; do_not_contact: boolean }[])[0];
    if (!contact) continue;
    if (contact.do_not_contact) { summary.skipped.unsubscribed++; continue; }
    const res = (await sql`
      INSERT INTO tapcard_mailshot_list (campaign, contact_id, relationship) VALUES (${campaign}, ${contact.id}, 'restaurant')
      ON CONFLICT DO NOTHING RETURNING contact_id
    `) as unknown[];
    if (res.length) summary.added++; else summary.alreadyInList++;
  }
  return summary;
}
