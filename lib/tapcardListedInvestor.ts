// Step 3 of the listed universe: find a company's investor pages and see what TapCard itself makes of them, one company at a time.
// "TapCard sees" is the real thing: the same site-links finder the apps use for the Contacts "Found on your website" suggestions, and the
// same announcements reader that powers a listed company's news posts. Only the company's own pages are read, never RNS or news sites.
import { findSiteLinks } from "@/lib/siteLinks";
import { probe } from "@/lib/tapcardListedSite";
import { parseAnnouncements, type FeedItem } from "@/lib/tapcardIrParse";
import { readLimited, safeFetch } from "@/lib/siteIcon";
import { isThirdPartyRegulatoryUrl } from "@/lib/tapcardRegulatoryHosts";
import { bestSeen, COMMON_IR_PATHS, detectFigures, extractAnchors, pickLinks, type IrRole, type Seen } from "@/lib/listedInvestorParse";

export interface PageRead { role: string; url: string; status: number; title: string }
export interface InvestorResult {
  isin: string;
  status: "found" | "partial" | "none";
  urls: Partial<Record<IrRole, string>>;
  tapcardSees: { label: string; value: string }[];
  rnsRead: { url: string; count: number; sample: FeedItem[]; note: string };
  price: Seen & { url: string };
  cap: Seen & { url: string };
  pages: PageRead[];
  note: string;
  checkedAt: string;
}

const IR_LABELS = new Set(["RNS announcements", "Investor relations", "Reports and results", "Shareholder information", "Share price"]);
const title = (html: string) => (/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "").replace(/\s+/g, " ").trim().slice(0, 120);

async function readAnnouncements(url: string): Promise<{ items: FeedItem[]; note: string }> {
  if (!url) return { items: [], note: "no announcements page found" };
  if (isThirdPartyRegulatoryUrl(url)) return { items: [], note: "that page is a third-party news site, which TapCard never reads" };
  try {
    const page = await safeFetch(url);
    if (!page) return { items: [], note: "TapCard could not open the page (it needs a working https page)" };
    const buf = await readLimited(page.res, 2 * 1024 * 1024);
    if (!buf) return { items: [], note: "the page is too large to read" };
    const items = parseAnnouncements(buf.toString("utf8"), page.url.toString()).filter((i) => !isThirdPartyRegulatoryUrl(i.url));
    return { items, note: items.length ? "" : "no dated announcements were found on the page (it may load them with a script)" };
  } catch {
    return { items: [], note: "TapCard could not read the page" };
  }
}

export async function checkInvestorPages(c: { isin: string; name: string; website: string }): Promise<InvestorResult> {
  const started = Date.now();
  const left = () => Date.now() - started < 42_000;
  const pages: PageRead[] = [];
  const urls: Partial<Record<IrRole, string>> = {};
  const noFig = { state: "no" as const, snippet: "", url: "" };
  const result: InvestorResult = { isin: c.isin, status: "none", urls, tapcardSees: [], rnsRead: { url: "", count: 0, sample: [], note: "" }, price: noFig, cap: noFig, pages, note: "", checkedAt: new Date().toISOString() };
  if (!c.website) { result.note = "No website to read. Check the website first."; return result; }

  const home = await probe(c.website);
  pages.push({ role: "home page", url: home.finalUrl, status: home.status, title: title(home.html) });
  if (!home.html) { result.note = `The home page could not be read (${home.error || `status ${home.status}`}).`; return result; }

  // What the apps would offer for this website today.
  const sees = await findSiteLinks(c.website, "", c.name).catch(() => null);
  result.tapcardSees = (sees?.links ?? []).filter((l) => IR_LABELS.has(l.label ?? "") ).map((l) => ({ label: l.label ?? "", value: l.value }));

  const take = (links: ReturnType<typeof pickLinks>) => { for (const l of links) if (!urls[l.role] && !isThirdPartyRegulatoryUrl(l.url)) urls[l.role] = l.url; };
  const figures: { page: string; price: Seen; cap: Seen }[] = [];
  const figs = (url: string, html: string) => { const f = detectFigures(html); figures.push({ page: url, ...f }); };
  figs(home.finalUrl, home.html);
  take(pickLinks(extractAnchors(home.html, home.finalUrl)));

  const origin = (() => { try { return new URL(home.finalUrl).origin; } catch { return ""; } })();
  let irHtml = "";
  if (!urls.ir && origin) {
    for (const p of COMMON_IR_PATHS) {
      if (!left()) break;
      const g = await probe(origin + p);
      if (g.status > 0 && g.status < 400 && g.html.length > 500) { urls.ir = g.finalUrl; irHtml = g.html; pages.push({ role: "investor page (guessed path)", url: g.finalUrl, status: g.status, title: title(g.html) }); break; }
    }
  }
  if (urls.ir && !irHtml && left()) {
    const g = await probe(urls.ir);
    pages.push({ role: "investor page", url: g.finalUrl, status: g.status, title: title(g.html) });
    irHtml = g.html;
  }
  if (irHtml) {
    figs(urls.ir!, irHtml);
    take(pickLinks(extractAnchors(irHtml, urls.ir!)));
  }
  if (!urls.rns && urls.ir && left()) {
    for (const p of ["/rns", "/regulatory-news", "/announcements", "/regulatory-announcements"]) {
      if (!left()) break;
      const g = await probe(urls.ir.replace(/\/+$/, "") + p);
      if (g.status > 0 && g.status < 400 && g.html.length > 500) { urls.rns = g.finalUrl; pages.push({ role: "announcements (guessed path)", url: g.finalUrl, status: g.status, title: title(g.html) }); break; }
    }
  }
  if (urls.price && left()) {
    const g = await probe(urls.price);
    pages.push({ role: "share price page", url: g.finalUrl, status: g.status, title: title(g.html) });
    if (g.html) figs(urls.price, g.html);
  }

  // The real test: can TapCard's own announcements reader get dated announcements from it?
  let read = await readAnnouncements(urls.rns ?? "");
  if (!read.items.length && urls.ir && urls.ir !== urls.rns) {
    const alt = await readAnnouncements(urls.ir);
    if (alt.items.length) { read = alt; urls.rns = urls.rns ?? urls.ir; }
  }
  result.rnsRead = { url: urls.rns ?? "", count: read.items.length, sample: read.items.slice(0, 3), note: read.note };

  const withPage = (pick: "price" | "cap") => {
    const best = bestSeen(figures.map((f) => f[pick]));
    const from = figures.find((f) => f[pick].state === best.state && f[pick].snippet === best.snippet);
    return { ...best, url: best.state === "no" ? "" : from?.page ?? "" };
  };
  result.price = withPage("price");
  result.cap = withPage("cap");
  result.status = read.items.length > 0 ? "found" : urls.ir || urls.rns || urls.reports || urls.price ? "partial" : "none";
  result.note = result.status === "none" ? "No investor pages were found on the website." : result.status === "partial" ? "Investor pages were found, but TapCard could not read dated announcements from them." : "";
  return result;
}
