import { NextRequest, NextResponse } from "next/server";
import { requireBizSession } from "@/lib/tapcardBizSession";
import { rateLimited } from "@/lib/rateLimit";
import { appleSearch } from "@/lib/appleMaps";
import { searchBusinesses, type BusinessHit } from "@/lib/tapcardBusinessSearch";
import { fillPlaceDetails, type PlaceHit } from "@/lib/placeDetails";

// The company admin's place lookup. GET ?q= lists matching businesses: Apple first (free), Google only if Apple finds nothing.
// POST {name, address} fills in one picked business's phone, website and opening hours with a single Google lookup, so a setup costs about
// one paid lookup per shop. Both count against the company's daily allowance when they reach Google.
export type { PlaceHit };

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
  const spot = Number.isFinite(body?.lat) && Number.isFinite(body?.lng) && body?.lat !== 0 ? { lat: Number(body!.lat), lng: Number(body!.lng) } : null;
  return NextResponse.json(await fillPlaceDetails(name, address, spot ?? nearOf(req), `biz-${session.orgId}`));
}
