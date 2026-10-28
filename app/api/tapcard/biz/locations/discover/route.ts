import { NextRequest, NextResponse } from "next/server";
import { getOrg } from "@/lib/tapcardBiz";
import { requireBizSession } from "@/lib/tapcardBizSession";
import { listLocations } from "@/lib/tapcardBizLocations";
import { searchBusinesses } from "@/lib/tapcardBusinessSearch";
import { appleSearch, appleMapsConfigured, type ApplePlace } from "@/lib/appleMaps";
import { addressKey, findSiteLinks, postcodeOf } from "@/lib/siteLinks";
import { rateLimited } from "@/lib/rateLimit";

// "Find my other shops": the company's other locations, so they need not be typed one by one. Sources, cheapest first:
//  1. Apple Maps (free): places with the company's name within about 40 km of a shop it already has. Apple gives no website, so
//     the phone, website and hours are filled in by one Google lookup only when the admin adds a shop.
//  2. The branches the company's own website lists (its schema.org data).
//  3. Google listings that share the company's website, only when Apple is not set up or found nothing.
// Anything already added is left out.
const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
};
const plain = (s: string) => s.toLowerCase().replace(/^the\s+/, "").replace(/[^a-z0-9]+/g, " ").trim();

export async function POST(req: NextRequest) {
  const session = await requireBizSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (rateLimited(req, "biz-discover", 10)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const org = await getOrg(session.orgId);
  if (!org) return NextResponse.json({ error: "not found" }, { status: 404 });

  const host = (v: string) => { try { return new URL(/^[a-z]+:\/\//i.test(v) ? v : `https://${v}`).hostname.replace(/^www\./i, "").toLowerCase(); } catch { return ""; } };
  const domain = host(org.website);
  const have = await listLocations(org.id);
  const seen = new Set<string>();
  const keyOf = (address: string, phone: string) => postcodeOf(address) || addressKey(address) || phone.replace(/\D/g, "");
  for (const l of have) seen.add(keyOf(l.address, l.phone));

  type Candidate = { id: string; name: string; address: string; website: string; phone: string; type: string; hours: string; source: string };
  const out: Candidate[] = [];
  const add = (c: Candidate) => {
    const k = keyOf(c.address, c.phone);
    if (!k || seen.has(k)) return;
    seen.add(k);
    out.push(c);
  };

  const ipNear = req.headers.get("x-vercel-ip-latitude") && req.headers.get("x-vercel-ip-longitude")
    ? { lat: Number(req.headers.get("x-vercel-ip-latitude")), lng: Number(req.headers.get("x-vercel-ip-longitude")) } : null;
  const townOf = (address: string) => address.split(",").map((p) => p.replace(/[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}/i, "").trim()).filter(Boolean).slice(-2).join(" ");

  // 1. Apple: find where an existing shop is, then the company's name nearby.
  let appleFound = false;
  if (appleMapsConfigured() && org.name.trim().length >= 3) {
    let centre: { lat: number; lng: number } | null = ipNear;
    let myType = "";
    if (have[0]) {
      const here = await appleSearch(`${org.name} ${townOf(have[0].address)}`, ipNear);
      const pc = postcodeOf(have[0].address);
      const mine = here.find((p) => pc && postcodeOf(p.address) === pc) ?? here[0];
      if (mine) { centre = { lat: mine.lat, lng: mine.lng }; myType = mine.type; }
    }
    const pool: ApplePlace[] = [...(await appleSearch(org.name, centre)), ...(have[0] ? await appleSearch(`${org.name} ${townOf(have[0].address)}`, centre) : [])];
    const me = plain(org.name);
    for (const p of pool) {
      const pn = plain(p.name);
      if (!pn || !(pn === me || pn.startsWith(me) || me.startsWith(pn))) continue;
      if (centre && p.lat && km(centre, p) > 40) continue;
      // The same kind of place as the shop the company already has (a cafe of a similar name is not its shop).
      if (myType && p.type && p.type !== myType) continue;
      add({ id: `apple:${p.id}`, name: p.name, address: p.address, website: "", phone: "", type: p.type, hours: "", source: "Apple Maps" });
      appleFound = true;
    }
  }

  // 3. Google, only when Apple gave nothing: listings under the company's name whose website is the company's own.
  if (!appleFound) {
    const queries = [...new Set([org.name, ...(have[0] ? [`${org.name} ${townOf(have[0].address)}`] : [])].filter((q) => q.trim().length >= 3))];
    for (const q of queries) {
      for (const h of await searchBusinesses(q, ipNear, false, `biz-${session.orgId}`).catch(() => [])) {
        if (domain && host(h.website) === domain) add({ ...h, source: "Google" });
      }
    }
  }

  // 2. The website's own list of branches.
  if (org.website) {
    const site = await findSiteLinks(org.website).catch(() => null);
    for (const b of site?.branches ?? []) {
      add({ id: `site:${b.address}`, name: b.name || org.name, address: b.address, website: org.website, phone: b.phone, type: "", hours: b.hours, source: "Website" });
    }
  }
  return NextResponse.json({ candidates: out });
}
