import { NextRequest, NextResponse } from "next/server";
import { requireBizSession } from "@/lib/tapcardBizSession";
import { rateLimited } from "@/lib/rateLimit";
import { appleSearch } from "@/lib/appleMaps";
import { searchBusinesses, type BusinessHit } from "@/lib/tapcardBusinessSearch";
import { postcodeOf } from "@/lib/siteLinks";

// The company admin's place lookup. GET ?q= lists matching businesses: Apple first (free), Google only if Apple finds nothing.
// POST {name, address} fills in one picked business's phone, website and opening hours with a single Google lookup, so a setup costs about
// one paid lookup per shop. Both count against the company's daily allowance when they reach Google.
export interface PlaceHit { id: string; name: string; address: string; website: string; phone: string; type: string; hours: string; source: "apple" | "google" }

const nearOf = (req: NextRequest) => {
  const lat = Number(req.headers.get("x-vercel-ip-latitude")), lng = Number(req.headers.get("x-vercel-ip-longitude"));
  return req.headers.get("x-vercel-ip-latitude") && req.headers.get("x-vercel-ip-longitude") ? { lat, lng } : null;
};

export async function GET(req: NextRequest) {
  const session = await requireBizSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (rateLimited(req, "biz-places", 40)) return NextResponse.json({ error: "Too many requests", hits: [] }, { status: 429 });
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const near = nearOf(req);
  const apple = await appleSearch(q, near);
  if (apple.length) {
    const hits: PlaceHit[] = apple.map((p) => ({ id: `apple:${p.id}`, name: p.name, address: p.address, website: "", phone: "", type: p.type, hours: "", source: "apple" }));
    return NextResponse.json({ hits, source: "apple" });
  }
  const google = await searchBusinesses(q, near, false, `biz-${session.orgId}`).catch((): BusinessHit[] => []);
  return NextResponse.json({ hits: google.map((g): PlaceHit => ({ ...g, source: "google" })), source: "google" });
}

export async function POST(req: NextRequest) {
  const session = await requireBizSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (rateLimited(req, "biz-places-detail", 30)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const body = (await req.json().catch(() => null)) as { name?: string; address?: string } | null;
  const name = String(body?.name ?? "").trim().slice(0, 120), address = String(body?.address ?? "").trim().slice(0, 200);
  if (!name) return NextResponse.json({ error: "A name is required." }, { status: 400 });
  const found = await searchBusinesses(`${name} ${address}`, nearOf(req), false, `biz-${session.orgId}`).catch((): BusinessHit[] => []);
  // The same shop: the same postcode when we have one, else the first result.
  const pc = postcodeOf(address);
  const match = (pc ? found.find((h) => postcodeOf(h.address) === pc) : undefined) ?? (pc ? undefined : found[0]);
  if (!match) return NextResponse.json({ hit: { id: "", name, address, website: "", phone: "", type: "", hours: "", source: "apple" } as PlaceHit, found: false });
  return NextResponse.json({ hit: { ...match, source: "google" } as PlaceHit, found: true });
}
