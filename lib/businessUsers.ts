// Signed-up businesses and how each one signed up, for the admin "Businesses" page and its CSV. Read-only.
// Sign-up types: a TapCard for Business company (web plan), a single business card with an App Store / Google Play Promote subscription,
// a single business card with a complimentary Promote grant, or a single business card with no Promote yet ("free").
import sql from "@/lib/db";
import { TRIAL_DAYS } from "@/lib/tapcardBizBilling";
import { businessDomain, emailOnDomain } from "@/lib/tapcardDomain";

export type SignupType = "company" | "store" | "grant" | "free";
export const SIGNUP_LABEL: Record<SignupType, string> = {
  company: "TapCard for Business (company plan)",
  store: "Business card + Promote (App Store / Google Play)",
  grant: "Business card + complimentary Promote",
  free: "Business card, no Promote yet",
};

export type BizRow = {
  id: string;
  name: string;
  company: string;
  email: string;
  website: string;
  label: string;
  created_at: string;
  views: number;
  qr: number;
  saves: number;
  followers: number;
  claims: number;
  offers: number;
  news: number;
  org_id: string | null;
  org_name: string | null;
  billing_status: string | null;
  org_created: string | null;
  promote_until: string | null;
  promote_trial: boolean;
  promote_platform: string | null;
  grant_until: string | null;
  signup: SignupType;
  detail: string;
  emailKind: EmailKind;
  emailDomain: string;
  emailOnSite: boolean; // the email's domain is the same as the card's website: a strong sign of a real business
  looksTest: boolean; // a demo/test card, or one of our own addresses
  fromApp: boolean; // made in the TapCard app (carries an install id), not the web demo
  isPersonal: boolean;
};

export type EmailKind = "none" | "free" | "own";

const fmt = (d: string | Date) => new Date(d).toISOString().slice(0, 10);

// Pure: decides the sign-up type and a short human detail from the joined data.
export function signupOf(r: {
  org_id: string | null; org_name: string | null; billing_status: string | null; org_created: string | null;
  promote_until: string | null; promote_trial: boolean; promote_platform: string | null; grant_until: string | null;
}, now = Date.now()): { signup: SignupType; detail: string } {
  if (r.org_id) {
    if (r.billing_status === "active") return { signup: "company", detail: `${r.org_name || "company"}: paid plan` };
    const ends = r.org_created ? new Date(r.org_created).getTime() + TRIAL_DAYS * 86_400_000 : 0;
    return { signup: "company", detail: `${r.org_name || "company"}: ${ends > now ? `free trial until ${fmt(new Date(ends))}` : "trial ended, not paid"}` };
  }
  if (r.promote_until) {
    const live = new Date(r.promote_until).getTime() > now;
    return { signup: "store", detail: `${r.promote_platform || "store"}: ${r.promote_trial ? "free trial" : "subscribed"} ${live ? "until" : "ended"} ${fmt(r.promote_until)}` };
  }
  if (r.grant_until) return { signup: "grant", detail: `complimentary until ${fmt(r.grant_until)}` };
  return { signup: "free", detail: "" };
}

// UK and other shared mail providers that tapcardDomain's list does not cover: an address there says nothing about the business.
const MORE_FREE_MAIL = new Set([
  "live.co.uk", "outlook.co.uk", "msn.com", "talktalk.net", "virginmedia.com", "ntlworld.com", "blueyonder.co.uk", "tiscali.co.uk", "gmx.com", "gmx.co.uk",
  "mail.com", "yahoo.ie", "yahoo.fr", "hotmail.fr", "hotmail.it", "hotmail.de", "icloud.co.uk", "mac.com", "pm.me", "hey.com", "zoho.com", "fastmail.com", "plus.net", "sky.co.uk",
  "privaterelay.appleid.com", "telenet.be", "skynet.be", "proximus.be", "orange.fr", "free.fr", "wanadoo.fr", "web.de", "t-online.de", "libero.it", "mail.ru", "yandex.ru", "bluewin.ch", "bigpond.com", "optusnet.com.au", "shaw.ca", "rogers.com",
]);

// Our own addresses (and AIERT staff): never a prospect.
const OUR_DOMAINS = new Set(["aiert.co.uk", "mailbroom.app"]);

export function emailInfo(email: string, website: string): { kind: EmailKind; domain: string; onSite: boolean } {
  const e = email.trim().toLowerCase();
  const domain = e.includes("@") ? e.split("@")[1] : "";
  if (!domain) return { kind: "none", domain: "", onSite: false };
  if (MORE_FREE_MAIL.has(domain) || !businessDomain(domain)) return { kind: "free", domain, onSite: false };
  return { kind: "own", domain, onSite: emailOnDomain(e, businessDomain(website)) };
}

// Names and sites that look like demo or test cards (Acme, Test, Sample...), which are not real prospects.
const TESTISH = /\b(acme|test|testing|demo|sample|example|lorem|asdf|qwerty|dummy|placeholder|my business|your business)\b/i;
export const looksTest = (r: { name: string; company: string; website: string; email?: string }) =>
  TESTISH.test(`${r.company} ${r.name}`) || /example\.(com|org)|test\.com|acme/i.test(r.website) || OUR_DOMAINS.has((r.email ?? "").split("@")[1]?.toLowerCase() ?? "");

export const COFFEE_WORDS = ["coffee", "cafe", "café", "espresso", "roast", "barista", "bean", "brew", "caffe", "coffeehouse"];

// Pure: true when any keyword appears in the business name, company, label or website (case-insensitive).
export function matchesKeywords(r: Pick<BizRow, "name" | "company" | "label" | "website">, keywords: string[]): boolean {
  if (!keywords.length) return true;
  const hay = `${r.name} ${r.company} ${r.label} ${r.website}`.toLowerCase();
  return keywords.some((k) => k && hay.includes(k.toLowerCase()));
}

// "Little used": nothing posted (no offers) and fewer than 5 followers.
export const littleUsed = (r: Pick<BizRow, "offers" | "followers">) => r.offers === 0 && r.followers < 5;

const safe = async <T,>(p: Promise<T>): Promise<T | null> => p.catch(() => null);

/// Claims made from our own devices are tests, not customers, so the Claimed column leaves them out. 8d08699f... is the iPhone simulator
/// that takes the pitch screenshots (its -claim launch flag claims the sample offer through the API). If that simulator is ever erased it
/// gets a new id: add the new hash here (find it with: SELECT DISTINCT claimant_hash FROM tapcard_offer_claims WHERE via='app' ORDER BY 1).
export const OWN_CLAIMANTS = ["8d08699f74ee4605b9c543ed1e465945ab32cb1b74fbd42e9a2a6d3c0dbd885d"];

export async function allBusinesses(): Promise<{ rows: BizRow[]; personalCards: number }> {
  const base = (await sql`
    SELECT c.id, c.name, c.company, c.email, c.website, c.label, c.card_kind, c.grouping_id, c.created_at, c.view_count AS views, c.qr_view_count AS qr, c.save_count AS saves,
      c.org_id, o.name AS org_name, o.billing_status, o.created_at AS org_created,
      (SELECT COUNT(*)::int FROM tapcard_followers f WHERE f.card_id = c.id) AS followers,
      (SELECT COUNT(*)::int FROM tapcard_offer_claims k JOIN tapcard_offers x ON x.id = k.offer_id WHERE x.card_id = c.id AND k.claimant_hash <> ALL(${OWN_CLAIMANTS}::text[])) AS claims
    FROM tapcard_cards c LEFT JOIN tapcard_biz_orgs o ON o.id = c.org_id
    ORDER BY c.created_at DESC LIMIT 2000`) as Record<string, unknown>[];
  const [promote, grants, offers, news, personal] = await Promise.all([
    safe(sql`SELECT card_id, until, trial, platform FROM tapcard_promote`),
    safe(sql`SELECT card_id, until FROM tapcard_promote_grants`),
    safe(sql`SELECT card_id, COUNT(*)::int AS n FROM tapcard_offers GROUP BY card_id`),
    safe(sql`SELECT card_id, COUNT(*)::int AS n FROM tapcard_announcements WHERE withdrawn = false GROUP BY card_id`),
    safe(sql`SELECT COUNT(*)::int AS n FROM tapcard_cards WHERE card_kind = 'person' AND org_id IS NULL`),
  ]);
  const by = <T extends { card_id: string }>(list: T[] | null) => new Map((list ?? []).map((x) => [x.card_id, x]));
  const pm = by(promote as { card_id: string; until: string; trial: boolean; platform: string }[] | null);
  const gm = by(grants as { card_id: string; until: string }[] | null);
  const om = by(offers as { card_id: string; n: number }[] | null);
  const nm = by(news as { card_id: string; n: number }[] | null);

  const rows = base.map((r) => {
    const id = String(r.id);
    const p = pm.get(id);
    const g = gm.get(id);
    const joined = {
      org_id: (r.org_id as string) ?? null, org_name: (r.org_name as string) ?? null, billing_status: (r.billing_status as string) ?? null,
      org_created: r.org_created ? new Date(r.org_created as string).toISOString() : null,
      promote_until: p ? new Date(p.until).toISOString() : null, promote_trial: Boolean(p?.trial), promote_platform: p?.platform ?? null,
      grant_until: g ? new Date(g.until).toISOString() : null,
    };
    return {
      id, name: String(r.name || ""), company: String(r.company || ""), email: String(r.email || ""), website: String(r.website || ""), label: String(r.label || ""),
      created_at: new Date(r.created_at as string).toISOString(), views: Number(r.views), qr: Number(r.qr), saves: Number(r.saves),
      followers: Number(r.followers), claims: Number(r.claims), offers: om.get(id)?.n ?? 0, news: nm.get(id)?.n ?? 0,
      ...joined, ...signupOf(joined),
      ...((x) => ({ emailKind: x.kind, emailDomain: x.domain, emailOnSite: x.onSite }))(emailInfo(String(r.email || ""), String(r.website || ""))),
      looksTest: looksTest({ name: String(r.name || ""), company: String(r.company || ""), website: String(r.website || ""), email: String(r.email || "") }),
      fromApp: Boolean(r.grouping_id),
      isPersonal: r.card_kind === "person" && !r.org_id,
    } satisfies BizRow;
  });
  return { rows, personalCards: rows.filter((r) => r.isPersonal).length || ((personal as { n: number }[] | null) ?? [{ n: 0 }])[0].n };
}

export type Filters = { q: string; type: string; little: boolean; email: string; notest: boolean; app: boolean; all: boolean };

export function parseFilters(sp: { q?: string; type?: string; little?: string; email?: string; notest?: string; app?: string; all?: string }): Filters {
  return { q: (sp.q ?? "").trim(), type: sp.type ?? "", little: sp.little === "1", email: ["own", "free", "none", "any"].includes(sp.email ?? "") ? (sp.email as string) : "", notest: sp.notest === "1", app: sp.app === "1", all: sp.all === "1" };
}

export function applyFilters(rows: BizRow[], f: Filters): BizRow[] {
  const keywords = f.q.split(",").map((k) => k.trim()).filter(Boolean);
  return rows.filter(
    (r) =>
      matchesKeywords(r, keywords) &&
      (!f.type || r.signup === f.type) &&
      (!f.little || littleUsed(r)) &&
      (!f.email || (f.email === "any" ? r.emailKind !== "none" : r.emailKind === f.email)) &&
      (!f.notest || !r.looksTest) &&
      (!f.app || r.fromApp) &&
      (f.all || !r.isPersonal),
  );
}

const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
export function toCsv(rows: BizRow[]): string {
  const head = ["Business", "Contact name", "Email", "Website", "Sign-up type", "Detail", "Created", "Views", "QR scans", "Saves", "Followers", "Offers posted", "News posted", "Offers claimed", "Email type", "Email matches website", "Looks like a test or our own", "Made in app", "Card type", "Card link"];
  const lines = rows.map((r) => [r.company || r.name, r.name, r.email, r.website, SIGNUP_LABEL[r.signup], r.detail, r.created_at.slice(0, 10), r.views, r.qr, r.saves, r.followers, r.offers, r.news, r.claims, r.emailKind === "own" ? "own domain" : r.emailKind === "free" ? "free mail" : "none", r.emailOnSite ? "yes" : "no", r.looksTest ? "yes" : "no", r.fromApp ? "yes" : "no", r.isPersonal ? "personal" : "business", `https://tapcard.aiert.co.uk/c/${r.id}`].map(csvCell).join(","));
  return [head.map(csvCell).join(","), ...lines].join("\n");
}
