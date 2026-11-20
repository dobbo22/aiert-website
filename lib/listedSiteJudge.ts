// Pure parts of the website check (no network, no database), so they can be tested on their own.
import { coreWords } from "@/lib/tapcardListed";

export type SiteVerdict = "ok" | "unsure" | "wrong" | "parked" | "dead";
export interface Probe { url: string; finalUrl: string; status: number; html: string; error: string }
export interface Judged { verdict: SiteVerdict; reasons: string[]; title: string }

const PARKED = /(domain (name )?(is )?for sale|buy this domain|this domain (may be|is) (for sale|available)|domain (is )?parked|parked (free|domain)|sedoparking|hugedomains|dan\.com\/buy|afternic|register\.com|this site can.t be reached|coming soon|under construction|default web page|welcome to nginx|apache2 (ubuntu )?default|index of \/)/i;
const textOf = (html: string) => html.replace(/<(script|style|noscript|svg)\b[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const attr = (html: string, re: RegExp) => (re.exec(html)?.[1] ?? "").replace(/&amp;/g, "&").trim();
// The exchange's names are abbreviated and cut short ("HSBC Hldgs plc", "Jpmorgan Global Core Real Assets Li"): abbreviations of the
// ordinary words, and stray one or two letter fragments, are not part of what a company calls itself, so they are not looked for.
const ABBREVIATIONS = new Set(["hldgs", "hldg", "hlds", "hdgs", "grp", "grps", "intl", "int", "inv", "invs", "invt", "tst", "tr", "fin", "svcs", "svc", "cos", "ord", "cap", "mgmt", "prop", "props", "devs", "dev", "ent", "ldn", "uk", "ltd", "lp"]);
export const words = (name: string) => {
  const w = coreWords(name).filter((x) => !ABBREVIATIONS.has(x));
  const long = w.filter((x) => x.length >= 3);
  return long.length ? long : w.filter((x) => x.length >= 2);
};
const hasWord = (hay: string, w: string) => new RegExp(`(^|[^a-z0-9])${w.replace(/[^a-z0-9]/g, "")}([^a-z0-9]|$)`, "i").test(hay);

/// Pure: does this page look like the website of this listed company? Needs the company's own words in the page title, the site name or
/// the web address (an "ok"), or in the page text with the company's listing in view (an "unsure" for a person to decide).
export function judgeWebsite(company: { n: string; t: string; i: string }, page: Pick<Probe, "finalUrl" | "status" | "html">): Judged {
  const html = page.html;
  const title = attr(html, /<title[^>]*>([\s\S]*?)<\/title>/i).slice(0, 160);
  if ((page.status === 403 || page.status === 503 || page.status === 429) && /just a moment|attention required|cf-chl|challenge-platform|cf-browser-verification|access denied|errors\.edgesuite\.net|incapsula|px-captcha|datadome/i.test(`${title} ${html}`)) {
    return { verdict: "unsure", reasons: ["the site is behind an automatic check (such as Cloudflare) that refuses automated readers, so its pages cannot be read; the address may well be right"], title };
  }
  if (page.status === 0 || page.status >= 400) return { verdict: "dead", reasons: [page.status ? `the page answered ${page.status}` : "the site did not answer"], title };
  const body = textOf(html);
  if (PARKED.test(body.slice(0, 3000)) || PARKED.test(title)) return { verdict: "parked", reasons: ["looks parked or for sale"], title };
  const want = words(company.n);
  if (!want.length) return { verdict: "unsure", reasons: ["the company's name has no distinctive words to match"], title };
  const host = (() => { try { return new URL(page.finalUrl).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; } })();
  const hostFlat = host.replace(/[^a-z0-9]/g, "");
  const head = `${title} ${attr(html, /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']*)["']/i)} ${attr(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i).replace(/<[^>]+>/g, " ")}`.toLowerCase();
  const inHead = want.filter((w) => hasWord(head, w));
  const inHost = want.filter((w) => hostFlat.includes(w.replace(/[^a-z0-9]/g, "")));
  const inBody = want.filter((w) => hasWord(body.toLowerCase(), w));
  const reasons: string[] = [];
  const need = want.length <= 2 ? want.length : Math.ceil(want.length * 0.75);
  // A near-empty page is a parked or dead site, unless its title or web address is the company's own: many big sites draw their pages
  // with a script, so the HTML holds little more than a title (shell.com is 14 characters of text).
  const nearlyEmpty = body.length < 250;
  if (nearlyEmpty && !(inHead.length >= need || (inHost.length >= Math.min(need, 1) && inHost.length >= Math.ceil(want.length / 2)))) return { verdict: "parked", reasons: ["looks parked, for sale or empty"], title };
  const headOk = inHead.length >= need;
  const hostOk = inHost.length >= Math.min(need, 1) && inHost.length >= Math.ceil(want.length / 2);
  const bodyOk = inBody.length >= need;
  const isinSeen = body.includes(company.i);
  const listed = /\b(AIM|London Stock Exchange|LSE|investor relations|regulatory news|RNS|annual report|plc)\b/i.test(body.slice(0, 20000));
  if (headOk) reasons.push(`the page title or site name holds "${inHead.join(" ")}"`);
  if (hostOk) reasons.push(`the web address holds "${inHost.join(" ")}"`);
  if (isinSeen) reasons.push("the page shows the company's ISIN");
  if (headOk || (hostOk && bodyOk) || isinSeen) return { verdict: "ok", reasons: nearlyEmpty ? [...reasons, "the page is drawn by a script, so there is little text to read"] : reasons, title };
  if (nearlyEmpty && hostOk) return { verdict: "ok", reasons: [...reasons, "the page is drawn by a script, so there is little text to read"], title };
  if (bodyOk && (listed || hostOk)) return { verdict: "unsure", reasons: [...reasons, `the page text names "${inBody.join(" ")}" but not in the title or web address`], title };
  return { verdict: "wrong", reasons: [`does not name "${want.join(" ")}" in its title, address or text`], title };
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
export function guessDomains(name: string): string[] {
  const w = words(name);
  if (!w.length) return [];
  // The whole name without its legal ending ("the smarter web company"), then the distinctive words, then the first word.
  const full = slug(name.replace(/\b(plc|ltd|limited|inc|incorporated|s\.?a\.?|n\.?v\.?|ag|se|corp|corporation)\b\.?/gi, " "));
  const bases = [full, slug(w.join("")), w.length > 1 ? slug(w[0]) : ""].filter((b, i, all) => b.length >= 3 && all.indexOf(b) === i);
  const out: string[] = [];
  for (const b of bases) out.push(`https://www.${b}.com`, `https://www.${b}.co.uk`);
  return out.slice(0, 6);
}
