import { NextRequest, NextResponse } from "next/server";
import { requireBizSession } from "@/lib/tapcardBizSession";
import { rateLimited } from "@/lib/rateLimit";
import { appleSearch } from "@/lib/appleMaps";
import { searchBusinesses, type BusinessHit } from "@/lib/tapcardBusinessSearch";
import { postcodeOf } from "@/lib/siteLinks";
import { hereDetails, tomtomDetails, type PlaceDetail } from "@/lib/placeProviders";

// The company admin's place lookup. GET ?q= lists matching businesses: Apple first (free), Google only if Apple finds nothing.
// POST {name, address} fills in one picked business's phone, website and opening hours with a single Google lookup, so a setup costs about
// one paid lookup per shop. Both count against the company's daily allowance when they reach Google.
export interface PlaceHit { id: string; name: string; address: string; website: string; phone: string; type: string; hours: string; source: string; lat?: number; lng?: number }

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
    const hits: PlaceHit[] = apple.map((p) => ({ id: `apple:${p.id}`, name: p.name, address: p.address, website: "", phone: "", type: p.type, hours: "", source: "apple", lat: p.lat, lng: p.lng }));
    return NextResponse.json({ hits, source: "apple" });
  }
  const google = await searchBusinesses(q, near, false, `biz-${session.orgId}`).catch((): BusinessHit[] => []);
  return NextResponse.json({ hits: google.map((g): PlaceHit => ({ ...g, source: "google" })), source: "google" });
}

export async function POST(req: NextRequest) {
  const session = await requireBizSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (rateLimited(req, "biz-places-detail", 30)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const body = (await req.json().catch(() => null)) as { name?: string; address?: string; lat?: number; lng?: number } | null;
  const name = String(body?.name ?? "").trim().slice(0, 120), address = String(body?.address ?? "").trim().slice(0, 200);
  if (!name) return NextResponse.json({ error: "A name is required." }, { status: 400 });
  // Cheapest first: TomTom, then HERE (free tiers), and Google only if neither gave a website. Each fills in what the others lacked.
  // Where the picked shop is (from Apple), else roughly where the admin is.
  const spot = Number.isFinite(body?.lat) && Number.isFinite(body?.lng) && body?.lat !== 0 ? { lat: Number(body!.lat), lng: Number(body!.lng) } : null;
  const near = spot ?? nearOf(req);
  const got: PlaceDetail = { phone: "", website: "", hours: "", source: "" };
  const take = (d: PlaceDetail) => {
    if (!d.phone && !d.website && !d.hours) return;
    got.source = got.source ? `${got.source}+${d.source}` : d.source;
    got.phone ||= d.phone; got.website ||= d.website; got.hours ||= d.hours;
  };
  take(await tomtomDetails(name, address, near));
  if (!got.website) take(await hereDetails(name, address, near));
  let fromGoogle: BusinessHit | undefined;
  if (!got.website) {
    const found = await searchBusinesses(`${name} ${address}`, near, false, `biz-${session.orgId}`).catch((): BusinessHit[] => []);
    // The same shop: the same postcode when we have one, else the first result.
    const pc = postcodeOf(address);
    fromGoogle = (pc ? found.find((h) => postcodeOf(h.address) === pc) : undefined) ?? (pc ? undefined : found[0]);
    if (fromGoogle) take({ phone: fromGoogle.phone, website: fromGoogle.website, hours: fromGoogle.hours, source: "google" });
  }
  if (!got.phone && !got.website && !got.hours) return NextResponse.json({ hit: { id: "", name, address, website: "", phone: "", type: "", hours: "", source: "apple" } as PlaceHit, found: false });
  return NextResponse.json({
    hit: { id: fromGoogle?.id ?? "", name, address: address || fromGoogle?.address || "", website: got.website, phone: got.phone, type: fromGoogle?.type ?? "", hours: got.hours, source: got.source } as PlaceHit,
    found: true,
  });
}
