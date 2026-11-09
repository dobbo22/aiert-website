// @ts-nocheck  (a standalone script run with tsx: its ".ts" import paths are for tsx, not the site build)
// Builds one personalised "finish your TapCard" email per real app user, from the live database (read-only).
//
//   DATABASE_URL="$(neonctl connection-string --project-id tiny-brook-82758292 --database-name invites --role-name backup_reader --pooled)" \
//     npx tsx scripts/emails/build-app-users-email.mts <out-dir> [--local] [--exclude-domain hobartcapital.com]
//
// Writes <out-dir>/recipients.csv and <out-dir>/html/*.html. The output holds email addresses: keep it OUT of the repo.
// Sends nothing. --local points the screenshots at public/tapcard-email on disk, for previewing before they are deployed.
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import * as dbmod from "../../lib/db.ts";
import * as bu from "../../lib/businessUsers.ts";
import * as em from "../../lib/appUserEmail.ts";

const sql: any = (dbmod as any).default?.default ?? (dbmod as any).default;
const B: any = (bu as any).allBusinesses ? bu : (bu as any).default;
const E: any = (em as any).buildEmail ? em : (em as any).default;

const args = process.argv.slice(2);
const out = args.find((a) => !a.startsWith("--"));
if (!out) { console.error("Usage: build-app-users-email.mts <out-dir> [--local] [--exclude-domain x.com]"); process.exit(1); }
const local = args.includes("--local");
const excluded = args.flatMap((a, i) => (a === "--exclude-domain" ? [args[i + 1]] : []));
const imageBase = local ? `file://${resolve("public/tapcard-email")}` : "https://www.aiert.co.uk/tapcard-email";
const guideUrl = "https://tapcard.aiert.co.uk/guide?utm_source=email&utm_medium=app-users&utm_campaign=finish-your-card";

const { rows } = await B.allBusinesses();
const real = B.applyFilters(rows, B.parseFilters({ email: "own", notest: "1", app: "1", all: "1" })).filter((r: any) => !excluded.includes(r.emailDomain));
const ids = real.map((r: any) => r.id);
const cards = (await sql`SELECT id, title, phone, website, photo_url, linkedin_url, twitter_url, instagram_url, facebook_url, tiktok_url, whatsapp_url, address, links FROM tapcard_cards WHERE id = ANY(${ids})`) as any[];
const byId = new Map(cards.map((c) => [c.id, c]));
const recips = new Map<string, number>(((await sql`SELECT card_id, COUNT(*)::int AS n FROM tapcard_card_recipients GROUP BY card_id`) as any[]).map((x) => [x.card_id, x.n]));

const missingOf = (c: any, personal: boolean): string[] => {
  const m: string[] = [];
  // A business card with a website gets its logo from the site, so only personal cards (or businesses without a site) need a photo.
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
};
// A first name only when the card clearly holds a person's name: not "Administrative", an acronym, or the company itself.
const NOT_NAMES = new Set(["administrative", "admin", "info", "team", "office", "sales", "support", "reception", "accounts", "enquiries", "hello", "contact", "mr", "mrs", "ms", "dr"]);
const firstNameOf = (name: string, company: string) => {
  const t = name.trim().split(/\s+/);
  const w = t[0] ?? "";
  if (t.length < 2 || !/^[A-Za-zÀ-ÿ'’-]{2,}$/.test(w) || NOT_NAMES.has(w.toLowerCase()) || name.trim().toLowerCase() === company.trim().toLowerCase()) return "";
  if (w === w.toUpperCase()) return w.length <= 3 ? "" : w[0] + w.slice(1).toLowerCase();
  return w;
};

// One email per address: keep the card with the most views.
const byEmail = new Map<string, any>();
for (const r of real) { const k = r.email.toLowerCase(); const cur = byEmail.get(k); if (!cur || r.views > cur.views) byEmail.set(k, r); }

mkdirSync(join(out, "html"), { recursive: true });
const lines = ["email,first_name,business,subject,fixes,sent_to,card"];
const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
for (const r of byEmail.values()) {
  const c = byId.get(r.id);
  const missing = missingOf(c, r.isPersonal);
  const fixes = E.topFixes(missing, r.isPersonal);
  const mail = E.buildEmail({ firstName: firstNameOf(r.name, r.company), business: r.company || r.name, personal: r.isPersonal, missing, sentTo: recips.get(r.id) ?? 0, imageBase, guideUrl, replyTo: "martin@aiert.co.uk" });
  const slug = r.email.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  writeFileSync(join(out, "html", `${slug}.html`), mail.html);
  writeFileSync(join(out, "html", `${slug}.txt`), mail.text);
  lines.push([r.email, firstNameOf(r.name, r.company), r.company || r.name, mail.subject, fixes.join(" + "), recips.get(r.id) ?? 0, `https://tapcard.aiert.co.uk/c/${r.id}`].map(q).join(","));
}
writeFileSync(join(out, "recipients.csv"), lines.join("\n"));
console.log(`wrote ${byEmail.size} emails (from ${real.length} cards) to ${out}`);
