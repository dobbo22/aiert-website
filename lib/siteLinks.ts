// Finds the booking, menu, ordering, shop and review links a business already
// publishes on its own website, so TapCard can offer to add them to the card.
// Only links the page itself contains (nothing guessed or invented); the owner
// ticks which to keep.
import { normalizeDomain, readLimited, safeFetch } from "@/lib/siteIcon";
import { findReviewLinks } from "@/lib/reviewLookup";
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

interface HoursPlace { postcode: string; street: string; name: string; phone: string; addressText: string; label: string; specs: { days: number[]; opens: string; closes: string }[]; hoursText?: string }

function placeHours(p: HoursPlace): string {
  return (p.hoursText ?? formatHours(p.specs)).slice(0, 200);
}

const POSTCODE = /\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b/i;
export function postcodeOf(text: string | undefined | null): string {
  const m = POSTCODE.exec(text ?? "");
  return m ? `${m[1]}${m[2]}`.toUpperCase() : "";
}

const ABBREV: Record<string, string> = { st: "street", rd: "road", ave: "avenue", av: "avenue", ln: "lane", pl: "place", sq: "square", gdns: "gardens", cres: "crescent", dr: "drive", ct: "court", pk: "park", hse: "house" };
// "7 Boundary St," -> "7 boundary street" so a card's address and a website's streetAddress compare equal.
export function addressKey(text: string | undefined | null): string {
  return (text ?? "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean).map((w) => ABBREV[w] ?? w).join(" ");
}

// This card's branch on a multi-branch site: same postcode, else same street address, else a branch name that
// appears in the card's name/address and nowhere else. With nothing to go on, only a site with a single place.
export function matchPlace(places: HoursPlace[], postcode: string, address = ""): HoursPlace | undefined {
  const key = addressKey(address);
  // One place on the whole site: that is the one, unless the card's postcode says it is somewhere else.
  if (places.length === 1 && (!postcode || !places[0].postcode || places[0].postcode === postcode)) return places[0];
  if (postcode || key) {
    const byPostcode = postcode ? places.find((p) => p.postcode && p.postcode === postcode) : undefined;
    if (byPostcode) return byPostcode;
    const byStreet = key ? places.find((p) => p.street.length >= 6 && (` ${key} `).includes(` ${p.street} `)) : undefined;
    if (byStreet) return byStreet;
    const byName = key ? places.filter((p) => p.name.length >= 4 && (` ${key} `).includes(` ${p.name} `)) : [];
    return byName.length === 1 ? byName[0] : undefined;
  }
  const sets = new Set(places.map((p) => placeHours(p)).filter(Boolean));
  return sets.size === 1 ? places[0] : undefined;
}

const DAY_WORDS = /\b(mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)[a-z]*\b/i;
const TIME = /\d{1,2}[:.]\d{2}|\d{1,2}\s?(am|pm)\b/i;
const TITLE_DAY: Record<string, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };

function decodeEntities(t: string): string {
  return t.replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/&rsquo;|&#8217;/g, "\u2019").replace(/&#x27;|&#39;/g, "'").replace(/&ndash;|&#8211;/g, "\u2013").replace(/&[a-z]+;/g, " ");
}

function pageLines(html: string): string[] {
  const t = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, "").replace(/<(br|\/p|\/div|\/h\d|\/li|\/tr|\/span)[^>]*>/gi, "\n").replace(/<[^>]+>/g, " ");
  return decodeEntities(t).split("\n").map((l) => l.replace(/[\s\u200b]+/g, " ").trim()).filter(Boolean);
}

// "MON - THU     11:30 - 15:00 / 17:30 - 22:30" -> "Mon\u2013Thu 11:30\u201315:00 / 17:30\u201322:30"
function tidyHoursLine(line: string): string {
  return line
    .replace(new RegExp(DAY_WORDS.source, "gi"), (w) => TITLE_DAY[w.toLowerCase().slice(0, 3)] ?? w)
    .replace(/\s*[-\u2013\u2014]\s*/g, "\u2013").replace(/\s+/g, " ").replace(/\s*&\s*/g, " & ").trim();
}

// A site with no structured data but a plain "Find us / Opening hours" block: one address, one phone, one set of
// hours. Only used when the page has exactly one such block, so a wrong branch is never guessed.
export function textPlace(html: string): HoursPlace | null {
  const lines = pageLines(html);
  const hIdx = lines.findIndex((l) => /^(opening|opening times|opening hours|hours|our hours|trading hours)\b[^a-z0-9]*$/i.test(l.replace(/[:\s]+$/, "")) || /^opening (hours|times)\b/i.test(l));
  if (hIdx < 0) return null;
  const hoursLines: string[] = [];
  for (let k = hIdx + 1; k < Math.min(lines.length, hIdx + 12); k++) {
    if (DAY_WORDS.test(lines[k]) && TIME.test(lines[k]) && lines[k].length < 90) hoursLines.push(tidyHoursLine(lines[k]));
    else if (hoursLines.length) break;
  }
  if (!hoursLines.length) return null;
  // The address: the nearest preceding line that has a UK postcode and is not a company/registered-office line.
  let addr = "", addrIdx = -1;
  for (let k = hIdx - 1; k >= Math.max(0, hIdx - 12); k--) {
    if (POSTCODE.test(lines[k]) && !/registered|limited|ltd|plc|\u00a9|copyright/i.test(lines[k]) && lines[k].length < 140) { addr = lines[k]; addrIdx = k; break; }
  }
  let phone = "";
  for (let k = Math.max(0, hIdx - 12); k < hIdx; k++) {
    const m = /(?:\+44\s?|\b0)\d[\d\s()]{8,13}\d/.exec(lines[k]);
    if (m) { phone = m[0].replace(/\s+/g, " ").trim().slice(0, 40); break; }
  }
  return { postcode: postcodeOf(addr), street: "", name: "", phone, addressText: addr.slice(0, 200), label: "", specs: [], hoursText: hoursLines.join("; ") };
}

const PHONE_RE = /(?:\+44\s?|\b0)\d[\d\s()]{8,13}\d/;

// Every address block on a plain page (header, footer, contact block): the lines leading up to a UK postcode, plus the
// phone number right after it. A site with two shops lists two; the person is then asked which is theirs.
export function textPlaces(html: string): HoursPlace[] {
  const lines = pageLines(html);
  const withHours = textPlace(html);
  const out: HoursPlace[] = [];
  const seen = new Set<string>();
  lines.forEach((line, i) => {
    if (!POSTCODE.test(line) || /registered|limited|ltd|plc|\u00a9|copyright/i.test(line) || line.length > 140) return;
    const postcode = postcodeOf(line);
    if (!postcode || seen.has(postcode)) return;
    const block: string[] = [];
    // The postcode line may also carry the town ("Great Dunmow CM6 1AG"); the lines above it are the street and name.
    for (let k = i - 1; k >= Math.max(0, i - 4); k--) {
      const l = lines[k];
      if (l.length > 70 || PHONE_RE.test(l) || /@|^(contact|find us|visit|address|opening)/i.test(l) || (DAY_WORDS.test(l) && TIME.test(l))) break;
      block.unshift(l);
    }
    // Lines that are only the county ("Essex") belong to the address; a lone nav word ("Home") does not.
    const text = [...block, line].join(", ").replace(/,\s*,/g, ",");
    if (block.length === 0 && line.replace(POSTCODE, "").trim().length < 3) return;
    let phone = "";
    for (let k = i; k <= Math.min(lines.length - 1, i + 3); k++) {
      const m = PHONE_RE.exec(lines[k]);
      if (m) { phone = m[0].replace(/\s+/g, " ").trim().slice(0, 40); break; }
    }
    seen.add(postcode);
    const hours = withHours && withHours.postcode === postcode ? withHours : null;
    out.push({
      postcode, street: "", name: "", phone, addressText: text.slice(0, 200), label: block[0] ?? "", specs: [],
      hoursText: hours?.hoursText,
    });
  });
  // The old single-block result still wins when there is only one address on the page.
  if (out.length <= 1) return withHours ? [withHours] : out;
  return out;
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
          const street = typeof addr === "object" && typeof addr?.streetAddress === "string" ? addressKey(addr.streetAddress) : "";
          const text = typeof addr === "object" && addr
            ? [addr.streetAddress, addr.addressLocality, addr.postalCode].filter((x) => typeof x === "string" && x).join(", ")
            : typeof addr === "string" ? addr : "";
          places.push({
            postcode: postcodeOf(pc), street, name: addressKey(typeof o.name === "string" ? o.name : ""),
            phone: typeof o.telephone === "string" ? o.telephone.slice(0, 40) : "", addressText: text.slice(0, 200),
            label: typeof o.name === "string" ? o.name.slice(0, 60) : "", specs,
          });
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

export interface SiteDetails { address?: string; phone?: string; facebook?: string; instagram?: string; twitter?: string; linkedin?: string; tiktok?: string }

type Social = "facebook" | "instagram" | "twitter" | "linkedin" | "tiktok";

// The business's own profile from a link on its site (never a share button or a generic page).
export function socialOf(u: URL): { kind: Social; url: string } | null {
  const host = u.hostname.toLowerCase().replace(/^(www|m|mobile)\./, "");
  const segs = u.pathname.split("/").filter(Boolean);
  const first = segs[0]?.toLowerCase() ?? "";
  if (!first) return null;
  const clean = (kind: Social, base: string, path: string) => ({ kind, url: `${base}${path}`.replace(/\/+$/, "") });
  if (/^facebook\.com$|^fb\.com$/.test(host)) {
    if (/^(sharer|sharer\.php|share|dialog|plugins|tr|login|policies|help|groups|events|watch|hashtag|l\.php)$/.test(first) || /\.php$/.test(first)) return null;
    if (first === "profile.php") return u.searchParams.get("id") ? { kind: "facebook", url: `https://www.facebook.com/profile.php?id=${encodeURIComponent(u.searchParams.get("id")!)}` } : null;
    return clean("facebook", "https://www.facebook.com", `/${segs[0]}${first === "pages" && segs[1] ? `/${segs.slice(1, 3).join("/")}` : ""}`);
  }
  if (/^instagram\.com$/.test(host)) {
    if (/^(p|reel|reels|explore|accounts|stories|tv|direct)$/.test(first)) return null;
    return clean("instagram", "https://www.instagram.com", `/${segs[0]}`);
  }
  // Some sites link to odd twitter domains (twitter.co.uk); the handle is what matters.
  if (/^(twitter\.[a-z.]+|x\.com)$/.test(host)) {
    if (/^(intent|share|home|search|hashtag|i|login|settings|tos|privacy)$/.test(first)) return null;
    return clean("twitter", "https://x.com", `/${segs[0].replace(/^@/, "")}`);
  }
  if (/^tiktok\.com$/.test(host)) {
    return first.startsWith("@") && first.length > 1 ? clean("tiktok", "https://www.tiktok.com", `/${segs[0]}`) : null;
  }
  if (/^linkedin\.com$/.test(host)) {
    if (!/^(company|in|school)$/.test(first) || !segs[1]) return null;
    return clean("linkedin", "https://www.linkedin.com", `/${segs[0]}/${segs[1]}`);
  }
  return null;
}
export interface SiteBranch { name: string; address: string; phone: string; hours: string }

// `address` is whatever the card has so far; `name` is the card's name (e.g. "Dishoom Shoreditch"), used to pick the branch.
export async function findSiteLinks(websiteOrDomain: string, address?: string, name?: string): Promise<{ links: CardLink[]; details: SiteDetails; branches: SiteBranch[] }> {
  let host = websiteOrDomain.trim();
  try { host = new URL(/^[a-z]+:\/\//i.test(host) ? host : `https://${host}`).hostname; } catch { /* keep */ }
  const domain = normalizeDomain(host);
  if (!domain) return { links: [], details: {}, branches: [] };
  const page = await safeFetch(`https://${domain}/`);
  if (!page || !(page.res.headers.get("content-type") ?? "").includes("text/html")) return { links: [], details: {}, branches: [] };
  const buf = await readLimited(page.res, MAX_HTML);
  if (!buf) return { links: [], details: {}, branches: [] };
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
  const social: Partial<Record<Social, string>> = {};
  const addSocial = (u: URL) => { const f = socialOf(u); if (f && !social[f.kind]) social[f.kind] = f.url; };
  for (const s of ld.sameAs) { try { addSocial(new URL(s)); } catch { /* ignore */ } }

  for (const { href, text } of anchors(html, base)) {
    addSocial(href);
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
      else if (/^(shop|online shop|store|shop online|web ?shop|our (online )?shop|shop now|buy online|buy now|order flowers|send flowers|buy flowers|order a bouquet|order your flowers)$/.test(t) || /\/(shop|store|order-flowers|send-flowers|buy-flowers)(\.html?)?\/?$/.test(path)) pick(found, "shop", href);
    }
  }
  // Opening hours: the homepage's structured data, then up to two same-site branch/contact pages.
  const where = `${name ?? ""} ${address ?? ""}`;
  const postcode = postcodeOf(address);
  const places = [...ld.places];
  if (!places.length) places.push(...textPlaces(html));
  let place = matchPlace(places, postcode, where);
  let hours = place ? placeHours(place) || undefined : undefined;
  if (!hours) {
    const pages = anchors(html, base)
      .filter(({ href, text }) => href.hostname.replace(/^www\./, "") === siteHost && /(locations?|restaurants?|branches|find[- ]us|contact|visit)/i.test(`${text} ${href.pathname}`))
      .map(({ href }) => href.toString()).filter((u, i, a) => a.indexOf(u) === i).slice(0, 2);
    for (const u of pages) {
      const more = await safeFetch(u);
      if (!more || !(more.res.headers.get("content-type") ?? "").includes("text/html")) continue;
      const b = await readLimited(more.res, MAX_HTML);
      if (b) {
        const text = b.toString("utf8");
        const more2 = jsonLdUrls(text).places;
        if (more2.length) places.push(...more2);
        else {
          // A plain contact page: its hours belong to the address beside them (same postcode), else it is a new place.
          for (const tp of textPlaces(text)) {
            const same = places.find((x) => x.postcode && x.postcode === tp.postcode);
            if (same) { if (tp.hoursText && !same.hoursText && !same.specs.length) same.hoursText = tp.hoursText; }
            else if (!places.length || tp.hoursText) places.push(tp);
          }
        }
      }
      place = matchPlace(places, postcode, where);
      hours = place ? placeHours(place) || undefined : undefined;
      if (hours) break;
    }
  }
  if (hours) found.set("hours", hours);
  const details: SiteDetails = { ...social };
  if (place && (hours || place.addressText)) {
    if (place.addressText) details.address = place.addressText;
    if (place.phone) details.phone = place.phone;
  }

  // No confident match on a multi-branch site: let the person pick (a few branches whose name or town matches
  // what they typed first, then the rest), so a wrong guess is never filled in.
  let branches: SiteBranch[] = [];
  if (!place && places.length > 1) {
    const key = addressKey(where);
    const seenNames = new Set<string>();
    const all = places.filter((p) => (p.label || p.addressText) && !seenNames.has(p.addressText || p.label) && !!seenNames.add(p.addressText || p.label));
    const near = (p: HoursPlace) => (key && p.addressText && addressKey(p.addressText).split(" ").some((w) => w.length >= 4 && ` ${key} `.includes(` ${w} `)) ? 0 : 1);
    branches = all.sort((a, b) => near(a) - near(b)).slice(0, 40).map((p) => ({
      name: p.label || p.addressText, address: p.label ? p.addressText : "", phone: p.phone, hours: placeHours(p),
    }));
  }
  // Reviews the site itself doesn't link to: ask Google / Tripadvisor by name and address (needs the API keys).
  if ((name || address) && (!found.has("google_review") || !found.has("tripadvisor"))) {
    const reviews = await findReviewLinks(name ?? "", address ?? details.address ?? "").catch(() => ({}) as { google?: string; tripadvisor?: string });
    if (reviews.google && !found.has("google_review")) found.set("google_review", reviews.google);
    if (reviews.tripadvisor && !found.has("tripadvisor")) found.set("tripadvisor", reviews.tripadvisor);
  }
  return { links: sanitizeLinks([...found].map(([kind, value]) => ({ kind, label: "", value }))), details, branches };
}
