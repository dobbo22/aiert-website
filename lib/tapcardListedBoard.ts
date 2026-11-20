// Step 4 of the listed universe: who is on a company's board. Two public sources: Companies House (the legal record of its directors)
// and the company's own website. A director is "confirmed" when both agree. One company at a time, on request.
// Needs the Companies House API key in the environment (COMPANIES_HOUSE_API_KEY); without it only the website is read.
import { probe } from "@/lib/tapcardListedSite";
import { extractAnchors } from "@/lib/listedInvestorParse";
import { BOARD_LINK_TEXT, BOARD_PATH, COMMON_BOARD_PATHS, extractWebsiteNames, namedOnPage, parseOfficerName, pickCompany, searchNames, type ChCandidate, type Person } from "@/lib/listedBoardParse";

const CH = "https://api.company-information.service.gov.uk";
export const chUrl = (n: string) => `https://find-and-update.company-information.service.gov.uk/company/${n}`;

export interface BoardPerson { display: string; role: string; appointedOn: string; onCh: boolean; onSite: boolean }
export interface BoardResult {
  isin: string;
  status: "confirmed" | "ch_only" | "site_only" | "none" | "no_key" | "error";
  company: { number: string; name: string; status: string; url: string } | null;
  note: string;
  people: BoardPerson[];
  boardPage: { url: string; status: number; title: string } | null;
  pagesTried: string[];
  checkedAt: string;
}

async function chGet(path: string): Promise<{ ok: true; json: Record<string, unknown> } | { ok: false; status: number }> {
  const key = process.env.COMPANIES_HOUSE_API_KEY;
  if (!key) return { ok: false, status: 0 };
  try {
    const res = await fetch(CH + path, { headers: { Authorization: "Basic " + Buffer.from(`${key}:`).toString("base64") }, signal: AbortSignal.timeout(9000) });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, json: (await res.json()) as Record<string, unknown> };
  } catch {
    return { ok: false, status: -1 };
  }
}

const title = (html: string) => (/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
const plainText = (html: string) => html.replace(/<(script|style|noscript|svg)\b[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/&#8217;|&rsquo;/g, "’").replace(/\s+/g, " ");

export async function checkBoard(c: { isin: string; name: string; website: string; irUrl: string }): Promise<BoardResult> {
  const started = Date.now();
  const left = () => Date.now() - started < 40_000;
  const result: BoardResult = { isin: c.isin, status: "none", company: null, note: "", people: [], boardPage: null, pagesTried: [], checkedAt: new Date().toISOString() };

  // 1. Companies House: find the company, then its current directors.
  const officers: (Person & { role: string; appointedOn: string })[] = [];
  let chProblem = "";
  if (!process.env.COMPANIES_HOUSE_API_KEY) chProblem = "no_key";
  else if (!c.isin.startsWith("GB")) chProblem = "Not registered in the UK (ISIN starts " + c.isin.slice(0, 2) + "), so it is not on Companies House.";
  else {
    let pick: ChCandidate | null = null;
    let why = "";
    for (const q of searchNames(c.name)) {
      const s = await chGet(`/search/companies?q=${encodeURIComponent(q)}&items_per_page=20`);
      if (!s.ok) { chProblem = `Companies House did not answer (status ${s.status}).`; break; }
      const items = ((s.json.items as Record<string, unknown>[]) ?? []).map((i) => ({ title: String(i.title ?? ""), number: String(i.company_number ?? ""), status: String(i.company_status ?? ""), type: String(i.company_type ?? ""), address: String(i.address_snippet ?? "") }));
      const r = pickCompany(c.name, items);
      if (r.pick) { pick = r.pick; break; }
      why = r.why;
    }
    if (pick) {
      result.company = { number: pick.number, name: pick.title, status: pick.status, url: chUrl(pick.number) };
      const o = await chGet(`/company/${pick.number}/officers?items_per_page=100`);
      if (!o.ok) chProblem = `The officers list could not be read (status ${o.status}).`;
      else {
        for (const i of (o.json.items as Record<string, unknown>[]) ?? []) {
          const role = String(i.officer_role ?? "");
          if (i.resigned_on || !/director|secretary/i.test(role) || /corporate/i.test(role)) continue;
          const p = parseOfficerName(String(i.name ?? ""));
          if (!p.last) continue;
          officers.push({ ...p, role: role.replace(/-/g, " "), appointedOn: String(i.appointed_on ?? "") });
        }
      }
    } else if (!chProblem) chProblem = why || "No matching company on Companies House.";
  }

  // 2. The company's own website: find its board page, read it.
  let site: { url: string; status: number; title: string; text: string; html: string } | null = null;
  if (c.website) {
    const cands: string[] = [];
    const add = (u: string) => { if (u && !cands.includes(u)) cands.push(u); };
    const home = await probe(c.website);
    const base = home.finalUrl || c.website;
    const origin = (() => { try { return new URL(base).origin; } catch { return ""; } })();
    const anchorsOf = (html: string, url: string) => extractAnchors(html, url).filter((a) => { try { return new URL(a.href).hostname.replace(/^www\./, "") === new URL(url).hostname.replace(/^www\./, ""); } catch { return false; } });
    const fromAnchors = (html: string, url: string) => { for (const a of anchorsOf(html, url)) { let p = ""; try { p = new URL(a.href).pathname; } catch { continue; } if (BOARD_LINK_TEXT.test(a.text.trim()) || BOARD_PATH.test(p)) add(a.href); } };
    if (home.html) fromAnchors(home.html, base);
    if (c.irUrl && left()) { const ir = await probe(c.irUrl); if (ir.html) fromAnchors(ir.html, ir.finalUrl); }
    if (origin) for (const p of COMMON_BOARD_PATHS) add(origin + p);
    let bestScore = -1;
    for (const u of cands.slice(0, 9)) {
      if (!left()) break;
      const g = await probe(u);
      result.pagesTried.push(`${u} (${g.status || g.error || "no answer"})`);
      if (g.status === 0 || g.status >= 400 || g.html.length < 800) continue;
      const text = plainText(g.html);
      const score = officers.length ? officers.filter((o) => namedOnPage(o, text)).length : extractWebsiteNames(g.html).length;
      if (score > bestScore) { bestScore = score; site = { url: g.finalUrl, status: g.status, title: title(g.html), text, html: g.html }; }
      if (officers.length ? score >= Math.max(2, Math.ceil(officers.length / 2)) : score >= 3) break;
    }
    if (site && bestScore <= 0) site = null;
  }
  if (site) result.boardPage = { url: site.url, status: site.status, title: site.title };

  // 3. Put the two together.
  const people: BoardPerson[] = officers.map((o) => ({ display: o.display, role: o.role, appointedOn: o.appointedOn, onCh: true, onSite: site ? namedOnPage(o, site.text) : false }));
  if (site) {
    // Names on the board page that Companies House does not list as a current director (an adviser, a new appointment, or a mis-read name).
    for (const w of extractWebsiteNames(site.html)) {
      if (officers.some((o) => namedOnPage(o, w.name))) continue;
      if (!people.some((x) => x.display.toLowerCase() === w.name.toLowerCase())) people.push({ display: w.name, role: w.role, appointedOn: "", onCh: false, onSite: true });
    }
  }
  result.people = people;
  const both = people.filter((p) => p.onCh && p.onSite).length;
  const chOnly = people.filter((p) => p.onCh).length;
  result.status = chProblem === "no_key" && !people.length ? "no_key" : both > 0 ? "confirmed" : chOnly > 0 ? "ch_only" : people.length ? "site_only" : "none";
  result.note = chProblem === "no_key" ? "The Companies House key is not set on this server, so only the website was read." : chProblem;
  if (!result.note && result.status === "ch_only") result.note = site ? "Companies House directors found, but none of them were named on the website's board page." : "Companies House directors found, but no board page was found on the website.";
  return result;
}
