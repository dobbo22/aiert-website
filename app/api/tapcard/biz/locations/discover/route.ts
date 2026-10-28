import { NextRequest, NextResponse } from "next/server";
import { getOrg } from "@/lib/tapcardBiz";
import { requireBizSession } from "@/lib/tapcardBizSession";
import { listLocations } from "@/lib/tapcardBizLocations";
import { searchBusinesses } from "@/lib/tapcardBusinessSearch";
import { addressKey, findSiteLinks, postcodeOf } from "@/lib/siteLinks";
import { rateLimited } from "@/lib/rateLimit";

// "Find my other shops": the company's other locations, so they need not be typed one by one. Two sources: Google listings that share
// the company's website, and the branches the website itself lists (its schema.org data). Anything already added is left out.
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

  // Google: listings under the company's name whose website is the company's own.
  const near = req.headers.get("x-vercel-ip-latitude") && req.headers.get("x-vercel-ip-longitude")
    ? { lat: Number(req.headers.get("x-vercel-ip-latitude")), lng: Number(req.headers.get("x-vercel-ip-longitude")) } : null;
  const queries = [...new Set([org.name, ...(have[0] ? [`${org.name} ${have[0].address.split(",").slice(-3, -1).join(" ").trim()}`] : [])].filter((q) => q.trim().length >= 3))];
  for (const q of queries) {
    for (const h of await searchBusinesses(q, near).catch(() => [])) {
      if (domain && host(h.website) === domain) add({ ...h, source: "Google" });
    }
  }

  // The website's own list of branches.
  if (org.website) {
    const site = await findSiteLinks(org.website).catch(() => null);
    for (const b of site?.branches ?? []) {
      add({ id: `site:${b.address}`, name: b.name || org.name, address: b.address, website: org.website, phone: b.phone, type: "", hours: b.hours, source: "Website" });
    }
  }
  return NextResponse.json({ candidates: out });
}
