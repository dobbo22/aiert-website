import { NextRequest, NextResponse } from "next/server";
import { rateLimited } from "@/lib/rateLimit";
import { listedByIsin, manualWebsite, pickListedHit, wikidataWebsite } from "@/lib/tapcardListed";
import { searchBusinesses } from "@/lib/tapcardBusinessSearch";

// A listed company's website, found when someone picks it in the app: tapcard.aiert.co.uk/api/listed/resolve?isin=GB00...
// The business lookup (TomTom, then HERE, then Google) gives the website; the apps then read the home page themselves and use
// /api/site-links, as for "Find your business", to pick out the investor links. Answers are remembered for a day. No website found
// is an honest answer (website: ""): the app then shows only what the list holds.
const cache = new Map<string, { at: number; body: Record<string, unknown> }>();

export async function GET(req: NextRequest) {
  if (rateLimited(req, "listed-resolve", 20)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const isin = (req.nextUrl.searchParams.get("isin") ?? "").trim().toUpperCase();
  const company = listedByIsin(isin);
  if (!company) return NextResponse.json({ error: "not found" }, { status: 404 });
  const hit = cache.get(isin);
  if (hit && Date.now() - hit.at < 24 * 3600_000) return NextResponse.json(hit.body);
  const debug = req.nextUrl.searchParams.get("debug") === "1";
  // 1. a website set by hand, 2. Wikidata by ISIN, 3. the map lookup by name (below).
  let source = "";
  let website = manualWebsite(isin);
  if (website) source = "list";
  if (!website) { website = await wikidataWebsite(isin); if (website) source = "wikidata"; }
  const tried: { q: string; hits: { name: string; website: string }[] }[] = [];
  let picked = null as Awaited<ReturnType<typeof searchBusinesses>>[number] | null;
  for (const q of website ? [] : [`${company.n} head office`, company.n, `${company.n} investor relations`]) {
    const hits = await searchBusinesses(q, null, false, "", true).catch(() => []);
    tried.push({ q, hits: hits.map((h) => ({ name: h.name, website: h.website })) });
    picked = pickListedHit(company, hits);
    if (picked) break;
  }
  const body = {
    company, website: website || picked?.website || "", address: picked?.address ?? "", phone: picked?.phone ?? "", source: website ? source : picked?.website ? "map" : "",
    // Every listed company has an RNS page by ticker on Investegate (a third party, so labelled as such), even when its own site cannot be read.
    links: [{ kind: "custom", label: "RNS announcements (Investegate)", value: `https://www.investegate.co.uk/company/${encodeURIComponent(company.t)}` }],
  };
  // Only an answer with a website is remembered: an empty one is tried again next time.
  if (body.website) {
    if (cache.size > 2000) cache.clear();
    cache.set(isin, { at: Date.now(), body });
  }
  return NextResponse.json(debug ? { ...body, tried } : body);
}
