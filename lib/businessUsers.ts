// Signed-up businesses and how each one signed up, for the admin "Businesses" page and its CSV. Read-only.
// Sign-up types: a TapCard for Business company (web plan), a single business card with an App Store / Google Play Promote subscription,
// a single business card with a complimentary Promote grant, or a single business card with no Promote yet ("free").
import sql from "@/lib/db";
import { TRIAL_DAYS } from "@/lib/tapcardBizBilling";

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
};

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

export async function allBusinesses(): Promise<{ rows: BizRow[]; personalCards: number }> {
  const base = (await sql`
    SELECT c.id, c.name, c.company, c.email, c.website, c.label, c.created_at, c.view_count AS views, c.qr_view_count AS qr, c.save_count AS saves,
      c.org_id, o.name AS org_name, o.billing_status, o.created_at AS org_created,
      (SELECT COUNT(*)::int FROM tapcard_followers f WHERE f.card_id = c.id) AS followers,
      (SELECT COUNT(*)::int FROM tapcard_offer_claims k JOIN tapcard_offers x ON x.id = k.offer_id WHERE x.card_id = c.id) AS claims
    FROM tapcard_cards c LEFT JOIN tapcard_biz_orgs o ON o.id = c.org_id
    WHERE c.card_kind <> 'person' OR c.org_id IS NOT NULL
    ORDER BY c.created_at DESC LIMIT 1000`) as Record<string, unknown>[];
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
    } satisfies BizRow;
  });
  return { rows, personalCards: ((personal as { n: number }[] | null) ?? [{ n: 0 }])[0].n };
}

export type Filters = { q: string; type: string; little: boolean };

export function parseFilters(sp: { q?: string; type?: string; little?: string }): Filters {
  return { q: (sp.q ?? "").trim(), type: sp.type ?? "", little: sp.little === "1" };
}

export function applyFilters(rows: BizRow[], f: Filters): BizRow[] {
  const keywords = f.q.split(",").map((k) => k.trim()).filter(Boolean);
  return rows.filter((r) => matchesKeywords(r, keywords) && (!f.type || r.signup === f.type) && (!f.little || littleUsed(r)));
}

const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
export function toCsv(rows: BizRow[]): string {
  const head = ["Business", "Contact name", "Email", "Website", "Sign-up type", "Detail", "Created", "Views", "QR scans", "Saves", "Followers", "Offers posted", "News posted", "Offers claimed", "Card link"];
  const lines = rows.map((r) => [r.company || r.name, r.name, r.email, r.website, SIGNUP_LABEL[r.signup], r.detail, r.created_at.slice(0, 10), r.views, r.qr, r.saves, r.followers, r.offers, r.news, r.claims, `https://tapcard.aiert.co.uk/c/${r.id}`].map(csvCell).join(","));
  return [head.map(csvCell).join(","), ...lines].join("\n");
}
