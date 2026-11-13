// Reads a company's own announcements page (or its RSS/Atom feed) into a list of {title, url, date}. Pure: no network, no database.
// Only the company's own page is ever read (never Investegate or the London Stock Exchange).

export interface FeedItem { title: string; url: string; date: string | null }

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

const decode = (s: string) =>
  s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;|&rsquo;|&lsquo;/g, "'")
    .replace(/&ndash;|&mdash;/g, "-").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
const text = (html: string) => decode(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
const iso = (y: number, m: number, d: number) => (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2000 && y <= 2100 ? `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` : null);

/// The first date in a piece of text: 27-Oct-2026, 27 October 2026, 2026-10-27 or 27/10/2026 (day first).
export function findDate(s: string): string | null {
  let m = s.match(/\b(\d{1,2})[-\s/.]+([A-Za-z]{3,9})\.?[-\s/.,]+(\d{4})\b/);
  if (m) { const mo = MONTHS[m[2].slice(0, 3).toLowerCase()]; const d = mo ? iso(Number(m[3]), mo, Number(m[1])) : null; if (d) return d; }
  m = s.match(/\b(\d{4})-(\d{2})-(\d{2})(?!\d)/);
  if (m) { const d = iso(Number(m[1]), Number(m[2]), Number(m[3])); if (d) return d; }
  m = s.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (m) { const d = iso(Number(m[3]), Number(m[2]), Number(m[1])); if (d) return d; }
  return null;
}

function absolute(href: string, base: URL): string | null {
  try {
    const u = new URL(decode(href).trim(), base);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    u.protocol = "https:";
    u.hash = "";
    return u.toString();
  } catch { return null; }
}

const GENERIC = /^(pdf|download|read more|more|view|click here|here|link|next|previous|top|\d{4}|all|\d+ ?kb|\d+(\.\d+)? ?mb)$/i;

function parseFeed(xml: string, base: URL): FeedItem[] {
  const out: FeedItem[] = [];
  const blocks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi) ?? [];
  for (const b of blocks) {
    const title = text((b.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/<!\[CDATA\[|\]\]>/g, ""));
    const linkRaw = b.match(/<link[^>]*href="([^"]+)"/i)?.[1] ?? b.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] ?? b.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i)?.[1] ?? "";
    const url = absolute(linkRaw.replace(/<!\[CDATA\[|\]\]>/g, "").trim(), base);
    const when = b.match(/<(pubDate|published|updated|dc:date)[^>]*>([\s\S]*?)<\/\1>/i)?.[2] ?? "";
    const d = findDate(when) ?? (when && !Number.isNaN(Date.parse(when)) ? new Date(when).toISOString().slice(0, 10) : null);
    if (title && url) out.push({ title: title.slice(0, 300), url, date: d });
  }
  return out;
}

/// Announcements from a page's HTML (table rows, list items or articles that hold a dated link) or from an RSS/Atom feed.
export function parseAnnouncements(body: string, pageUrl: string, max = 30): FeedItem[] {
  let base: URL;
  try { base = new URL(pageUrl); } catch { return []; }
  if (/<(rss|feed)[\s>]/i.test(body.slice(0, 2000)) || /<channel[\s>]/i.test(body.slice(0, 4000))) {
    return dedupe(parseFeed(body, base)).slice(0, max);
  }
  const html = body.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<!--[\s\S]*?-->/g, " ");
  const items: FeedItem[] = [];
  const blocks = html.match(/<(tr|li|article)[\s>][\s\S]*?<\/\1>/gi) ?? [];
  for (const b of blocks) {
    if (/<(tr|li|article)[\s>]/i.test(b.slice(5))) continue; // only the innermost block, so a list around a list is not read twice
    const date = findDate(text(b));
    if (!date) continue;
    const anchors = [...b.matchAll(/<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
    for (const a of anchors) {
      const title = text(a[2]);
      if (title.length < 8 || GENERIC.test(title) || !/[A-Za-z]{3}/.test(title)) continue;
      const url = absolute(a[1], base);
      if (!url) continue;
      items.push({ title: title.slice(0, 300), url, date });
      break; // one announcement per row: the first real link
    }
  }
  return dedupe(items).sort((a, b) => ((b.date ?? "") > (a.date ?? "") ? 1 : (b.date ?? "") < (a.date ?? "") ? -1 : 0)).slice(0, max);
}

function dedupe(items: FeedItem[]): FeedItem[] {
  const seen = new Set<string>();
  return items.filter((i) => (seen.has(i.url) ? false : (seen.add(i.url), true)));
}

/// What the admin needs to filter and display: a title short enough for a headline.
export function headlineOf(title: string): string {
  const t = title.replace(/\s+/g, " ").trim();
  return t.length <= 140 ? t : t.slice(0, 137).trimEnd() + "...";
}
