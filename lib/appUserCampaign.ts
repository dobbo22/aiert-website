// Builds the "finish your TapCard" emails from the live database and sends TEST copies. Read-only except for sending a test to a
// fixed list of our own addresses. Sending to the real recipients is not built here on purpose: it needs an explicit go-ahead.
import sql from "@/lib/db";
import { Resend } from "resend";
import { allBusinesses, applyFilters, parseFilters } from "@/lib/businessUsers";
import { buildEmail, topFixes, type GapKey } from "@/lib/appUserEmail";

export const IMAGE_BASE = "https://www.aiert.co.uk/tapcard-email";
export const GUIDE_URL = "https://tapcard.aiert.co.uk/guide?utm_source=email&utm_medium=app-users&utm_campaign=finish-your-card";
export const EXCLUDED_DOMAINS = ["hobartcapital.com"]; // contacts of Martin's, left out of this mailing
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
export async function buildAppUserEmails(): Promise<Recipient[]> {
  const { rows } = await allBusinesses();
  const real = applyFilters(rows, parseFilters({ email: "own", notest: "1", app: "1", all: "1" })).filter((r) => !EXCLUDED_DOMAINS.includes(r.emailDomain));
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
    const mail = buildEmail({ firstName, business: r.company || r.name, personal: r.isPersonal, missing, sentTo, imageBase: IMAGE_BASE, guideUrl: GUIDE_URL, replyTo: "martin@aiert.co.uk" });
    return { email: r.email, firstName, business: r.company || r.name, subject: mail.subject, fixes: topFixes(missing, r.isPersonal), sentTo, cardId: r.id, html: mail.html, text: mail.text };
  });
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Sends TEST copies of the chosen recipients' emails to one of our own addresses. Never to the real recipients.
export async function sendTestCopies(to: string, emails: string[]): Promise<{ business: string; ok: boolean; error?: string }[]> {
  if (!TEST_ADDRESSES.includes(to)) throw new Error("Test copies can only go to one of our own addresses");
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set");
  const all = await buildAppUserEmails();
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
