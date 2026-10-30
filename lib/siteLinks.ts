// Finds the booking, menu, ordering, shop and review links a business already
// publishes on its own website, so TapCard can offer to add them to the card.
// Only links the page itself contains (nothing guessed or invented); the owner
// ticks which to keep.
import { fetchHomePage, normalizeDomain, readLimited, safeFetch } from "@/lib/siteIcon";
import { findReviewLinks } from "@/lib/reviewLookup";
import { sanitizeLinks, type CardLink, type LinkKind } from "@/lib/tapcardLinks";

const MAX_HTML = 2 * 1024 * 1024;

const BOOK_HOSTS = /(^|\.)(opentable\.[a-z.]+|resy\.com|sevenrooms\.com|exploretock\.com|tock\.com|thefork\.[a-z.]+|quandoo\.[a-z.]+|resdiary\.com|bookatable\.[a-z.]+|designmynight\.com|tablein\.com|bookingbug\.com)$/i;
const ROOM_HOSTS = /(^|\.)(booking\.com|synxis\.com|littlehotelier\.com|thebookingbutton\.[a-z.]+)$/i;
const APPT_HOSTS = /(^|\.)(fresha\.com|treatwell\.[a-z.]+|calendly\.com|setmore\.com|square\.site|acuityscheduling\.com|simplybook\.me)$/i;
const ORDER_HOSTS = /(^|\.)(deliveroo\.[a-z.]+|ubereats\.com|just-eat\.[a-z.]+|justeat\.[a-z.]+|toasttab\.com|order\.online|orderyoyo\.com|foodhub\.[a-z.]+)$/i;

interface Anchor { href: URL; text: string; /** Where the link is in the page, to tell which branch's section it belongs to. */ at: number }

function anchors(html: string, base: URL): Anchor[] {
  const out: Anchor[] = [];
  const re = /<a\b[^>]*?href\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && out.length < 600) {
    const raw = (m[1] ?? m[2] ?? "").trim();
    if (!raw || /^(#|mailto:|tel:|javascript:)/i.test(raw)) continue;
    // "instagram.com/name" with no https:// would otherwise be read as a page on the business's own site.
    const fixed = /^(www\.)?(facebook|instagram|twitter|x|linkedin|tiktok)\.(com|co\.uk)\//i.test(raw) ? `https://${raw}` : raw;
    let href: URL;
    try { href = new URL(fixed.replace(/&(amp|#0*38);/g, "&"), base); } catch { continue; }
    if (href.protocol !== "https:" && href.protocol !== "http:") continue;
    const text = m[3].replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
    out.push({ href, text, at: m.index });
  }
  return out;
}

/// Cloudflare hides an address on a page as a hex string: the first byte is a key, and each later byte is the key XOR a letter.
function decodeCloudflareEmail(hex: string): string | null {
  if (!/^[0-9a-f]{6,}$/i.test(hex) || hex.length % 2) return null;
  const key = parseInt(hex.slice(0, 2), 16);
  let out = "";
  for (let i = 2; i < hex.length; i += 2) out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
  return out;
}

/// First tel: and mailto: addresses on the page (a plain contact link the visitor can tap).
function contactLinks(html: string, domain: string): { phone?: string; email?: string } {
  const phones: string[] = [], emails: string[] = [];
  const re = /<a\b[^>]*?href\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && (phones.length < 4 || emails.length < 4)) {
    const raw = decodeURIComponent((m[1] ?? m[2] ?? "").trim().replace(/&amp;/g, "&"));
    if (/^tel:/i.test(raw)) phones.push(raw.slice(4).replace(/[^+\d\s()-]/g, "").trim());
    else if (/^mailto:/i.test(raw)) emails.push(raw.slice(7).split("?")[0].trim().toLowerCase());
    else if (/\/cdn-cgi\/l\/email-protection#/i.test(raw)) { const e = decodeCloudflareEmail(raw.split("#")[1] ?? ""); if (e) emails.push(e.trim().toLowerCase()); }
  }
  // Cloudflare's other form: <a class="__cf_email__" data-cfemail="...">[email protected]</a>
  for (const m2 of html.matchAll(/data-cfemail\s*=\s*["']([0-9a-f]+)["']/gi)) { const e = decodeCloudflareEmail(m2[1]); if (e && emails.length < 8) emails.push(e.trim().toLowerCase()); }
  const email = emails.find((e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.endsWith(`@${domain}`)) ?? emails.find((e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e));
  return { phone: phones.find((p) => p.replace(/\D/g, "").length >= 9), email };
}

/// A street address as it should print on a card: web-page furniture ("Read more,", "Find us:", "Address:") and a leading
/// company-name part ("Hobart Capital Markets LLP,") are dropped when a street or postcode follows, and a trailing full stop.
export function tidyAddress(raw: string): string {
  const parts = raw.replace(/\s+/g, " ").trim().split(",").map((p) => p.trim()).filter(Boolean);
  const isPlace = (p: string) => /\d/.test(p) || /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i.test(p);
  const junk = /^(read more|learn more|find us|find us here|visit us|contact us|contact|our address|address|head office|registered office|where to find us|get directions|directions)\b[:\s-]*$/i;
  const company = /\b(llp|ltd|limited|plc|inc|llc|lp)\b\.?$/i;
  while (parts.length > 1 && parts.slice(1).some(isPlace) && !isPlace(parts[0]) && (junk.test(parts[0]) || company.test(parts[0]))) parts.shift();
  return parts.join(", ").replace(/^(address|find us|visit us)\s*:\s*/i, "").replace(/[.\s]+$/, "").slice(0, 200);
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_INDEX: Record<string, number> = { monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6 };

// "Mon-Fri 12:00-22:00; Sat 11:00-23:00" from schema.org openingHoursSpecification / openingHours.
export function formatHours(specs: { days: number[]; opens: string; closes: string }[]): string {
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
  // A postcode that differs only in its last letter (W9 2PA on the site, W9 2PB on the map listing) is the same street: map providers are often one unit off.
  const nearPostcode = (a: string, b: string) => a === b || (a.length >= 5 && b.length >= 5 && a.slice(0, -1) === b.slice(0, -1));
  if (places.length === 1 && (!postcode || !places[0].postcode || nearPostcode(places[0].postcode, postcode))) return places[0];
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

// A page that sets a day on one line and its times on the next ("Saturday" / "09:00 - 23:00") reads as one line ("Saturday 09:00 - 23:00").
function joinDayAndTimes(lines: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i], next = lines[i + 1];
    if (next !== undefined && l.length < 30 && DAY_WORDS.test(l) && !TIME.test(l) && !/\bclosed\b/i.test(l) && TIME.test(next) && !DAY_WORDS.test(next) && next.length < 40) {
      out.push(`${l} ${next}`);
      i++;
    } else out.push(l);
  }
  return out;
}

// A site with no structured data but a plain "Find us / Opening hours" block: one address, one phone, one set of
// hours. Only used when the page has exactly one such block, so a wrong branch is never guessed.
export function textPlace(html: string): HoursPlace | null {
  const lines = joinDayAndTimes(pageLines(html));
  const hIdx = lines.findIndex((l) => /^(opening|opening times|opening hours|hours|our hours|trading hours)\b[^a-z0-9]*$/i.test(l.replace(/[:\s]+$/, "")) || /^opening (hours|times)\b/i.test(l));
  const hoursLines: string[] = [];
  let anchorIdx = hIdx;
  if (hIdx >= 0) {
    for (let k = hIdx + 1; k < Math.min(lines.length, hIdx + 12); k++) {
      if (DAY_WORDS.test(lines[k]) && TIME.test(lines[k]) && lines[k].length < 90) hoursLines.push(tidyHoursLine(lines[k]));
      else if (DAY_WORDS.test(lines[k]) && /\bclosed\b/i.test(lines[k]) && lines[k].length < 90) continue; // a closed day is left out
      else if (hoursLines.length) break;
    }
  } else {
    // No "Opening hours" heading: a single line like "Monday-Friday: 8am-5pm, Saturday 8am-4.30pm".
    anchorIdx = lines.findIndex((l) => l.length < 110 && DAY_WORDS.test(l) && TIME.test(l) && !/delivery|collection|turnaround|pick ?up/i.test(l));
    if (anchorIdx >= 0) {
      // A week set out one day (or run of days) per line: take the whole run of lines, not just the first. A day that is closed has no times, so
      // it is left out (the apps read a missing day as closed).
      const dayLine = (l: string) => l.length < 90 && DAY_WORDS.test(l) && (TIME.test(l) || /\bclosed\b/i.test(l));
      let start = anchorIdx, end = anchorIdx;
      while (start > 0 && dayLine(lines[start - 1])) start--;
      while (end + 1 < lines.length && dayLine(lines[end + 1])) end++;
      for (let k = start; k <= end; k++) if (TIME.test(lines[k])) hoursLines.push(tidyHoursLine(lines[k]));
    }
  }
  if (!hoursLines.length) return null;
  const hIdxUsed = anchorIdx;
  // The address: the nearest preceding line that has a UK postcode and is not a company/registered-office line.
  let addr = "", addrIdx = -1;
  for (let k = hIdxUsed - 1; k >= Math.max(0, hIdxUsed - 12); k--) {
    if (POSTCODE.test(lines[k]) && !/registered|limited|ltd|plc|\u00a9|copyright/i.test(lines[k]) && lines[k].length < 140) { addr = lines[k]; addrIdx = k; break; }
  }
  let phone = "";
  for (let k = Math.max(0, hIdxUsed - 12); k < hIdxUsed; k++) {
    const m = /(?:\+44\s?|\b0)\d[\d\s()]{8,13}\d/.exec(lines[k]);
    if (m) { phone = m[0].replace(/\s+/g, " ").trim().slice(0, 40); break; }
  }
  return { postcode: postcodeOf(addr), street: "", name: "", phone, addressText: tidyAddress(addr), label: "", specs: [], hoursText: hoursLines.join("; ") };
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
    // The postcode line may also carry the town ("Anytown AB1 2CD"); the lines above it are the street and name.
    for (let k = i - 1; k >= Math.max(0, i - 4); k--) {
      const l = lines[k];
      if (l.length > 70 || PHONE_RE.test(l) || /@|^(contact|find us|visit|address|opening)/i.test(l) || (DAY_WORDS.test(l) && TIME.test(l))) break;
      block.unshift(l);
    }
    // Lines that are only the county ("Essex") belong to the address; a lone nav word ("Home") does not.
    // A block labelled "Registered address / office" is the company's paperwork address, not a place customers go.
    if (block.some((l) => /registered|head office|company number/i.test(l))) return;
    // Emoji and bare labels ("Address:", "Find us") are not part of the address.
    const cleaned = block.map((l) => l.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\uFE0F]/gu, "").trim()).filter((l) => /[A-Za-z0-9]/.test(l) && !/^(address|our address|find us|visit us|where to find us|location)\s*:?$/i.test(l));
    const text = [...cleaned, line].join(", ").replace(/,\s*,/g, ",");
    if (block.length === 0 && line.replace(POSTCODE, "").trim().length < 3) return;
    let phone = "";
    for (let k = i; k <= Math.min(lines.length - 1, i + 3); k++) {
      const m = PHONE_RE.exec(lines[k]);
      if (m) { phone = m[0].replace(/\s+/g, " ").trim().slice(0, 40); break; }
    }
    seen.add(postcode);
    const hours = withHours && withHours.postcode === postcode ? withHours : null;
    out.push({
      postcode, street: "", name: "", phone, addressText: tidyAddress(text), label: cleaned[0] ?? "", specs: [],
      hoursText: hours?.hoursText,
    });
  });
  // One address on the page: it takes the page's hours. None found (no postcode line): the hours place stands alone.
  if (out.length === 1 && withHours) return [{ ...out[0], hoursText: withHours.hoursText ?? out[0].hoursText, phone: out[0].phone || withHours.phone }];
  if (out.length === 0) return withHours ? [withHours] : [];
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
            phone: typeof o.telephone === "string" ? o.telephone.slice(0, 40) : "", addressText: tidyAddress(text),
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

const GENERIC = new Set(["locations", "location", "contact", "find", "visit", "address", "restaurant", "restaurants", "london", "street", "road", "lane", "avenue", "the", "and", "ltd", "limited", "cafe", "bar", "kitchen", "takeaway", "order", "online", "with", "from"]);
/// Of the ordering links on a site's delivery page, the one for this branch: the link whose address, or the heading beside it, names the branch's
/// town or street ("chakra-little-venice" beside "Little Venice"). One link alone is taken; several with no clear winner give nothing, because
/// another branch's link is worse than none.
export function bestOrderLink(cands: { url: string; context: string }[], where: string): string | null {
  if (cands.length === 0) return null;
  if (cands.length === 1) return cands[0].url;
  const tokens = [...new Set(where.toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 4 && !GENERIC.has(w)))];
  const scored = cands.map((c) => {
    let hay = c.context.toLowerCase();
    try { hay += ` ${decodeURIComponent(new URL(c.url).pathname).toLowerCase().replace(/[-_/]+/g, " ")}`; } catch { /* ignore */ }
    return { url: c.url, score: tokens.filter((t) => hay.includes(t)).length };
  }).sort((a, b) => b.score - a.score);
  return scored[0].score > 0 && scored[0].score > scored[1].score ? scored[0].url : null;
}

function pick(found: Map<LinkKind, string>, kind: LinkKind, url: URL | string) {
  if (found.has(kind)) return;
  const u = typeof url === "string" ? url : url.toString();
  if (u.length > 300) return;
  found.set(kind, u.replace(/^http:\/\//i, "https://"));
}

export interface SiteDetails { address?: string; phone?: string; email?: string; facebook?: string; instagram?: string; twitter?: string; linkedin?: string; tiktok?: string }

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

// `address` is whatever the card has so far; `name` is the card's name (e.g. "Acme Cafe Shoreditch"), used to pick the branch.
// `prefetched` is the home page as a phone read it (some sites refuse requests from our servers): it is used instead of fetching it here.
// `otherPlaceOnly`: the site gives addresses, and none is anywhere near the one asked about (a map listing that points at another shop's site).
export async function findSiteLinks(websiteOrDomain: string, address?: string, name?: string, prefetched?: { html: string; url: string }): Promise<{ links: CardLink[]; details: SiteDetails; branches: SiteBranch[]; otherPlaceOnly?: boolean }> {
  let host = websiteOrDomain.trim();
  try { host = new URL(/^[a-z]+:\/\//i.test(host) ? host : `https://${host}`).hostname; } catch { /* keep */ }
  const domain = normalizeDomain(host);
  if (!domain) return { links: [], details: {}, branches: [] };
  let html: string;
  let base: URL;
  if (prefetched) {
    // Only a page of the site that was asked about counts.
    try { base = new URL(prefetched.url); } catch { return { links: [], details: {}, branches: [] }; }
    if (base.protocol !== "https:" || base.hostname.replace(/^www\./, "") !== domain.replace(/^www\./, "")) return { links: [], details: {}, branches: [] };
    html = prefetched.html.slice(0, MAX_HTML);
  } else {
    const page = await fetchHomePage(domain);
    if (!page || !(page.res.headers.get("content-type") ?? "").includes("text/html")) return { links: [], details: {}, branches: [] };
    const buf = await readLimited(page.res, MAX_HTML);
    if (!buf) return { links: [], details: {}, branches: [] };
    html = buf.toString("utf8");
    base = page.url;
  }
  const siteHost = base.hostname.replace(/^www\./, "");
  const found = new Map<LinkKind, string>();
  const extras: CardLink[] = [];
  const addExtra = (label: string, url: URL) => {
    const value = url.toString().replace(/^http:\/\//i, "https://");
    if (value.length <= 300 && !extras.some((e) => e.value === value || e.label === label)) extras.push({ kind: "custom", label, value });
  };

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

  // A page that shows several branches (each section starts with its own address): an ordering, booking or review link belongs to the branch
  // whose address comes just before it. A link in another branch's section is not this one's (Chakra Hayes's Deliveroo is not Little Venice's).
  // Only postcodes in the page's visible text count: scripts, styles and tag attributes (class names, ids) are blanked first, because a site
  // builder's code is full of strings like "QM39GH" that look like a postcode and made a real booking link seem to belong to another branch.
  const visible = html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, (m) => " ".repeat(m.length)).replace(/<[^>]*>/g, (m) => " ".repeat(m.length));
  const spots = [...visible.matchAll(/\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b/gi)].map((m) => ({ at: m.index ?? 0, pc: `${m[1]}${m[2]}`.toUpperCase() }));
  const wantPc = postcodeOf(address);
  const manyBranches = !!wantPc && new Set(spots.map((s) => s.pc)).size >= 2 && spots.some((s) => s.pc === wantPc);
  const inOtherBranch = (at: number) => {
    if (!manyBranches) return false;
    let before: { pc: string } | null = null;
    for (const s of spots) { if (s.at <= at) before = s; else break; }
    return !!before && before.pc !== wantPc;
  };

  for (const { href, text, at } of anchors(html, base)) {
    addSocial(href);
    const h = href.hostname.replace(/^www\./, "");
    const path = href.pathname.toLowerCase();
    const t = text.toLowerCase();
    const same = h === siteHost;
    // A link back to the homepage itself (or a section of it) is not a menu or booking page.
    if (same && (path === "/" || path === "")) continue;
    const thirdParty = /(^|\.)tripadvisor\./i.test(h) || BOOK_HOSTS.test(h) || ROOM_HOSTS.test(h) || APPT_HOSTS.test(h) || ORDER_HOSTS.test(h);
    if (thirdParty && inOtherBranch(at)) continue;
    if (/(^|\.)tripadvisor\./i.test(h)) pick(found, "tripadvisor", href);
    else if (/(^|\.)g\.page$/i.test(h) || (/(^|\.)google\.[a-z.]+$/i.test(h) && /\/(maps\/.*review|local\/writereview)/.test(path))) pick(found, "google_review", href);
    else if (BOOK_HOSTS.test(h)) pick(found, "book_table", href);
    else if (ROOM_HOSTS.test(h)) pick(found, "book_room", href);
    else if (APPT_HOSTS.test(h)) pick(found, "appointment", href);
    else if (ORDER_HOSTS.test(h)) pick(found, "order", href);
    else if (same) {
      if (/^(book(ing)?s?( a)? ?table|reserve( a table)?|reservations?|book online)$/.test(t) || /\/(reservations?|book-a-table|booking)\/?$/.test(path)) pick(found, "book_table", href);
      else if (/^(book (a )?room|rooms? (&|and) rates|check availability|rooms?|bedrooms?|stay( with us)?|our rooms|accommodation)$/.test(t) || /^\/(rooms?|bedrooms?|stay|accommodation|our-rooms)\/?$/.test(path)) pick(found, "book_room", href);
      else if ((t.includes("menu") && t.length <= 30 && !/gift|cookie|privacy|vouchers?/.test(t)) || /^\/(menus?|food-and-drink|our-menu)\/?$/.test(path) || /menu[^/]*\.pdf$/.test(path)) pick(found, "menu", href);
      else if (/^(order( online| now)?|takeaway|click (&|and) collect)$/.test(t) || /\/(order|order-online)\/?$/.test(path)) pick(found, "order", href);
      else if (/^(news|latest news|news (&|and) events|blog|our blog|the blog|what'?s on|events|journal|updates)$/.test(t) || /^\/(news|blog|latest-news|whats-on|events|journal)\/?$/.test(path)) addExtra("Latest news", href);
      else if (/^(prices?|pricing|price list|full price list|see (our )?prices|our prices)$/.test(t) || /^\/(pricing|prices|price-list)\/?$/.test(path)) addExtra("View prices", href);
      else if (/^(book( now| online)?|schedule( a)?( pick ?up| collection| delivery| visit)?|make a booking|book (an )?appointment|book a visit)$/.test(t) || /^\/(book|booking|bookings|book-?now|appointments?|schedule)\/?$/.test(path)) addExtra(t ? t.replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 40) : "Book now", href);
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
  // No ordering link for this branch on the homepage: the site's own Delivery / Order page, where a group lists one link per branch. The branch is
  // known by what the person gave AND by how the site itself names the place at this postcode ("Little Venice, 14 Formosa St"), since a map
  // listing often says just "Chakra".
  if (!found.has("order")) {
    const orderPages = anchors(html, base)
      .filter(({ href, text }) => href.hostname.replace(/^www\./, "") === siteHost && (/^(delivery|order( online| now| takeaway)?|takeaway|click (&|and) collect|order (&|and) collect)$/i.test(text) || /^\/(delivery|order|order-online|takeaway)[^/]*\/?$/i.test(href.pathname)))
      .map(({ href }) => href.toString()).filter((u, i, a) => a.indexOf(u) === i).slice(0, 2);
    for (const u of orderPages) {
      const more = await safeFetch(u);
      if (!more || !(more.res.headers.get("content-type") ?? "").includes("text/html")) continue;
      const b = await readLimited(more.res, MAX_HTML);
      if (!b) continue;
      const pageHtml = b.toString("utf8");
      let pageBase: URL;
      try { pageBase = new URL(more.url ?? u); } catch { continue; }
      const cands = anchors(pageHtml, pageBase)
        .filter(({ href }) => ORDER_HOSTS.test(href.hostname.replace(/^www\./, "")))
        .map(({ href, at }) => ({ url: href.toString(), context: pageHtml.slice(Math.max(0, at - 400), at).replace(/<[^>]*>/g, " ") }))
        .filter((c, i, a) => a.findIndex((x) => x.url === c.url) === i);
      const best = bestOrderLink(cands, `${name ?? ""} ${address ?? ""} ${place?.addressText ?? ""}`);
      if (best) { pick(found, "order", best); break; }
    }
  }
  const details: SiteDetails = { ...social };
  if (place && (hours || place.addressText)) {
    // A heading read in front of the address ("LOCATIONS, Little Venice, 14 Formosa St") is not part of it.
    if (place.addressText) details.address = place.addressText.replace(/^\s*(locations?|contact( us)?|find us|visit us|address|where to find us|our (restaurants?|shops?|branches))\s*[,:\-–]\s*/i, "");
    if (place.phone) details.phone = place.phone;
  }

  // A plain tel: / mailto: link: used when the page lists one place (several branches would make it a guess).
  const contact = contactLinks(html, domain);
  if (!details.phone && contact.phone && places.length <= 1) details.phone = contact.phone;
  if (!details.email && contact.email) details.email = contact.email;

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
    const reviews = await findReviewLinks(name ?? "", address ?? details.address ?? "", domain).catch(() => ({}) as { google?: string; tripadvisor?: string });
    if (reviews.google && !found.has("google_review")) found.set("google_review", reviews.google);
    if (reviews.tripadvisor && !found.has("tripadvisor")) found.set("tripadvisor", reviews.tripadvisor);
  }
  // A restaurant's plain "Book now" page is its table booking (on other kinds of business it stays a general booking link).
  const bookNow = extras.find((e) => /^book( now| online)?$/i.test(e.label.replace(/[!.]/g, "").trim()));
  const foodPlace = found.has("menu") || found.has("tripadvisor") || /restaurant|bistro|caf[eé]|trattoria|pizzeria|brasserie|grill|kitchen|tavern|osteria|bar\b|pub\b/i.test(name ?? "");
  if (bookNow && foodPlace && !found.has("book_table") && !found.has("book_room") && !found.has("appointment")) {
    found.set("book_table", bookNow.value);
    extras.splice(extras.indexOf(bookNow), 1);
  }
  const outward = (pc: string) => pc.slice(0, -3);
  const sitePcs = [...places.map((p) => p.postcode), ...spots.map((s) => s.pc)].filter(Boolean);
  const otherPlaceOnly = !!postcode && !place && sitePcs.length > 0 && !sitePcs.some((pc) => outward(pc) === outward(postcode));
  return { links: sanitizeLinks([...[...found].map(([kind, value]) => ({ kind, label: "", value })), ...extras]), details, branches, otherPlaceOnly };
}

// ---- Finding a company's other shops from its own website ----------------------------------------------------------------------------

const BRAND_STOP = new Set(["the", "and", "ltd", "limited", "plc", "co", "company", "of"]);
const HEADING_GENERIC = new Set(["florist", "florists", "flowers", "flower", "shop", "shops", "store", "stores", "branch", "contact", "us", "find", "visit", "opening", "hours", "times", "our", "about", "home", "welcome"]);
const words = (t: string) => t.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);

/// Shop blocks that are introduced by a heading with the business's name plus a place ("The Rose Garden Florists Blake End"), followed by
/// that shop's address, phone and opening hours, even when the address has no postcode. Only blocks with a phone or hours count.
export function textBranches(html: string, brand: string): HoursPlace[] {
  const lines = pageLines(html);
  const brandWords = words(brand).filter((w) => !BRAND_STOP.has(w));
  if (!brandWords.length) return [];
  const isHeading = (l: string): boolean => {
    if (l.length > 80 || l.includes("|") || PHONE_RE.test(l) || /[:@]/.test(l)) return false;
    const w = words(l);
    if (!brandWords.every((b) => w.includes(b))) return false;
    const extra = w.filter((x) => !brandWords.includes(x) && !BRAND_STOP.has(x) && !HEADING_GENERIC.has(x));
    return extra.length >= 1 && extra.length <= 4 && !/^(contact|about|find|visit|welcome|opening)/i.test(l);
  };
  const out: HoursPlace[] = [];
  const seen = new Set<string>();
  lines.forEach((line, i) => {
    if (!isHeading(line)) return;
    const block: string[] = [];
    for (let k = i + 1; k < Math.min(lines.length, i + 12); k++) {
      if (isHeading(lines[k]) && k > i + 1) break;
      block.push(lines[k]);
    }
    const phoneIdx = block.findIndex((l) => PHONE_RE.test(l));
    const hoursIdx = block.findIndex((l) => /^opening (hours|times)/i.test(l));
    if (phoneIdx < 0 && hoursIdx < 0) return;
    const cut = [phoneIdx, hoursIdx].filter((x) => x >= 0).reduce((a, b) => Math.min(a, b), block.length);
    const brandRe = new RegExp(`^${brandWords.map((w) => w).join("[^a-z0-9]+")}`, "i");
    const addr = block.slice(0, cut).map((l) => l.replace(/^the\s+/i, "").replace(new RegExp(`^${brandWords.join("\\W+")}\\W*(florists?|flowers?|shop)?\\W*`, "i"), "").trim()).filter((l) => l && l.length < 70 && !/^(contact|address|find us|tel|telephone|phone)\s*:?$/i.test(l) && !brandRe.test(l));
    if (!addr.length) return;
    const phone = (PHONE_RE.exec(block[phoneIdx >= 0 ? phoneIdx : 0] ?? "")?.[0] ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
    const hoursLines: string[] = [];
    if (hoursIdx >= 0) for (let k = hoursIdx + 1; k < Math.min(block.length, hoursIdx + 9); k++) {
      if (DAY_WORDS.test(block[k]) && (TIME.test(block[k]) || /closed/i.test(block[k])) && block[k].length < 70) hoursLines.push(tidyHoursLine(block[k]));
      else if (hoursLines.length) break;
    }
    const addressText = addr.join(", ");
    const key = addressText.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ postcode: postcodeOf(addressText), street: "", name: "", phone, addressText: tidyAddress(addressText), label: line, specs: [], hoursText: hoursLines.length ? hoursLines.join("; ") : undefined });
  });
  return out;
}

/// The other shops a company's own website lists: from its structured data, its address blocks with a postcode, and headed shop blocks
/// (textBranches), across the home page and up to four contact / shops / locations pages. Used to offer the company's other shops.
export async function findSiteBranches(website: string, brand: string): Promise<SiteBranch[]> {
  let host = website.trim();
  try { host = new URL(/^[a-z]+:\/\//i.test(host) ? host : `https://${host}`).hostname; } catch { return []; }
  const domain = normalizeDomain(host);
  if (!domain) return [];
  const page = await fetchHomePage(domain);
  if (!page || !(page.res.headers.get("content-type") ?? "").includes("text/html")) return [];
  const buf = await readLimited(page.res, MAX_HTML);
  if (!buf) return [];
  const homeHtml = buf.toString("utf8");
  const base = page.url;
  const siteHost = base.hostname.replace(/^www\./, "");
  const links = anchors(homeHtml, base)
    .filter(({ href, text }) => href.hostname.replace(/^www\./, "") === siteHost && /(locations?|shops?|stores?|branches|find[- ]us|contact|visit|our-)/i.test(`${text} ${href.pathname}`))
    .map(({ href }) => { href.hash = ""; return href.toString(); }).filter((u, i, a) => a.indexOf(u) === i).slice(0, 4);
  const htmls = [homeHtml];
  for (const u of links) {
    const more = await safeFetch(u);
    if (!more || !(more.res.headers.get("content-type") ?? "").includes("text/html")) continue;
    const b = await readLimited(more.res, MAX_HTML);
    if (b) htmls.push(b.toString("utf8"));
  }
  const places: HoursPlace[] = [];
  const add = (p: HoursPlace) => {
    if (!(p.addressText || p.label)) return;
    const pc = p.postcode;
    const same = places.find((x) => (pc && x.postcode === pc) || (x.addressText && p.addressText && addressKey(x.addressText) === addressKey(p.addressText)));
    if (same) { same.phone ||= p.phone; same.hoursText ||= p.hoursText; same.label ||= p.label; return; }
    places.push(p);
  };
  for (const h of htmls) {
    jsonLdUrls(h).places.forEach(add);
    textBranches(h, brand).forEach(add);
    textPlaces(h).forEach(add);
  }
  // A postcode-less headed block that is the same shop as a postcode block (same phone and hours) is not listed twice: the headed one wins.
  return places.slice(0, 40).map((p) => ({ name: p.label || p.addressText, address: p.label ? p.addressText : "", phone: p.phone, hours: placeHours(p) }));
}

const ADDRESS_GENERIC = new Set(["unit", "units", "the", "and", "street", "road", "lane", "house", "centre", "center", "craft", "england", "uk", "united", "kingdom", "essex", "london"]);
/// Are these two addresses the same shop? The same postcode, or at least two distinctive words in common ("Blake End" in both, whichever
/// way the unit is written), so a shop the company already has is not offered again.
export function sameShopAddress(a: string, b: string): boolean {
  const pa = postcodeOf(a), pb = postcodeOf(b);
  if (pa && pb) return pa === pb;
  const tokens = (t: string) => new Set(addressKey(t).split(" ").filter((w) => w.length >= 3 && !ADDRESS_GENERIC.has(w) && !/^\d+[a-z]?$/.test(w)));
  const ta = tokens(a), tb = tokens(b);
  let common = 0;
  ta.forEach((w) => { if (tb.has(w)) common++; });
  return common >= 2;
}
