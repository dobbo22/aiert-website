// Step 2 of the listed universe: find a company's own website and check it really is theirs. One company at a time, on request.
// Candidates are tried in order (set by hand, the stored one, the hand list, Wikidata, the map lookup, then a few guesses from the name)
// and the first one that passes is kept. Every candidate tried, and why it passed or failed, is saved as evidence.
import { manualWebsite, pickListedHit, wikidataWebsite } from "@/lib/tapcardListed";
import { guessDomains, judgeWebsite, type Judged, type Probe, type SiteVerdict } from "@/lib/listedSiteJudge";
import { searchBusinesses } from "@/lib/tapcardBusinessSearch";
import { isPublicHost, readLimited } from "@/lib/siteIcon";

export type { SiteVerdict };
export interface Tried { source: string; url: string; finalUrl: string; status: number; verdict: SiteVerdict; reasons: string[]; title: string }
export interface SiteResult { isin: string; status: SiteVerdict | "none"; website: string; finalUrl: string; title: string; tried: Tried[]; checkedAt: string; kept: boolean }

async function probeOnce(start: string): Promise<Probe> {
  let url: URL;
  try { url = new URL(start); } catch { return { url: start, finalUrl: start, status: 0, html: "", error: "not a web address" }; }
  for (let hop = 0; hop <= 5; hop++) {
    if (!/^https?:$/.test(url.protocol) || !(await isPublicHost(url.hostname))) return { url: start, finalUrl: url.toString(), status: 0, html: "", error: "not a public website" };
    let res: Response;
    try {
      res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(7000), headers: { "user-agent": "Mozilla/5.0 (compatible; AiertListedCheck/1.0; +https://tapcard.aiert.co.uk)", accept: "text/html,application/xhtml+xml" } });
    } catch (e) {
      return { url: start, finalUrl: url.toString(), status: 0, html: "", error: e instanceof Error ? e.message : "failed" };
    }
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return { url: start, finalUrl: url.toString(), status: res.status, html: "", error: "redirect with no place to go" };
      try { url = new URL(loc, url); } catch { return { url: start, finalUrl: url.toString(), status: res.status, html: "", error: "bad redirect" }; }
      continue;
    }
    const buf = res.ok ? await readLimited(res, 400_000).catch(() => null) : null;
    return { url: start, finalUrl: url.toString(), status: res.status, html: buf ? buf.toString("utf8") : "", error: "" };
  }
  return { url: start, finalUrl: start, status: 0, html: "", error: "too many redirects" };
}

/// https first, then plain http if https did not work.
export async function probe(start: string): Promise<Probe> {
  const a = await probeOnce(start);
  if (a.status > 0 && a.status < 400) return a;
  if (/^https:/i.test(start)) {
    const b = await probeOnce(start.replace(/^https:/i, "http:"));
    if (b.status > 0 && b.status < 400) return b;
  }
  return a;
}

export interface SiteInput { isin: string; name: string; ticker: string; website: string; websiteSource: string }

/// Checks one company. Stops at the first passing candidate, or after about 40 seconds. Returns the evidence; the caller saves it.
export async function checkCompanyWebsite(c: SiteInput): Promise<SiteResult> {
  const company = { n: c.name, t: c.ticker, i: c.isin };
  const started = Date.now();
  const seen = new Set<string>();
  const tried: Tried[] = [];
  let best: Tried | null = null;
  const handSet = c.websiteSource === "set by hand" && !!c.website;

  async function tryUrl(source: string, url: string): Promise<boolean> {
    const key = url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/+$/, "").toLowerCase();
    if (!url || seen.has(key)) return false;
    seen.add(key);
    const p = await probe(url);
    const j = judgeWebsite(company, p);
    const t: Tried = { source, url, finalUrl: p.finalUrl, status: p.status, verdict: j.verdict, reasons: p.error && !j.reasons.length ? [p.error] : j.reasons, title: j.title };
    tried.push(t);
    const rank = { ok: 4, unsure: 3, wrong: 2, parked: 1, dead: 0 } as const;
    if (!best || rank[t.verdict] > rank[best.verdict]) best = t;
    return t.verdict === "ok";
  }

  let passed = false;
  if (handSet) passed = await tryUrl("set by hand", c.website);
  if (!passed && !handSet) {
    const steps: [string, () => Promise<string>][] = [
      ["stored", async () => c.website],
      ["hand list", async () => manualWebsite(c.isin)],
      ["Wikidata", () => wikidataWebsite(c.isin)],
      ["map lookup", async () => {
        for (const q of [`${c.name} head office`, c.name]) {
          const hits = await searchBusinesses(q, null, false, "", true).catch(() => []);
          const pick = pickListedHit({ n: c.name }, hits);
          if (pick?.website) return pick.website;
        }
        return "";
      }],
    ];
    for (const [source, get] of steps) {
      if (Date.now() - started > 30_000) break;
      const url = await get().catch(() => "");
      if (url && (await tryUrl(source, url))) { passed = true; break; }
    }
    if (!passed) for (const g of guessDomains(c.name)) { if (Date.now() - started > 40_000) break; if (await tryUrl("guessed from the name", g)) { passed = true; break; } }
  }
  const b = best as Tried | null;
  const origin = b ? (() => { try { return new URL(b.finalUrl).origin; } catch { return b.url; } })() : "";
  return {
    isin: c.isin,
    status: b ? b.verdict : "none",
    website: b ? (b.verdict === "ok" ? origin : b.url) : "",
    finalUrl: b?.finalUrl ?? "",
    title: b?.title ?? "",
    tried,
    checkedAt: new Date().toISOString(),
    kept: handSet,
  };
}
