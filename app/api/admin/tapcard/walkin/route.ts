import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminRequest";
import { rateLimited } from "@/lib/rateLimit";
import { appleSearch } from "@/lib/appleMaps";
import { finderSearch } from "@/lib/finderSearch";
import { fillPlaceDetails, type PlaceHit } from "@/lib/placeDetails";
import { postcodeOf } from "@/lib/siteLinks";
import { buildPrebuiltCard, getPrebuilt, storePrebuilt } from "@/lib/tapcardPrebuilt";
import { sendPrebuiltEmail } from "@/lib/tapcardPrebuiltEmail";
import { resolveSiteBranding } from "@/lib/siteBrandColor";
import { placeIdFromLinks, placeRating } from "@/lib/tapcardRating";

// The walk-in demo (admin only): find a business by name, build its card from the place listing and its own website, give back a start link
// (its QR code is what the owner scans to begin on their own phone), and optionally email that link. Nothing here is public.
const nearOf = (req: NextRequest) => {
  const lat = Number(req.headers.get("x-vercel-ip-latitude")), lng = Number(req.headers.get("x-vercel-ip-longitude"));
  return req.headers.get("x-vercel-ip-latitude") && req.headers.get("x-vercel-ip-longitude") ? { lat, lng } : null;
};
// A card built for a walk-in is stored under this address until an email is given; it is only used to key the stored row.
const WALK_IN_OWNER = "walk-in@aiert.co.uk";

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (rateLimited(req, "walkin-search", 60)) return NextResponse.json({ error: "Too many requests", hits: [] }, { status: 429 });
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 120);
  if (q.length < 2) return NextResponse.json({ hits: [] });
  const near = nearOf(req);
  const apple = await appleSearch(q, near);
  if (apple.length) {
    const hits: PlaceHit[] = apple.map((p) => ({ id: `apple:${p.id}`, name: p.name, address: p.address, website: "", phone: "", type: p.type, hours: "", source: "apple", lat: p.lat, lng: p.lng }));
    return NextResponse.json({ hits });
  }
  // Apple found nothing: TomTom and HERE (merged), never Google.
  const free = await finderSearch(q, near).catch(() => []);
  return NextResponse.json({ hits: free.map((g): PlaceHit => ({ ...g, source: "tomtom+here" })) });
}

// POST { name, address, lat?, lng?, website? } builds the card and stores it for the start link.
// PUT  { token, email } emails that start link to the prospect.
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (rateLimited(req, "walkin-build", 40)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const b = (await req.json().catch(() => null)) as { name?: string; address?: string; lat?: number; lng?: number; website?: string; phone?: string } | null;
  const name = String(b?.name ?? "").trim().slice(0, 80);
  const address = String(b?.address ?? "").trim().slice(0, 200);
  if (name.length < 2) return NextResponse.json({ error: "A name is required." }, { status: 400 });
  const spot = Number.isFinite(b?.lat) && Number.isFinite(b?.lng) && b?.lat !== 0 ? { lat: Number(b!.lat), lng: Number(b!.lng) } : null;
  // The place listing first (phone, website, hours), then the website itself for every link: the same as the business admin's builder.
  const given = String(b?.website ?? "").trim().slice(0, 200);
  const place = await fillPlaceDetails(name, address, spot ?? nearOf(req), "walkin", !!given, false).catch(() => null);
  // The website is what the logo, brand colour, links and socials all come from, so it has to be the right one. Google is no longer used (it is a
  // paid call): TomTom and HERE are searched for the same name and address, and the one in the same postcode is taken.
  // The page's own Apple Maps search (MapKit JS, as the iPhone app does) already gives a website when there is one: then no lookup is needed.
  const found = given ? [] : await finderSearch(`${name} ${address}`.trim(), spot ?? nearOf(req)).catch(() => []);
  const pc = postcodeOf(address);
  const google = (pc ? found.find((h) => postcodeOf(h.address) === pc) : undefined) ?? (pc ? undefined : found[0]);
  let website = given || google?.website || place?.hit.website || "";
  const built = await buildPrebuiltCard(name, website, address, true);
  if (built.wrongSite) website = "";
  const card = built.card;
  // What the website did not say, the listing may: address, phone, opening hours.
  if (!card.address) card.address = address;
  if (!card.phone) card.phone = String(b?.phone ?? "").trim().slice(0, 40) || google?.phone || place?.hit.phone || "";
  const hours = google?.hours || place?.hit.hours;
  if (hours && !card.links.some((l) => l.kind === "hours")) card.links = [...card.links, { kind: "hours" as const, label: "Opening hours", value: hours }].slice(0, 10);
  const token = await storePrebuilt(WALK_IN_OWNER, name, website, card, null, "");
  // What the apps show on the card besides the links: the banner in the brand colour of the website, and the Google rating.
  const [branding, rating] = await Promise.all([
    website ? resolveSiteBranding(website).catch(() => null) : null,
    placeRating(placeIdFromLinks(card.links)).catch(() => null),
  ]);
  return NextResponse.json({ ok: true, card, token, link: `https://tapcard.aiert.co.uk/start/${token}`, found: !!place?.found || !!website, wrongSite: !!built.wrongSite, brandColor: branding?.color ?? null, rating });
}

export async function PUT(req: NextRequest) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (rateLimited(req, "walkin-email", 30)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const b = (await req.json().catch(() => null)) as { token?: string; email?: string } | null;
  const email = String(b?.email ?? "").trim().slice(0, 120);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return NextResponse.json({ error: "That email address doesn't look right." }, { status: 400 });
  const token = String(b?.token ?? "");
  const card = await getPrebuilt(token).catch(() => null);
  if (!card) return NextResponse.json({ error: "That card has expired. Build it again." }, { status: 404 });
  try {
    await sendPrebuiltEmail(email, card.name, `https://tapcard.aiert.co.uk/start/${token}`);
  } catch (e) {
    console.error("walk-in email failed", e);
    return NextResponse.json({ error: "The email couldn't be sent. Try again." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
