// Builds the "finish your TapCard" emails from the live database and sends TEST copies. Read-only except for sending a test to a
// fixed list of our own addresses. Sending to the real recipients is not built here on purpose: it needs an explicit go-ahead.
import sql from "@/lib/db";
import { Resend } from "resend";
import { allBusinesses, applyFilters, parseFilters } from "@/lib/businessUsers";
import { unsubPostUrl, unsubPageUrl, unsubscribedEmails } from "@/lib/appUserUnsub";
import { buildEmail, topFixes, type GapKey } from "@/lib/appUserEmail";

export const IMAGE_BASE = "https://www.aiert.co.uk/tapcard-email";
export const GUIDE_URL = "https://tapcard.aiert.co.uk/guide?utm_source=email&utm_medium=app-users&utm_campaign=finish-your-card";
export const EXCLUDED_DOMAINS = ["hobartcapital.com"]; // contacts of Martin's, left out of this mailing
// "own" = people with their own company domain (sent 9 Nov). "private" = gmail, hotmail and other shared providers: a separate
// campaign key so the two logs never mix, and Apple's relay addresses are left out (they only forward from registered domains).
export type Audience = "own" | "private";
export const parseAudience = (v: unknown): Audience => (v === "private" ? "private" : "own");
export const PRIVATE_SKIP_DOMAINS = ["privaterelay.appleid.com"];
export const TEST_ADDRESSES = ["martin@aiert.co.uk", "martin@mailbroom.app"];

type CardGapRow = { id: string; title: string; phone: string; website: string; photo_url: string | null; linkedin_url: string; twitter_url: string; instagram_url: string; facebook_url: string; tiktok_url: string; whatsapp_url: string; address: string; links: string };

// Pure: what a card is missing. A business card with a website gets its logo from the site, so only personal cards (or businesses
// without a site) are told to add a photo.
export function missingOf(c: CardGapRow, personal: boolean): GapKey[] {
  const m: GapKey[] = [];
  if (!c.photo_url && (personal || !c.website)) m.push("photo");
  if (!c.title) m.push("title");
  if (!c.phone) m.push("phone");
  if (!c.website) m.push("website");
  if (!c.address) m.push("address");
  if (!c.linkedin_url) m.push("linkedin");
  if (!(c.instagram_url || c.facebook_url || c.twitter_url || c.tiktok_url)) m.push("social");
  if (!c.whatsapp_url) m.push("whatsapp");
  try { if (JSON.parse(c.links || "[]").length === 0) m.push("links"); } catch { m.push("links"); }
  return m;
}

const NOT_NAMES = new Set(["administrative", "admin", "info", "team", "office", "sales", "support", "reception", "accounts", "enquiries", "hello", "contact", "mr", "mrs", "ms", "dr"]);
// A first name only when the card clearly holds a person's name: not "Administrative", an acronym, or the company itself.
export function firstNameOf(name: string, company: string): string {
  const t = name.trim().split(/\s+/);
  const w = t[0] ?? "";
  if (t.length < 2 || !/^[A-Za-zÀ-ÿ'’-]{2,}$/.test(w) || NOT_NAMES.has(w.toLowerCase()) || name.trim().toLowerCase() === company.trim().toLowerCase()) return "";
  if (w === w.toUpperCase()) return w.length <= 3 ? "" : w[0] + w.slice(1).toLowerCase();
  return w;
}

export type Recipient = { email: string; firstName: string; business: string; subject: string; fixes: GapKey[]; sentTo: number; cardId: string; html: string; text: string };

// One email per address (the card with the most views wins), from real app users with an own-domain email.
export async function buildAppUserEmails(audience: Audience = "own"): Promise<Recipient[]> {
  const { rows } = await allBusinesses();
  const real = applyFilters(rows, parseFilters({ email: audience === "private" ? "free" : "own", notest: "1", app: "1", all: "1" })).filter((r) => !EXCLUDED_DOMAINS.includes(r.emailDomain) && !(audience === "private" && PRIVATE_SKIP_DOMAINS.includes(r.emailDomain)));
  const ids = real.map((r) => r.id);
  if (!ids.length) return [];
  const cards = (await sql`SELECT id, title, phone, website, photo_url, linkedin_url, twitter_url, instagram_url, facebook_url, tiktok_url, whatsapp_url, address, links FROM tapcard_cards WHERE id = ANY(${ids})`) as CardGapRow[];
  const byId = new Map(cards.map((c) => [c.id, c]));
  const sent = new Map(((await sql`SELECT card_id, COUNT(*)::int AS n FROM tapcard_card_recipients GROUP BY card_id`) as { card_id: string; n: number }[]).map((x) => [x.card_id, x.n]));
  const byEmail = new Map<string, (typeof real)[number]>();
  for (const r of real) { const k = r.email.toLowerCase(); const cur = byEmail.get(k); if (!cur || r.views > cur.views) byEmail.set(k, r); }
  return [...byEmail.values()].map((r) => {
    const missing = missingOf(byId.get(r.id)!, r.isPersonal);
    const firstName = firstNameOf(r.name, r.company);
    const sentTo = sent.get(r.id) ?? 0;
    const mail = buildEmail({ firstName, business: r.company || r.name, personal: r.isPersonal, missing, sentTo, imageBase: IMAGE_BASE, guideUrl: GUIDE_URL, replyTo: "martin@aiert.co.uk", unsubscribeUrl: unsubPageUrl(r.email) });
    return { email: r.email, firstName, business: r.company || r.name, subject: mail.subject, fixes: topFixes(missing, r.isPersonal), sentTo, cardId: r.id, html: mail.html, text: mail.text };
  });
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Sends TEST copies of the chosen recipients' emails to one of our own addresses. Never to the real recipients.
export async function sendTestCopies(to: string, emails: string[], audience: Audience = "own"): Promise<{ business: string; ok: boolean; error?: string }[]> {
  if (!TEST_ADDRESSES.includes(to)) throw new Error("Test copies can only go to one of our own addresses");
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set");
  const all = await buildAppUserEmails(audience);
  const picked = all.filter((r) => emails.map((e) => e.toLowerCase()).includes(r.email.toLowerCase()));
  if (!picked.length) throw new Error("None of those recipients were found");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.MAILSHOT_FROM || process.env.TAPCARD_INVITE_FROM || "Martin Dobson <martin@aiert.co.uk>";
  const out: { business: string; ok: boolean; error?: string }[] = [];
  let n = 0;
  for (const r of picked) {
    const banner = `<div style="background:#fde68a;color:#1a1530;font:14px/1.4 Helvetica,Arial,sans-serif;padding:10px 14px;text-align:center">TEST COPY. The real version would go to <b>${esc(r.firstName || "the card owner")}</b> at <b>${esc(r.business)}</b>. Nothing has been sent to them.</div>`;
    const html = r.html.replace(/(<body[^>]*>)/, `$1${banner}`);
    const res = await resend.emails.send({ from, to: [to], subject: `[TEST ${++n} of ${picked.length}] ${r.subject}`, html, text: `TEST COPY for ${r.business} (nothing sent to them)\n\n${r.text}`, replyTo: "martin@aiert.co.uk" });
    out.push({ business: r.business, ok: !res.error, error: res.error?.message });
  }
  return out;
}


// ---- The real send ----
// One campaign, one email per address, never twice. Each address is claimed in app_user_email_log before sending, so overlapping
// clicks cannot double-send, and a failed send is recorded but never retried automatically.
export const CAMPAIGN = "finish-your-card-2026-11";
export const CAMPAIGN_PRIVATE = "finish-your-card-2026-11-private";
export const campaignFor = (a: Audience) => (a === "private" ? CAMPAIGN_PRIVATE : CAMPAIGN);

let logReady: Promise<unknown> | null = null;
function ensureLog() {
  logReady ??= sql`
    CREATE TABLE IF NOT EXISTS app_user_email_log (
      campaign text NOT NULL,
      email text NOT NULL,
      business text NOT NULL DEFAULT '',
      status text NOT NULL DEFAULT 'sending',
      resend_id text,
      error text,
      sent_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (campaign, email)
    )`;
  return logReady;
}

// Pure: who is left to email once suppressed and already-sent addresses are removed.
export function eligibleRecipients<T extends { email: string }>(list: T[], suppressed: Set<string>, alreadySent: Set<string>): { eligible: T[]; suppressedCount: number; alreadySentCount: number } {
  const eligible: T[] = [];
  let suppressedCount = 0;
  let alreadySentCount = 0;
  for (const r of list) {
    const e = r.email.toLowerCase();
    if (alreadySent.has(e)) alreadySentCount++;
    else if (suppressed.has(e)) suppressedCount++;
    else eligible.push(r);
  }
  return { eligible, suppressedCount, alreadySentCount };
}

export type SendLogRow = { email: string; business: string; status: string; error: string | null; sent_at: string };

export async function campaignState(audience: Audience = "own"): Promise<{ eligible: Recipient[]; suppressedCount: number; alreadySentCount: number; log: SendLogRow[] }> {
  await ensureLog();
  const list = await buildAppUserEmails(audience);
  // Anyone who unsubscribed, bounced or was removed in the mailshot system is never emailed from here either.
  const suppressedRows = (await sql`
    SELECT lower(l.email) AS e FROM mk_leads l
    WHERE l.state IN ('unsubscribed', 'removed')
       OR EXISTS (SELECT 1 FROM mk_sends s WHERE s.lead_id = l.id AND s.bounced_at IS NOT NULL OR s.lead_id = l.id AND s.unsubscribed_at IS NOT NULL)`.catch(() => [])) as { e: string }[];
  // ...and so is anyone who used this email's own unsubscribe link (or whose "stop" reply was added by hand).
  const sup = new Set<string>([...suppressedRows.map((x) => x.e), ...(await unsubscribedEmails())]);
  const log = (await sql`SELECT email, business, status, error, sent_at FROM app_user_email_log WHERE campaign = ${campaignFor(audience)} ORDER BY sent_at DESC`) as SendLogRow[];
  // Whatever campaign it went out under, an address that was emailed once is never emailed again.
  const everSent = (await sql`SELECT lower(email) AS e FROM app_user_email_log WHERE status = 'sent'`) as { e: string }[];
  const done = new Set([...log.map((l) => l.email.toLowerCase()), ...everSent.map((x) => x.e)]);
  return { ...eligibleRecipients(list, sup, done), log };
}

// Sends to everyone still eligible. `expected` must match how many that is right now, so a stale page cannot send a different list.
export async function sendCampaign(expected: number, audience: Audience = "own"): Promise<{ sent: number; failed: number; errors: string[] }> {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set");
  const { eligible } = await campaignState(audience);
  const camp = campaignFor(audience);
  if (eligible.length !== expected) throw new Error(`The list changed: ${eligible.length} people are eligible now, not ${expected}. Reload the page and check again.`);
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.MAILSHOT_FROM || process.env.TAPCARD_INVITE_FROM || "Martin Dobson <martin@aiert.co.uk>";
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];
  for (const r of eligible) {
    const claimed = (await sql`INSERT INTO app_user_email_log (campaign, email, business) VALUES (${camp}, ${r.email.toLowerCase()}, ${r.business}) ON CONFLICT DO NOTHING RETURNING email`) as unknown[];
    if (!claimed.length) continue; // someone else already claimed it
    const res = await resend.emails.send({
      from, to: [r.email], subject: r.subject, html: r.html, text: r.text, replyTo: "martin@aiert.co.uk",
      headers: { "List-Unsubscribe": `<${unsubPostUrl(r.email)}>, <mailto:martin@aiert.co.uk?subject=stop>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      tags: [{ name: "campaign", value: audience === "private" ? "finish-your-card-private" : "finish-your-card" }],
    });
    if (res.error) {
      failed++;
      errors.push(`${r.business}: ${res.error.message}`);
      await sql`UPDATE app_user_email_log SET status = 'failed', error = ${res.error.message} WHERE campaign = ${camp} AND email = ${r.email.toLowerCase()}`;
    } else {
      sent++;
      await sql`UPDATE app_user_email_log SET status = 'sent', resend_id = ${res.data?.id ?? null} WHERE campaign = ${camp} AND email = ${r.email.toLowerCase()}`;
    }
    await new Promise((ok) => setTimeout(ok, 700)); // stay under Resend's rate limit
  }
  // One summary to Martin, so he knows it has gone (and to whom). A failure to send the summary never hides the result.
  try {
    const rows = (await sql`SELECT email, business, status, error FROM app_user_email_log WHERE campaign = ${camp} ORDER BY sent_at`) as { email: string; business: string; status: string; error: string | null }[];
    const lines = rows.map((l) => `${l.status === "sent" ? "SENT  " : "FAILED"}  ${l.business}  <${l.email}>${l.error ? `  (${l.error})` : ""}`);
    await resend.emails.send({
      from, to: ["martin@aiert.co.uk"], subject: `Finish-your-TapCard email sent: ${sent} sent, ${failed} failed`,
      text: `The "finish your TapCard" email has gone out.\n\nSent: ${sent}\nFailed: ${failed}\n\nEveryone this campaign has been sent to:\n${lines.join("\n")}\n\nReplies will come to martin@aiert.co.uk. Delivery and bounces are shown at https://resend.com/emails .\nNobody is ever sent this email twice.`,
    });
  } catch { /* ignore */ }
  return { sent, failed, errors };
}
