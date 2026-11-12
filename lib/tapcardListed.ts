// Listed companies (London Stock Exchange main market and AIM shares), for the apps' "Listed companies" search under Find a business.
// The list is a data file made from the exchange's own stock lists (lib/data/lse-equities.json), searched in memory: no database,
// and replacing the file updates it. It holds only the issuer's name, ticker, ISIN and market; a company's website and investor
// links are found when someone picks it (the site finder), never stored here.
import data from "@/lib/data/lse-equities.json";

export interface ListedCompany { n: string; t: string; i: string; m: "Main" | "AIM"; c: string }

const COMPANIES = (data as { companies: ListedCompany[] }).companies;
export const LISTED_AS_OF = (data as { asOf: string }).asOf;

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();
const INDEX = COMPANIES.map((c) => ({ c, name: norm(c.n), ticker: c.t.toLowerCase() }));

/// Companies whose name contains every word typed, or whose ticker starts with it. Name-prefix matches first, then ticker, then the rest.
export function searchListed(query: string, limit = 20): ListedCompany[] {
  const q = norm(query);
  if (q.length < 2) return [];
  const words = q.split(" ");
  const scored: { c: ListedCompany; s: number }[] = [];
  for (const { c, name, ticker } of INDEX) {
    let s = -1;
    if (name.startsWith(q)) s = 0;
    else if (ticker === q) s = 0;
    else if (ticker.startsWith(q)) s = 1;
    else if (words.every((w) => name.includes(w))) s = 2;
    if (s >= 0) scored.push({ c, s });
  }
  return scored.sort((a, b) => a.s - b.s || a.c.n.localeCompare(b.c.n)).slice(0, Math.min(Math.max(limit, 1), 50)).map((x) => x.c);
}

export function listedByIsin(isin: string): ListedCompany | undefined {
  return COMPANIES.find((c) => c.i === isin.trim().toUpperCase());
}
