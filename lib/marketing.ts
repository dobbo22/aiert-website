import crypto from "crypto";
import { Resend } from "resend";
import sql from "@/lib/db";
import { inviteEmailRoute } from "@/lib/inviteEmailRoute";
import { INVITE_LINK_ORIGIN } from "@/lib/tapcardInvites";
import { businessDomain, isFreeMailDomain } from "@/lib/tapcardDomain";
import { restaurantHtml, restaurantSubject, restaurantText, parseRestaurantList, type MailshotLinks, type PlaceKind } from "@/lib/mailshot";

// Marketing for restaurants and cafes / coffee shops: the lists, the emails sent and what happened to each. Its own tables (mk_*),
// separate from the personal-invite system, so the numbers here are only this mailing.
//
//   mk_leads   one row per place (name, email, area, whether it is queued to be emailed, and where it is in your pipeline)
//   mk_sends   one row per email sent (delivered, opened, clicked, bounced, unsubscribed...)
//   mk_events  a timeline of everything that happened, for the results and the lead's history

export const HARD_DAILY_LIMIT = 100;
const MAX_PER_CALL = 40;
const BOUNCE_PAUSE_RATE = 0.08;
/// Email security scanners open every link within seconds of delivery. A click sooner than this after sending, or a burst of links all
/// opened within a few seconds (BURST_SECONDS) of each other, is treated as a scanner and not counted.
export const SCANNER_WINDOW_SECONDS = 45;
const BURST_SECONDS = 3;

export type LeadState = "queued" | "held" | "removed" | "unsubscribed" | "emailed_before";
export type LeadStage = "new" | "interested" | "signed_up" | "not_interested";

let ready: Promise<unknown> | null = null;
export function ensureMarketingSchema(): Promise<unknown> {
  if (!ready) {
    ready = sql`
      CREATE TABLE IF NOT EXISTS mk_leads (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL,
        phone TEXT NOT NULL DEFAULT '',
        website TEXT NOT NULL DEFAULT '',
        address TEXT NOT NULL DEFAULT '',
        booking_url TEXT NOT NULL DEFAULT '',
        menu_url TEXT NOT NULL DEFAULT '',
        kind TEXT NOT NULL DEFAULT 'restaurant',
        area TEXT NOT NULL DEFAULT '',
        batch TEXT NOT NULL DEFAULT '',
        email_check TEXT NOT NULL DEFAULT '',
        state TEXT NOT NULL DEFAULT 'queued',
        hold_reason TEXT NOT NULL DEFAULT '',
        stage TEXT NOT NULL DEFAULT 'new',
        notes TEXT NOT NULL DEFAULT '',
        is_test BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`
      .then(() => sql`CREATE UNIQUE INDEX IF NOT EXISTS mk_leads_email ON mk_leads (lower(email)) WHERE NOT is_test`)
      .then(() => sql`
        CREATE TABLE IF NOT EXISTS mk_sends (
          id SERIAL PRIMARY KEY,
          lead_id INTEGER NOT NULL REFERENCES mk_leads(id) ON DELETE CASCADE,
          token TEXT NOT NULL UNIQUE,
          resend_id TEXT,
          subject TEXT NOT NULL DEFAULT '',
          is_test BOOLEAN NOT NULL DEFAULT false,
          legacy_send_id INTEGER UNIQUE,
          sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          delivered_at TIMESTAMPTZ,
          opened_at TIMESTAMPTZ,
          open_count INTEGER NOT NULL DEFAULT 0,
          clicked_at TIMESTAMPTZ,
          click_count INTEGER NOT NULL DEFAULT 0,
          preview_first_at TIMESTAMPTZ,
          bounced_at TIMESTAMPTZ,
          bounce_reason TEXT,
          complained_at TIMESTAMPTZ,
          unsubscribed_at TIMESTAMPTZ
        )`)
      .then(() => sql`ALTER TABLE mk_sends ADD COLUMN IF NOT EXISTS engaged_at TIMESTAMPTZ`)
      .then(() => sql`ALTER TABLE mk_sends ADD COLUMN IF NOT EXISTS engaged_count INTEGER NOT NULL DEFAULT 0`)
      .then(() => sql`CREATE INDEX IF NOT EXISTS mk_sends_lead ON mk_sends (lead_id, sent_at DESC)`)
      .then(() => sql`CREATE INDEX IF NOT EXISTS mk_sends_resend ON mk_sends (resend_id)`)
      .then(() => sql`
        CREATE TABLE IF NOT EXISTS mk_events (
          id BIGSERIAL PRIMARY KEY,
          send_id INTEGER REFERENCES mk_sends(id) ON DELETE CASCADE,
          lead_id INTEGER NOT NULL REFERENCES mk_leads(id) ON DELETE CASCADE,
          type TEXT NOT NULL,
          detail TEXT NOT NULL DEFAULT '',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )`)
      .then(() => sql`CREATE INDEX IF NOT EXISTS mk_events_lead ON mk_events (lead_id, created_at DESC)`)
      .catch((e) => { ready = null; throw e; });
  }
  return ready;
}

/// Tokens start "mk-" so the shared preview, card-picture and QR routes can tell these from the personal-invite tokens.
export const MK_PREFIX = "mk-";
export const isMkToken = (t: string) => t.startsWith(MK_PREFIX);
export const mkToken = () => MK_PREFIX + crypto.randomBytes(6).toString("base64url");

export function mkLinks(token: string): MailshotLinks {
  return {
    app: `${INVITE_LINK_ORIGIN}/mk/${token}`,
    how: `${INVITE_LINK_ORIGIN}/mk/${token}?to=how`,
    video: `${INVITE_LINK_ORIGIN}/mk/${token}?to=video`,
    unsubscribe: `${INVITE_LINK_ORIGIN}/mku/${token}`,
    preview: `${INVITE_LINK_ORIGIN}/v/${token}`,
    previewQr: `${INVITE_LINK_ORIGIN}/api/preview-qr/${token}`,
    phoneImage: `${INVITE_LINK_ORIGIN}/api/invite-card/${token}?frame=1`,
  };
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Small helpers

const CAFE_WORDS = /\b(caf[eé]s?|coffee|espresso|barista|bakery|tea ?rooms?|tea ?house|patisserie|bean|roastery|brew)\b/i;
export const guessKind = (name: string, website = ""): PlaceKind => (CAFE_WORDS.test(name) || /coffee|caf[eé]/i.test(website) ? "cafe" : "restaurant");

/// "W2 4QJ" or "12 High St, London W9 1AY" -> "W2" / "W9"; "" when there is no postcode.
export function postcodeArea(address: string): string {
  const m = address.toUpperCase().match(/\b([A-Z]{1,2}\d[A-Z\d]?)\s*\d[A-Z]{2}\b/) ?? address.toUpperCase().match(/\b([A-Z]{1,2}\d[A-Z\d]?)\b(?!\s*\d[A-Z]{2})/);
  return m ? m[1] : "";
}

const norm = (e: string) => e.trim().toLowerCase();
const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

async function addEvent(sendId: number | null, leadId: number, type: string, detail = "") {
  await sql`INSERT INTO mk_events (send_id, lead_id, type, detail) VALUES (${sendId}, ${leadId}, ${type}, ${detail.slice(0, 200)})`.catch(() => {});
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Adding a list

export type ImportResult = { added: number; updated: number; queued: number; held: number; removedDead: number; alreadyEmailed: number; unsubscribed: number; skipped: number };

/// Earlier mailings (the old Mailshot page) already emailed some of these: they are kept as leads but never emailed again from here.
async function earlierlyEmailed(): Promise<{ emailed: Set<string>; never: Set<string> }> {
  const emailed = new Set<string>(), never = new Set<string>();
  try {
    const rows = (await sql`
      SELECT lower(c.email) AS email, c.do_not_contact AS dnc,
             EXISTS (SELECT 1 FROM tapcard_invite_sends s WHERE s.contact_id = c.id AND s.campaign NOT LIKE '%-test') AS sent
      FROM tapcard_invite_contacts c WHERE c.email <> '' AND (c.do_not_contact OR EXISTS (SELECT 1 FROM tapcard_invite_sends s WHERE s.contact_id = c.id AND s.campaign NOT LIKE '%-test'))
    `) as { email: string; dnc: boolean; sent: boolean }[];
    for (const r of rows) { if (r.dnc) never.add(r.email); if (r.sent) emailed.add(r.email); }
  } catch { /* the old tables may not exist */ }
  return { emailed, never };
}

/// Adds a pasted or uploaded CSV (name, email, phone, website, address, booking, menu, and the `check` column from the list-maker).
/// Dead and no-mail addresses are never added; ones that could not be checked, and Gmail-type addresses, are held back unless allowed.
export async function importLeads(text: string, opts: { batch: string; includeUnchecked: boolean; includePersonal: boolean }): Promise<ImportResult> {
  await ensureMarketingSchema();
  const rows = parseRestaurantList(text);
  const { emailed, never } = await earlierlyEmailed();
  const batch = opts.batch.trim().slice(0, 40);
  const r: ImportResult = { added: 0, updated: 0, queued: 0, held: 0, removedDead: 0, alreadyEmailed: 0, unsubscribed: 0, skipped: 0 };
  for (const row of rows) {
    const email = norm(row.email);
    if (!validEmail(email)) { r.skipped++; continue; }
    const check = (row.check || "").toLowerCase();
    if (check === "dead" || check === "no-mail") { r.removedDead++; continue; }
    const kind = guessKind(row.name, row.website);
    const area = postcodeArea(row.address) || "";
    let state: LeadState = "queued";
    let reason = "";
    if (never.has(email)) { state = "unsubscribed"; reason = "asked not to be emailed, or bounced before"; r.unsubscribed++; }
    else if (emailed.has(email)) { state = "emailed_before"; reason = "emailed in an earlier mailing"; r.alreadyEmailed++; }
    else if (isFreeMailDomain(email.split("@")[1] ?? "") && !opts.includePersonal) { state = "held"; reason = "Gmail-type address"; r.held++; }
    else if (check === "unknown" && !opts.includeUnchecked) { state = "held"; reason = "couldn't check the address"; r.held++; }
    else r.queued++;
    const res = (await sql`
      INSERT INTO mk_leads (name, email, phone, website, address, booking_url, menu_url, kind, area, batch, email_check, state, hold_reason)
      VALUES (${row.name.slice(0, 200)}, ${email}, ${row.phone}, ${row.website}, ${row.address}, ${row.booking}, ${row.menu}, ${kind}, ${area}, ${batch}, ${check}, ${state}, ${reason})
      ON CONFLICT (lower(email)) WHERE NOT is_test DO UPDATE SET
        name = CASE WHEN mk_leads.name = '' THEN EXCLUDED.name ELSE mk_leads.name END,
        phone = CASE WHEN mk_leads.phone = '' THEN EXCLUDED.phone ELSE mk_leads.phone END,
        website = CASE WHEN mk_leads.website = '' THEN EXCLUDED.website ELSE mk_leads.website END,
        address = CASE WHEN mk_leads.address = '' THEN EXCLUDED.address ELSE mk_leads.address END,
        area = CASE WHEN mk_leads.area = '' THEN EXCLUDED.area ELSE mk_leads.area END,
        email_check = EXCLUDED.email_check, updated_at = now()
      RETURNING (xmax = 0) AS inserted
    `) as { inserted: boolean }[];
    if (res[0]?.inserted) r.added++; else r.updated++;
  }
  return r;
}

/// Copies the restaurants from the earlier Mailshot page (lists, who was emailed, opens and clicks) into this system, once.
/// Safe to run again: anything already copied is skipped.
/// The earlier mailing counted every click, scanners included: keep only the ones after the scanner window, not in a burst.
function humanOnly<T extends { sent_at: string; click_count: number; first_click_at: string | null; preview_first_at: string | null }>(o0: T, times: number[]): T {
  const sentMs = new Date(o0.sent_at).getTime();
  const late = (iso: string | null) => !!iso && new Date(iso).getTime() - sentMs > SCANNER_WINDOW_SECONDS * 1000;
  const human = times.filter((t, i) => t - sentMs > SCANNER_WINDOW_SECONDS * 1000 && !(i > 0 && t - times[i - 1] < BURST_SECONDS * 1000));
  const click_count = times.length ? human.length : late(o0.first_click_at) ? o0.click_count : 0;
  const first_click_at = human.length ? new Date(human[0]).toISOString() : times.length ? null : late(o0.first_click_at) ? o0.first_click_at : null;
  return { ...o0, click_count, first_click_at, preview_first_at: late(o0.preview_first_at) ? o0.preview_first_at : null };
}

export async function bringOverEarlierMailing(): Promise<{ leads: number; sends: number }> {
  await ensureMarketingSchema();
  let leads = 0, sends = 0;
  try {
    const contacts = (await sql`
      SELECT c.id, c.name, lower(c.email) AS email, c.phone, c.website, c.address, c.booking_url, c.menu_url, c.do_not_contact, l.campaign, l.status, l.skip_reason
      FROM tapcard_mailshot_list l JOIN tapcard_invite_contacts c ON c.id = l.contact_id
      WHERE l.relationship = 'restaurant' AND c.email <> '' AND c.dedupe_key NOT LIKE 'r:test:%'
    `) as { id: number; name: string; email: string; phone: string; website: string; address: string; booking_url: string; menu_url: string; do_not_contact: boolean; campaign: string; status: string; skip_reason: string | null }[];
    type OldSend = { id: number; contact_id: number; subject: string; resend_id: string | null; sent_at: string; delivered_at: string | null; opened_at: string | null; bounced_at: string | null; bounce_reason: string | null; click_count: number; first_click_at: string | null; preview_first_at: string | null };
    // Load everything once: a query per contact ran past the function's time limit on a second press.
    const allOld = (await sql`
      SELECT id, contact_id, subject, resend_id, sent_at, delivered_at, opened_at, bounced_at, bounce_reason, click_count, first_click_at, preview_first_at
      FROM tapcard_invite_sends WHERE campaign NOT LIKE '%-test'
    `) as OldSend[];
    const oldByContact = new Map<number, OldSend[]>();
    for (const o of allOld) oldByContact.set(o.contact_id, [...(oldByContact.get(o.contact_id) ?? []), o]);
    const copied = new Set(((await sql`SELECT legacy_send_id FROM mk_sends WHERE legacy_send_id IS NOT NULL`) as { legacy_send_id: number }[]).map((r) => r.legacy_send_id));
    const clicksBySend = new Map<number, number[]>();
    for (const r of (await sql`SELECT send_id, clicked_at FROM tapcard_invite_clicks ORDER BY clicked_at`.catch(() => [])) as { send_id: number; clicked_at: string }[]) {
      clicksBySend.set(r.send_id, [...(clicksBySend.get(r.send_id) ?? []), new Date(r.clicked_at).getTime()]);
    }
    // Sends copied by an earlier press (before the scanner filter existed) are re-filtered in place.
    for (const o0 of allOld) {
      if (!copied.has(o0.id)) continue;
      const o = humanOnly(o0, clicksBySend.get(o0.id) ?? []);
      const fixed = (await sql`
        UPDATE mk_sends SET clicked_at = ${o.first_click_at}, click_count = ${o.click_count}, preview_first_at = ${o.preview_first_at}
        WHERE legacy_send_id = ${o0.id} AND (click_count IS DISTINCT FROM ${o.click_count} OR clicked_at IS DISTINCT FROM ${o.first_click_at}::timestamptz OR preview_first_at IS DISTINCT FROM ${o.preview_first_at}::timestamptz)
        RETURNING id, lead_id
      `) as { id: number; lead_id: number }[];
      if (!fixed[0]) continue;
      await sql`DELETE FROM mk_events WHERE send_id = ${fixed[0].id} AND type IN ('clicked', 'preview')`;
      if (o.first_click_at) await sql`INSERT INTO mk_events (send_id, lead_id, type, created_at) VALUES (${fixed[0].id}, ${fixed[0].lead_id}, 'clicked', ${o.first_click_at})`;
      if (o.preview_first_at) await sql`INSERT INTO mk_events (send_id, lead_id, type, created_at) VALUES (${fixed[0].id}, ${fixed[0].lead_id}, 'preview', ${o.preview_first_at})`;
    }
    const known = new Set(((await sql`SELECT lower(email) AS email FROM mk_leads WHERE NOT is_test`) as { email: string }[]).map((r) => r.email));
    for (const c of contacts) {
      if (!validEmail(c.email)) continue;
      const mine = oldByContact.get(c.id) ?? [];
      if (known.has(c.email) && mine.every((o) => copied.has(o.id))) continue;
      const hasSend = mine.length > 0;
      const state: LeadState = c.do_not_contact ? "unsubscribed" : c.status === "skipped" ? "held" : hasSend ? "emailed_before" : "queued";
      const reason = c.do_not_contact ? "asked not to be emailed, or bounced" : c.status === "skipped" ? (c.skip_reason ?? "taken off the list") : "";
      const kind = guessKind(c.name, c.website);
      const ins = (await sql`
        INSERT INTO mk_leads (name, email, phone, website, address, booking_url, menu_url, kind, area, batch, state, hold_reason)
        VALUES (${c.name}, ${c.email}, ${c.phone}, ${c.website}, ${c.address}, ${c.booking_url}, ${c.menu_url}, ${kind}, ${postcodeArea(c.address)}, ${c.campaign}, ${state}, ${reason})
        ON CONFLICT (lower(email)) WHERE NOT is_test DO NOTHING RETURNING id
      `) as { id: number }[];
      let leadId = ins[0]?.id;
      if (leadId) leads++;
      else leadId = ((await sql`SELECT id FROM mk_leads WHERE lower(email) = ${c.email} AND NOT is_test`) as { id: number }[])[0]?.id;
      if (!leadId) continue;
      for (const o0 of mine) {
        if (copied.has(o0.id)) continue;
        const o = humanOnly(o0, clicksBySend.get(o0.id) ?? []);
        const made = (await sql`
          INSERT INTO mk_sends (lead_id, token, resend_id, subject, legacy_send_id, sent_at, delivered_at, opened_at, open_count, clicked_at, click_count, preview_first_at, bounced_at, bounce_reason)
          VALUES (${leadId}, ${"old-" + o.id}, ${o.resend_id}, ${o.subject}, ${o.id}, ${o.sent_at}, ${o.delivered_at}, ${o.opened_at}, ${o.opened_at ? 1 : 0}, ${o.first_click_at}, ${o.click_count}, ${o.preview_first_at}, ${o.bounced_at}, ${o.bounce_reason})
          ON CONFLICT (legacy_send_id) DO NOTHING RETURNING id
        `) as { id: number }[];
        if (!made[0]) continue;
        sends++;
        await sql`INSERT INTO mk_events (send_id, lead_id, type, created_at) VALUES (${made[0].id}, ${leadId}, 'sent', ${o.sent_at})`;
        if (o.opened_at) await sql`INSERT INTO mk_events (send_id, lead_id, type, created_at) VALUES (${made[0].id}, ${leadId}, 'opened', ${o.opened_at})`;
        if (o.first_click_at) await sql`INSERT INTO mk_events (send_id, lead_id, type, created_at) VALUES (${made[0].id}, ${leadId}, 'clicked', ${o.first_click_at})`;
        if (o.preview_first_at) await sql`INSERT INTO mk_events (send_id, lead_id, type, created_at) VALUES (${made[0].id}, ${leadId}, 'preview', ${o.preview_first_at})`;
        if (o.bounced_at) await sql`INSERT INTO mk_events (send_id, lead_id, type, detail, created_at) VALUES (${made[0].id}, ${leadId}, 'bounced', ${(o.bounce_reason ?? "").slice(0, 200)}, ${o.bounced_at})`;
      }
    }
  } catch (e) {
    console.error("bring over earlier mailing failed", e);
    throw new Error("Couldn't read the earlier mailing. " + (e instanceof Error ? e.message : ""));
  }
  return { leads, sends };
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Sending

type SendLead = { id: number; name: string; email: string; kind: string };

async function sendOne(resend: Resend, from: string, replyTo: string, lead: SendLead, subjectIndex: number, isTest: boolean): Promise<void> {
  const token = mkToken();
  const links = mkLinks(token);
  const kind: PlaceKind = lead.kind === "cafe" ? "cafe" : "restaurant";
  const subject = restaurantSubject(subjectIndex, lead.name, kind);
  const codes = isTest ? { ios: "EXAMPLE0CODE", android: "EXAMPLE0CODE" } : undefined;
  const inserted = (await sql`INSERT INTO mk_sends (lead_id, token, subject, is_test) VALUES (${lead.id}, ${token}, ${subject}, ${isTest}) RETURNING id`) as { id: number }[];
  const sendId = inserted[0].id;
  try {
    const { data, error } = await resend.emails.send({
      from, to: lead.email, replyTo, subject,
      text: restaurantText(lead.name, links, codes, kind),
      html: restaurantHtml(lead.name, links, links.phoneImage, codes, kind),
      headers: {
        "List-Unsubscribe": `<${INVITE_LINK_ORIGIN}/api/mk-unsub/${token}>, <mailto:${replyTo}?subject=Unsubscribe>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    if (error || !data) throw new Error(error?.message ?? "Email send failed");
    await sql`UPDATE mk_sends SET resend_id = ${data.id} WHERE id = ${sendId}`;
    if (!isTest) await addEvent(sendId, lead.id, "sent", subject);
  } catch (err) {
    await sql`DELETE FROM mk_sends WHERE id = ${sendId}`;
    throw err;
  }
}

/// An error about one recipient's address (as opposed to the sending domain, the key, or a rate limit).
function refusedAddress(message: string): boolean {
  return /invalid (?:\w+ )?(?:email|address|recipient)|invalid `?to`? field|recipient|mailbox|does not exist|not a valid|suppress|undeliverable|no such user|bad address|malformed/i.test(message) && !/api key|rate limit|domain is not verified|not verified|quota|unauthor/i.test(message);
}

function mailer() {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set, so nothing can be sent");
  return { resend: new Resend(process.env.RESEND_API_KEY), from: process.env.MAILSHOT_FROM || process.env.TAPCARD_INVITE_FROM || "Martin Dobson <martin@aiert.co.uk>", replyTo: process.env.MAILSHOT_REPLY_TO || inviteEmailRoute().replyTo };
}

export async function sendTest(to: string, sample: "restaurant" | "cafe", subjectIndex: number): Promise<void> {
  await ensureMarketingSchema();
  const email = norm(to);
  if (!validEmail(email)) throw new Error("Enter an email address for the test");
  const { resend, from, replyTo } = mailer();
  // A made-up place (its own hidden record, so a test never touches your real list).
  const name = sample === "cafe" ? "The Daily Grind" : "The Olive Table";
  const lead = ((await sql`
    INSERT INTO mk_leads (name, email, phone, website, address, booking_url, menu_url, kind, state, is_test)
    VALUES (${name}, ${email}, '020 7946 0123', '', '12 Warrington Crescent, London W9', 'olivetable.example/book', 'olivetable.example/menu', ${sample}, 'held', true)
    RETURNING id, name, email, kind
  `) as SendLead[])[0];
  await sendOne(resend, from, replyTo, lead, subjectIndex, true);
}

export type BatchResult = { sent: number; failed: number; refused: string[]; errors: string[]; message?: string };

/// Sends to the next people in the queue, within today's limit. Pauses itself if too many recent emails bounced.
export async function sendBatch(opts: { count: number; dailyCap: number; subjectIndex: number; override: boolean }): Promise<BatchResult> {
  await ensureMarketingSchema();
  const { resend, from, replyTo } = mailer();
  const recent = ((await sql`
    SELECT COUNT(*)::int AS sent, COUNT(bounced_at)::int AS bounced FROM mk_sends
    WHERE NOT is_test AND sent_at > now() - interval '12 hours' AND legacy_send_id IS NULL`) as { sent: number; bounced: number }[])[0];
  if (!opts.override && recent.sent >= 25 && recent.bounced / recent.sent > BOUNCE_PAUSE_RATE) {
    throw new Error(`Paused to protect your sending address: ${recent.bounced} of the last ${recent.sent} emails bounced. Those addresses are already taken off the list. It restarts by itself once those sends are 12 hours old, or press "Send anyway".`);
  }
  const today = ((await sql`SELECT COUNT(*)::int AS n FROM mk_sends WHERE NOT is_test AND sent_at >= date_trunc('day', now() AT TIME ZONE 'Europe/London') AT TIME ZONE 'Europe/London'`) as { n: number }[])[0].n;
  const cap = Math.min(Math.max(opts.dailyCap || 50, 1), HARD_DAILY_LIMIT);
  const room = cap - today;
  if (room <= 0) return { sent: 0, failed: 0, refused: [], errors: [], message: `Today's limit of ${cap} is reached (${today} sent today). Carry on tomorrow.` };
  const n = Math.min(Math.max(opts.count || 25, 1), MAX_PER_CALL, room);
  const next = (await sql`
    SELECT l.id, l.name, l.email, l.kind FROM mk_leads l
    WHERE NOT l.is_test AND l.state = 'queued' AND NOT EXISTS (SELECT 1 FROM mk_sends s WHERE s.lead_id = l.id AND NOT s.is_test)
    ORDER BY l.created_at, l.id LIMIT ${n}`) as SendLead[];
  if (next.length === 0) return { sent: 0, failed: 0, refused: [], errors: [], message: "Nobody is waiting to be emailed. Add a list first." };
  let sent = 0, failed = 0, consecutive = 0;
  const errors: string[] = [], refused: string[] = [];
  for (const lead of next) {
    try {
      await sendOne(resend, from, replyTo, lead, opts.subjectIndex, false);
      sent++;
      consecutive = 0;
    } catch (err) {
      const message = err instanceof Error ? err.message : "failed";
      if (refusedAddress(message)) {
        await sql`UPDATE mk_leads SET state = 'removed', hold_reason = ${"refused: " + message.slice(0, 100)}, updated_at = now() WHERE id = ${lead.id}`;
        refused.push(lead.email);
        continue;
      }
      failed++;
      consecutive++;
      if (errors.length < 3) errors.push(`${lead.email}: ${message}`);
      if (consecutive >= 3) break; // something is wrong (sending domain, limits): stop rather than burn through the list
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return { sent, failed, refused, errors };
}

// ---------------------------------------------------------------------------------------------------------------------------------
// What happens after sending (called from the public click/preview/unsubscribe routes and the Resend webhook)

export type SendRef = { id: number; lead_id: number };

export async function sendByToken(token: string): Promise<SendRef | null> {
  await ensureMarketingSchema();
  return ((await sql`SELECT id, lead_id FROM mk_sends WHERE token = ${token}`) as SendRef[])[0] ?? null;
}

/// Is this visit probably an email security scanner? Too soon after sending, or part of a burst of links opened together.
async function looksLikeScanner(s: { id: number; sent_at: string }): Promise<boolean> {
  const age = (Date.now() - new Date(s.sent_at).getTime()) / 1000;
  if (age < SCANNER_WINDOW_SECONDS) return true;
  const recent = ((await sql`
    SELECT COUNT(*)::int AS n FROM mk_events WHERE send_id = ${s.id} AND type IN ('clicked', 'preview', 'click_auto') AND created_at > now() - ${`${BURST_SECONDS} seconds`}::interval`) as { n: number }[])[0]?.n ?? 0;
  return recent >= 1;
}

/// A burst was detected: the earlier visit in it was a scanner too, so it stops counting.
async function reclassifyBurst(s: { id: number; lead_id: number }) {
  const prior = (await sql`
    UPDATE mk_events SET type = 'click_auto' WHERE send_id = ${s.id} AND type = 'clicked' AND created_at > now() - ${`${BURST_SECONDS} seconds`}::interval RETURNING id`) as unknown[];
  if (prior.length) {
    await sql`UPDATE mk_sends SET click_count = GREATEST(0, click_count - ${prior.length}) WHERE id = ${s.id}`;
    await sql`UPDATE mk_sends SET clicked_at = NULL WHERE id = ${s.id} AND click_count = 0`;
  }
  const pv = (await sql`UPDATE mk_events SET type = 'preview_auto' WHERE send_id = ${s.id} AND type = 'preview' AND created_at > now() - ${`${BURST_SECONDS} seconds`}::interval RETURNING id`) as unknown[];
  if (pv.length) await sql`UPDATE mk_sends SET preview_first_at = NULL WHERE id = ${s.id} AND NOT EXISTS (SELECT 1 FROM mk_events e WHERE e.send_id = ${s.id} AND e.type = 'preview')`;
}

export async function recordClick(token: string, target: string): Promise<void> {
  const row = ((await (async () => { await ensureMarketingSchema(); return sql`SELECT id, lead_id, sent_at FROM mk_sends WHERE token = ${token}`; })()) as { id: number; lead_id: number; sent_at: string }[])[0];
  if (!row) return;
  if (await looksLikeScanner(row)) {
    await addEvent(row.id, row.lead_id, "click_auto", target);
    await reclassifyBurst(row);
    return;
  }
  await sql`UPDATE mk_sends SET click_count = click_count + 1, clicked_at = COALESCE(clicked_at, now()) WHERE id = ${row.id}`;
  await addEvent(row.id, row.lead_id, "clicked", target);
}

export async function recordPreviewOpened(token: string): Promise<boolean> {
  await ensureMarketingSchema();
  const row = ((await sql`SELECT id, lead_id, sent_at, preview_first_at FROM mk_sends WHERE token = ${token}`) as { id: number; lead_id: number; sent_at: string; preview_first_at: string | null }[])[0];
  if (!row || row.preview_first_at) return !!row;
  // A scanner opening the preview must not start the 24 hours or count as interest.
  if (await looksLikeScanner(row)) { await addEvent(row.id, row.lead_id, "preview_auto", "scanner"); await reclassifyBurst(row); return false; }
  const r = (await sql`UPDATE mk_sends SET preview_first_at = now() WHERE id = ${row.id} AND preview_first_at IS NULL RETURNING id`) as unknown[];
  if (r.length) await addEvent(row.id, row.lead_id, "preview", "opened their sample card");
  return true;
}

/// Someone really used their sample card: a tap, scroll or press on it (a scanner only loads the page). The strongest sign of interest.
export async function recordEngaged(token: string, what: string): Promise<void> {
  await ensureMarketingSchema();
  const row = ((await sql`SELECT id, lead_id, sent_at FROM mk_sends WHERE token = ${token}`) as { id: number; lead_id: number; sent_at: string }[])[0];
  if (!row || (Date.now() - new Date(row.sent_at).getTime()) / 1000 < SCANNER_WINDOW_SECONDS) return;
  const first = (await sql`UPDATE mk_sends SET engaged_count = engaged_count + 1, engaged_at = COALESCE(engaged_at, now()) WHERE id = ${row.id} RETURNING engaged_count`) as { engaged_count: number }[];
  if (first[0] && first[0].engaged_count <= 6) await addEvent(row.id, row.lead_id, "engaged", what.slice(0, 80) || "used their sample card");
}

export async function recordUnsubscribe(token: string): Promise<void> {
  const s = await sendByToken(token);
  if (!s) return;
  await sql`UPDATE mk_sends SET unsubscribed_at = COALESCE(unsubscribed_at, now()) WHERE id = ${s.id}`;
  await sql`UPDATE mk_leads SET state = 'unsubscribed', hold_reason = 'unsubscribed', updated_at = now() WHERE id = ${s.lead_id}`;
  await addEvent(s.id, s.lead_id, "unsubscribed");
}

/// Resend events (delivered, opened, bounced, complained) for a mailing sent from here. Returns true when the email was one of ours.
export async function recordResendEvent(type: string, emailId: string, bounce?: { type?: string; subType?: string; message?: string }): Promise<boolean> {
  await ensureMarketingSchema();
  const s = ((await sql`SELECT id, lead_id FROM mk_sends WHERE resend_id = ${emailId} LIMIT 1`) as SendRef[])[0];
  if (!s) return false;
  switch (type) {
    case "email.delivered":
      await sql`UPDATE mk_sends SET delivered_at = COALESCE(delivered_at, now()) WHERE id = ${s.id}`;
      break;
    case "email.opened":
      await sql`UPDATE mk_sends SET opened_at = COALESCE(opened_at, now()), open_count = open_count + 1 WHERE id = ${s.id}`;
      await addEvent(s.id, s.lead_id, "opened");
      break;
    case "email.bounced": {
      const reason = [bounce?.type, bounce?.subType, bounce?.message].filter(Boolean).join(" · ").slice(0, 300) || null;
      await sql`UPDATE mk_sends SET bounced_at = COALESCE(bounced_at, now()), bounce_reason = COALESCE(${reason}, bounce_reason) WHERE id = ${s.id}`;
      if (!bounce?.type || /perm/i.test(bounce.type)) await sql`UPDATE mk_leads SET state = 'removed', hold_reason = 'bounced', updated_at = now() WHERE id = ${s.lead_id} AND state <> 'unsubscribed'`;
      await addEvent(s.id, s.lead_id, "bounced", reason ?? "");
      break;
    }
    case "email.complained":
      await sql`UPDATE mk_sends SET complained_at = COALESCE(complained_at, now()) WHERE id = ${s.id}`;
      await sql`UPDATE mk_leads SET state = 'unsubscribed', hold_reason = 'marked as spam', updated_at = now() WHERE id = ${s.lead_id}`;
      await addEvent(s.id, s.lead_id, "complained");
      break;
  }
  return true;
}

/// The restaurant's own sample card (24-hour preview page and the card picture in the email).
export type PreviewLead = { sent_at: string; preview_first_at: string | null; name: string; company: string | null; phone: string | null; website: string | null; address: string | null; booking_url: string | null; menu_url: string | null };

export async function previewLeadByToken(token: string): Promise<PreviewLead | null> {
  await ensureMarketingSchema();
  return ((await sql`
    SELECT s.sent_at, s.preview_first_at, l.name, NULL::text AS company, l.phone, l.website, l.address, l.booking_url, l.menu_url
    FROM mk_sends s JOIN mk_leads l ON l.id = s.lead_id WHERE s.token = ${token}`) as PreviewLead[])[0] ?? null;
}

// ---------------------------------------------------------------------------------------------------------------------------------
// The dashboard

export type LeadRow = {
  id: number; name: string; email: string; phone: string; website: string; address: string; kind: string; area: string; batch: string;
  state: LeadState; hold_reason: string; stage: LeadStage; notes: string; created_at: string;
  sends: number; sent_at: string | null; delivered_at: string | null; opened_at: string | null; open_count: number; clicked_at: string | null; click_count: number; engaged_at: string | null; engaged_count: number;
  preview_first_at: string | null; bounced_at: string | null; bounce_reason: string | null; unsubscribed_at: string | null; subject: string | null;
  card_at: string | null; card_verified: boolean;
};

export type Summary = { engaged: number; scanClicks: number; leads: number; toSend: number; held: number; removed: number; emailed: number; delivered: number; opened: number; clicked: number; previewed: number; bounced: number; unsubscribed: number; signedUp: number; interested: number };
export type DayRow = { day: string; sent: number; opened: number; clicked: number };
export type BatchRow = { batch: string; leads: number; emailed: number; opened: number; clicked: number; signedUp: number };

export type Dashboard = { summary: Summary; days: DayRow[]; batches: BatchRow[]; leads: LeadRow[]; todaySent: number; opensSeen: boolean };

export async function dashboard(): Promise<Dashboard> {
  await ensureMarketingSchema();
  const leads = (await sql`
    SELECT l.id, l.name, l.email, l.phone, l.website, l.address, l.kind, l.area, l.batch, l.state, l.hold_reason, l.stage, l.notes, l.created_at,
           (SELECT COUNT(*)::int FROM mk_sends x WHERE x.lead_id = l.id AND NOT x.is_test) AS sends,
           s.sent_at, s.delivered_at, s.opened_at, COALESCE(s.open_count, 0) AS open_count, s.clicked_at, COALESCE(s.click_count, 0) AS click_count,
           s.preview_first_at, s.bounced_at, s.bounce_reason, s.unsubscribed_at, s.subject, s.engaged_at, COALESCE(s.engaged_count, 0) AS engaged_count
    FROM mk_leads l
    LEFT JOIN LATERAL (SELECT * FROM mk_sends WHERE lead_id = l.id AND NOT is_test ORDER BY sent_at DESC LIMIT 1) s ON true
    WHERE NOT l.is_test
    ORDER BY COALESCE(s.sent_at, l.created_at) DESC, l.id DESC
    LIMIT 3000`) as Omit<LeadRow, "card_at" | "card_verified">[];

  // Has the place made a TapCard? Matched on its website's domain, so it shows up without anyone telling you.
  const cardByDomain = new Map<string, { at: string; verified: boolean }>();
  try {
    const cards = (await sql`SELECT website, created_at, verified_at, org_id FROM tapcard_cards WHERE website <> '' AND (card_kind = 'business' OR company <> '') ORDER BY created_at`) as { website: string; created_at: string; verified_at: string | null; org_id: string | null }[];
    for (const c of cards) {
      const d = businessDomain(c.website);
      if (d && !cardByDomain.has(d)) cardByDomain.set(d, { at: c.created_at, verified: !!c.verified_at || !!c.org_id });
    }
  } catch { /* cards table not available */ }
  const rows: LeadRow[] = leads.map((l) => {
    const d = businessDomain(l.website);
    const card = d ? cardByDomain.get(d) : undefined;
    // A card made before the first email says nothing about this mailing.
    const counts = card && (!l.sent_at || new Date(card.at) >= new Date(l.sent_at)) ? card : undefined;
    return { ...l, card_at: counts?.at ?? null, card_verified: counts?.verified ?? false };
  });

  const emailedRows = rows.filter((r) => r.sends > 0);
  const scanClicks = ((await sql`SELECT COUNT(*)::int AS n FROM mk_events WHERE type IN ('click_auto', 'preview_auto')`) as { n: number }[])[0]?.n ?? 0;
  const summary: Summary = {
    engaged: emailedRows.filter((r) => r.engaged_at).length,
    scanClicks,
    leads: rows.length,
    toSend: rows.filter((r) => r.state === "queued" && r.sends === 0).length,
    held: rows.filter((r) => r.state === "held").length,
    removed: rows.filter((r) => r.state === "removed").length,
    emailed: emailedRows.length,
    delivered: emailedRows.filter((r) => r.delivered_at || r.opened_at || r.clicked_at).length,
    opened: emailedRows.filter((r) => r.opened_at).length,
    clicked: emailedRows.filter((r) => r.click_count > 0 || r.engaged_at).length,
    previewed: emailedRows.filter((r) => r.preview_first_at).length,
    bounced: emailedRows.filter((r) => r.bounced_at).length,
    unsubscribed: rows.filter((r) => r.state === "unsubscribed" && r.hold_reason !== "asked not to be emailed, or bounced before").length,
    signedUp: rows.filter((r) => r.card_at || r.stage === "signed_up").length,
    interested: rows.filter((r) => r.stage === "interested").length,
  };

  const days = (await sql`
    WITH d AS (SELECT generate_series((now() AT TIME ZONE 'Europe/London')::date - 29, (now() AT TIME ZONE 'Europe/London')::date, interval '1 day')::date AS day)
    SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
      (SELECT COUNT(*)::int FROM mk_sends s WHERE NOT s.is_test AND (s.sent_at AT TIME ZONE 'Europe/London')::date = d.day) AS sent,
      (SELECT COUNT(DISTINCT e.send_id)::int FROM mk_events e WHERE e.type = 'opened' AND (e.created_at AT TIME ZONE 'Europe/London')::date = d.day) AS opened,
      (SELECT COUNT(DISTINCT e.send_id)::int FROM mk_events e WHERE e.type IN ('clicked', 'engaged') AND (e.created_at AT TIME ZONE 'Europe/London')::date = d.day) AS clicked
    FROM d ORDER BY d.day`) as DayRow[];

  const byBatch = new Map<string, BatchRow>();
  for (const r of rows) {
    const key = r.batch || "No list name";
    const b = byBatch.get(key) ?? { batch: key, leads: 0, emailed: 0, opened: 0, clicked: 0, signedUp: 0 };
    b.leads++;
    if (r.sends > 0) { b.emailed++; if (r.opened_at) b.opened++; if (r.click_count > 0 || r.engaged_at) b.clicked++; }
    if (r.card_at || r.stage === "signed_up") b.signedUp++;
    byBatch.set(key, b);
  }
  const todaySent = ((await sql`SELECT COUNT(*)::int AS n FROM mk_sends WHERE NOT is_test AND sent_at >= date_trunc('day', now() AT TIME ZONE 'Europe/London') AT TIME ZONE 'Europe/London'`) as { n: number }[])[0].n;
  const opensSeen = ((await sql`SELECT 1 FROM mk_events WHERE type = 'opened' LIMIT 1`) as unknown[]).length > 0;
  return { summary, days, batches: [...byBatch.values()].sort((a, b) => b.emailed - a.emailed), leads: rows, todaySent, opensSeen };
}

export type TimelineEvent = { type: string; detail: string; at: string };
export async function leadTimeline(leadId: number): Promise<TimelineEvent[]> {
  await ensureMarketingSchema();
  return (await sql`SELECT type, detail, created_at AS at FROM mk_events WHERE lead_id = ${leadId} ORDER BY created_at DESC LIMIT 60`) as TimelineEvent[];
}

export async function updateLead(id: number, patch: { stage?: string; notes?: string; state?: string; kind?: string }): Promise<void> {
  await ensureMarketingSchema();
  if (patch.stage && ["new", "interested", "signed_up", "not_interested"].includes(patch.stage)) {
    await sql`UPDATE mk_leads SET stage = ${patch.stage}, updated_at = now() WHERE id = ${id}`;
    await addEvent(null, id, "stage", patch.stage.replace("_", " "));
  }
  if (typeof patch.notes === "string") await sql`UPDATE mk_leads SET notes = ${patch.notes.slice(0, 2000)}, updated_at = now() WHERE id = ${id}`;
  if (patch.kind === "restaurant" || patch.kind === "cafe") await sql`UPDATE mk_leads SET kind = ${patch.kind}, updated_at = now() WHERE id = ${id}`;
  if (patch.state === "removed") await sql`UPDATE mk_leads SET state = 'removed', hold_reason = 'taken off by you', updated_at = now() WHERE id = ${id}`;
  if (patch.state === "queued") await sql`UPDATE mk_leads SET state = 'queued', hold_reason = '', updated_at = now() WHERE id = ${id} AND state IN ('held', 'removed') AND hold_reason NOT IN ('bounced', 'unsubscribed', 'marked as spam')`;
}

/// Held-back places (a Gmail-type address, or one that couldn't be checked) put into the queue.
export async function queueHeld(): Promise<number> {
  await ensureMarketingSchema();
  const r = (await sql`UPDATE mk_leads SET state = 'queued', hold_reason = '', updated_at = now() WHERE state = 'held' AND NOT is_test RETURNING id`) as unknown[];
  return r.length;
}
