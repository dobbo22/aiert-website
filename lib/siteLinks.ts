// Finds the booking, menu, ordering, shop and review links a business already
// publishes on its own website, so TapCard can offer to add them to the card.
// Only links the page itself contains (nothing guessed or invented); the owner
// ticks which to keep.
import { normalizeDomain, readLimited, safeFetch } from "@/lib/siteIcon";
import { sanitizeLinks, type CardLink, type LinkKind } from "@/lib/tapcardLinks";

const MAX_HTML = 2 * 1024 * 1024;

const BOOK_HOSTS = /(^|\.)(opentable\.[a-z.]+|resy\.com|sevenrooms\.com|exploretock\.com|tock\.com|thefork\.[a-z.]+|quandoo\.[a-z.]+|resdiary\.com|bookatable\.[a-z.]+|designmynight\.com|tablein\.com|bookingbug\.com)$/i;
const ROOM_HOSTS = /(^|\.)(booking\.com|synxis\.com|littlehotelier\.com|thebookingbutton\.[a-z.]+)$/i;
const APPT_HOSTS = /(^|\.)(fresha\.com|treatwell\.[a-z.]+|calendly\.com|setmore\.com|square\.site|acuityscheduling\.com|simplybook\.me)$/i;
const ORDER_HOSTS = /(^|\.)(deliveroo\.[a-z.]+|ubereats\.com|just-eat\.[a-z.]+|justeat\.[a-z.]+|toasttab\.com|order\.online|orderyoyo\.com|foodhub\.[a-z.]+)$/i;

interface Anchor { href: URL; text: string }

function anchors(html: string, base: URL): Anchor[] {
  const out: Anchor[] = [];
  const re = /<a\b[^>]*?href\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && out.length < 600) {
    const raw = (m[1] ?? m[2] ?? "").trim();
    if (!raw || /^(#|mailto:|tel:|javascript:)/i.test(raw)) continue;
    let href: URL;
    try { href = new URL(raw.replace(/&amp;/g, "&"), base); } catch { continue; }
    if (href.protocol !== "https:" && href.protocol !== "http:") continue;
    const text = m[3].replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
    out.push({ href, text });
  }
  return out;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_INDEX: Record<string, number> = { monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6 };

// "Mon-Fri 12:00-22:00; Sat 11:00-23:00" from schema.org openingHoursSpecification / openingHours.
function formatHours(specs: { days: number[]; opens: string; closes: string }[]): string {
  const groups = new Map<string, number[]>();
  for (const s of specs) {
    const key = `${s.opens.slice(0, 5)}\u2013${s.closes.slice(0, 5)}`;
    groups.set(key, [...(groups.get(key) ?? []), ...s.days]);
  }
  // A day listed with two different times (several branches, or inconsistent data): don't guess.
  const seen = new Set<number>();
  for (const days of groups.values()) for (const d of new Set(days)) { if (seen.has(d)) return ""; seen.add(d); }
  const parts: string[] = [];
  for (const [times, days] of groups) {
    const sorted = [...new Set(days)].sort((a, b) => a - b);
    const ranges: string[] = [];
    for (let i = 0; i < sorted.length; ) {
      let j = i;
      while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
      ranges.push(j - i >= 2 ? `${DAYS[sorted[i]]}\u2013${DAYS[sorted[j]]}` : sorted.slice(i, j + 1).map((d) => DAYS[d]).join(", "));
      i = j + 1;
    }
    parts.push(`${ranges.join(", ")} ${times}`);
  }
  return parts.join("; ");
}

interface HoursPlace { postcode: string; specs: { days: number[]; opens: string; closes: string }[] }

const POSTCODE = /\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b/i;
export function postcodeOf(text: string | undefined | null): string {
  const m = POSTCODE.exec(text ?? "");
  return m ? `${m[1]}${m[2]}`.toUpperCase() : "";
}

// The hours for the branch at `postcode`; with no postcode, only when the site has one unambiguous set.
export function hoursFor(places: HoursPlace[], postcode: string): string | undefined {
  if (postcode) {
    const match = places.find((p) => p.postcode === postcode);
    return match ? formatHours(match.specs).slice(0, 200) || undefined : undefined;
  }
  const sets = [...new Set(places.map((p) => formatHours(p.specs)).filter(Boolean))];
  return sets.length === 1 ? sets[0].slice(0, 200) : undefined;
}

export function jsonLdUrls(html: string): { menu?: string; sameAs: string[]; places: HoursPlace[] } {
  const sameAs: string[] = [];
  const places: HoursPlace[] = [];
  let menu: string | undefined;
  const re = /<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const walk = (n: unknown): void => {
        if (Array.isArray(n)) return n.forEach(walk);
        if (!n || typeof n !== "object") return;
        const o = n as Record<string, unknown>;
        for (const k of ["hasMenu", "menu"]) if (typeof o[k] === "string" && /^https?:/i.test(o[k] as string)) menu ??= o[k] as string;
        const spec = o.openingHoursSpecification;
        const specs: HoursPlace["specs"] = [];
        for (const sp of Array.isArray(spec) ? spec : spec ? [spec] : []) {
          const x = sp as Record<string, unknown>;
          const dow = (Array.isArray(x.dayOfWeek) ? x.dayOfWeek : [x.dayOfWeek]).map((d) => DAY_INDEX[String(d).split("/").pop()!.toLowerCase()]).filter((d) => d !== undefined);
          if (dow.length && typeof x.opens === "string" && typeof x.closes === "string") specs.push({ days: dow, opens: x.opens, closes: x.closes });
        }
        if (specs.length) {
          const addr = o.address as Record<string, unknown> | string | undefined;
          const pc = typeof addr === "string" ? addr : typeof addr?.postalCode === "string" ? addr.postalCode : "";
          places.push({ postcode: postcodeOf(pc), specs });
        }
        if (Array.isArray(o.sameAs)) for (const s of o.sameAs) if (typeof s === "string") sameAs.push(s);
        if (typeof o.sameAs === "string") sameAs.push(o.sameAs);
        for (const v of Object.values(o)) if (v && typeof v === "object") walk(v);
      };
      walk(JSON.parse(m[1]));
    } catch { /* ignore bad JSON-LD */ }
  }
  return { menu, sameAs, places };
}

function pick(found: Map<LinkKind, string>, kind: LinkKind, url: URL | string) {
  if (found.has(kind)) return;
  const u = typeof url === "string" ? url : url.toString();
  if (u.length > 300) return;
  found.set(kind, u.replace(/^http:\/\//i, "https://"));
}

export async function findSiteLinks(websiteOrDomain: string, address?: string): Promise<CardLink[]> {
  let host = websiteOrDomain.trim();
  try { host = new URL(/^[a-z]+:\/\//i.test(host) ? host : `https://${host}`).hostname; } catch { /* keep */ }
  const domain = normalizeDomain(host);
  if (!domain) return [];
  const page = await safeFetch(`https://${domain}/`);
  if (!page || !(page.res.headers.get("content-type") ?? "").includes("text/html")) return [];
  const buf = await readLimited(page.res, MAX_HTML);
  if (!buf) return [];
  const html = buf.toString("utf8");
  const base = page.url;
  const siteHost = base.hostname.replace(/^www\./, "");
  const found = new Map<LinkKind, string>();

  const ld = jsonLdUrls(html);
  for (const s of ld.sameAs) {
    try {
      const u = new URL(s);
      if (/(^|\.)tripadvisor\./i.test(u.hostname)) pick(found, "tripadvisor", u);
    } catch { /* ignore */ }
  }
  if (ld.menu) pick(found, "menu", ld.menu);

  for (const { href, text } of anchors(html, base)) {
    const h = href.hostname.replace(/^www\./, "");
    const path = href.pathname.toLowerCase();
    const t = text.toLowerCase();
    const same = h === siteHost;
    // A link back to the homepage itself (or a section of it) is not a menu or booking page.
    if (same && (path === "/" || path === "")) continue;
    if (/(^|\.)tripadvisor\./i.test(h)) pick(found, "tripadvisor", href);
    else if (/(^|\.)g\.page$/i.test(h) || (/(^|\.)google\.[a-z.]+$/i.test(h) && /\/(maps\/.*review|local\/writereview)/.test(path))) pick(found, "google_review", href);
    else if (BOOK_HOSTS.test(h)) pick(found, "book_table", href);
    else if (ROOM_HOSTS.test(h)) pick(found, "book_room", href);
    else if (APPT_HOSTS.test(h)) pick(found, "appointment", href);
    else if (ORDER_HOSTS.test(h)) pick(found, "order", href);
    else if (same) {
      if (/^(book(ing)?s?( a)? ?table|reserve( a table)?|reservations?|book online)$/.test(t) || /\/(reservations?|book-a-table|booking)\/?$/.test(path)) pick(found, "book_table", href);
      else if (/^(book (a )?room|rooms? (&|and) rates|check availability)$/.test(t)) pick(found, "book_room", href);
      else if ((t.includes("menu") && t.length <= 30 && !/gift|cookie|privacy|vouchers?/.test(t)) || /^\/(menus?|food-and-drink|our-menu)\/?$/.test(path) || /menu[^/]*\.pdf$/.test(path)) pick(found, "menu", href);
      else if (/^(order( online| now)?|takeaway|click (&|and) collect)$/.test(t) || /\/(order|order-online)\/?$/.test(path)) pick(found, "order", href);
      else if (/^(shop|online shop|store|shop online)$/.test(t) || /\/(shop|store)\/?$/.test(path)) pick(found, "shop", href);
    }
  }
  // Opening hours: the homepage's structured data, then up to two same-site branch/contact pages.
  const postcode = postcodeOf(address);
  const places = [...ld.places];
  let hours = hoursFor(places, postcode);
  if (!hours) {
    const pages = anchors(html, base)
      .filter(({ href, text }) => href.hostname.replace(/^www\./, "") === siteHost && /(locations?|restaurants?|branches|find[- ]us|contact|visit)/i.test(`${text} ${href.pathname}`))
      .map(({ href }) => href.toString()).filter((u, i, a) => a.indexOf(u) === i).slice(0, 2);
    for (const u of pages) {
      const more = await safeFetch(u);
      if (!more || !(more.res.headers.get("content-type") ?? "").includes("text/html")) continue;
      const b = await readLimited(more.res, MAX_HTML);
      if (b) places.push(...jsonLdUrls(b.toString("utf8")).places);
      hours = hoursFor(places, postcode);
      if (hours) break;
    }
  }
  if (hours) found.set("hours", hours);

  return sanitizeLinks([...found].map(([kind, value]) => ({ kind, label: "", value })));
}
