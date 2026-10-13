// Finds the booking, menu, ordering, shop and review links a business already
// publishes on its own website, so TapCard can offer to add them to the card.
// Only links the page itself contains (nothing guessed or invented); the owner
// ticks which to keep.
import { normalizeDomain, readLimited, safeFetch } from "@/lib/siteIcon";
import { sanitizeLinks, type CardLink, type LinkKind } from "@/lib/tapcardLinks";

const MAX_HTML = 512 * 1024;

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

function jsonLdUrls(html: string): { menu?: string; sameAs: string[] } {
  const sameAs: string[] = [];
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
        if (Array.isArray(o.sameAs)) for (const s of o.sameAs) if (typeof s === "string") sameAs.push(s);
        if (typeof o.sameAs === "string") sameAs.push(o.sameAs);
        for (const v of Object.values(o)) if (v && typeof v === "object") walk(v);
      };
      walk(JSON.parse(m[1]));
    } catch { /* ignore bad JSON-LD */ }
  }
  return { menu, sameAs };
}

function pick(found: Map<LinkKind, string>, kind: LinkKind, url: URL | string) {
  if (found.has(kind)) return;
  const u = typeof url === "string" ? url : url.toString();
  if (u.length > 300) return;
  found.set(kind, u.replace(/^http:\/\//i, "https://"));
}

export async function findSiteLinks(websiteOrDomain: string): Promise<CardLink[]> {
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
    if (/(^|\.)tripadvisor\./i.test(h)) pick(found, "tripadvisor", href);
    else if (/(^|\.)g\.page$/i.test(h) || (/(^|\.)google\.[a-z.]+$/i.test(h) && /\/(maps\/.*review|local\/writereview)/.test(path))) pick(found, "google_review", href);
    else if (BOOK_HOSTS.test(h)) pick(found, "book_table", href);
    else if (ROOM_HOSTS.test(h)) pick(found, "book_room", href);
    else if (APPT_HOSTS.test(h)) pick(found, "appointment", href);
    else if (ORDER_HOSTS.test(h)) pick(found, "order", href);
    else if (same) {
      if (/^(book(ing)?s?( a)? ?table|reserve( a table)?|reservations?|book online)$/.test(t) || /\/(reservations?|book-a-table|booking)\/?$/.test(path)) pick(found, "book_table", href);
      else if (/^(book (a )?room|rooms? (&|and) rates|check availability)$/.test(t)) pick(found, "book_room", href);
      else if (/^(our |view |see |the )?(food |drinks? |lunch |dinner |brunch |sunday |wine |a la carte |takeaway )*menus?( ?pdf)?$/.test(t) || /\/(menus?|food-and-drink|our-menu)\/?$/.test(path) || /menu[^/]*\.pdf$/.test(path)) pick(found, "menu", href);
      else if (/^(order( online| now)?|takeaway|click (&|and) collect)$/.test(t) || /\/(order|order-online)\/?$/.test(path)) pick(found, "order", href);
      else if (/^(shop|online shop|store|shop online)$/.test(t) || /\/(shop|store)\/?$/.test(path)) pick(found, "shop", href);
    }
  }
  return sanitizeLinks([...found].map(([kind, value]) => ({ kind, label: "", value })));
}
