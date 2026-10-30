import { postcodeOf } from "@/lib/siteLinks";
import { underProviderCap } from "@/lib/providerCaps";

// Free-tier place data for a picked shop's phone, website and opening hours, tried before Google: TomTom, then HERE. Each needs its own key
// (TOMTOM_API_KEY, HERE_API_KEY) and is skipped when it is not set. They return the same shape so the caller can fill in whatever is missing.

export interface PlaceDetail { phone: string; website: string; hours: string; source: string }
type Near = { lat: number; lng: number } | null | undefined;

/// A phone number as the provider gave it, or "" when it cannot be right: a UK number has 9 or 10 digits after +44 (a provider's data can
/// be a digit short, which would put a wrong number on a card).
export function sanePhone(raw: string): string {
  const v = (raw ?? "").trim();
  const digits = v.replace(/\D/g, "");
  if (!digits) return "";
  // 10 digits after the country code (or after the leading 0, so 11 with it), except a few 01 areas that have 9.
  if (v.startsWith("+44") || digits.startsWith("44")) {
    const n = digits.slice(2);
    return n.length === 10 || (n.length === 9 && n.startsWith("1")) ? v : "";
  }
  if (digits.startsWith("0")) {
    const n = digits.slice(1);
    return n.length === 10 || (n.length === 9 && n.startsWith("1")) ? v : "";
  }
  return digits.length >= 7 ? v : "";
}

const empty = (source: string): PlaceDetail => ({ phone: "", website: "", hours: "", source });
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
const cleanUrl = (u: string) => {
  const v = (u ?? "").trim();
  if (!v) return "";
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
};
const samePlace = (wantName: string, wantAddress: string, gotName: string, gotAddress: string): boolean => {
  const pc = postcodeOf(wantAddress), gpc = postcodeOf(gotAddress);
  if (pc && gpc) return pc === gpc;
  const a = norm(wantName), b = norm(gotName);
  return !!a && !!b && (a === b || a.includes(b) || b.includes(a));
};

export function tomtomConfigured(): boolean { return !!process.env.TOMTOM_API_KEY; }
export function hereConfigured(): boolean { return !!process.env.HERE_API_KEY; }

/// TomTom Search: a place's phone and website (and, where it lists them, its opening hours).
export async function tomtomDetails(name: string, address: string, near?: Near): Promise<PlaceDetail> {
  const none = empty("tomtom");
  if (!tomtomConfigured()) return none;
  try {
    if (!(await underProviderCap("tomtom"))) return none;
    const loc = near && Number.isFinite(near.lat) && Number.isFinite(near.lng) ? `&lat=${near.lat.toFixed(4)}&lon=${near.lng.toFixed(4)}` : "";
    const q = encodeURIComponent(`${name} ${address}`.slice(0, 200));
    const res = await fetch(`https://api.tomtom.com/search/2/search/${q}.json?key=${encodeURIComponent(process.env.TOMTOM_API_KEY!)}&limit=5&countrySet=GB&language=en-GB${loc}`, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return none;
    const j = (await res.json()) as { results?: { poi?: { name?: string; phone?: string; url?: string }; address?: { freeformAddress?: string; postalCode?: string } }[] };
    const hit = (j.results ?? []).find((r) => r.poi && samePlace(name, address, r.poi.name ?? "", `${r.address?.freeformAddress ?? ""} ${r.address?.postalCode ?? ""}`));
    if (!hit?.poi) return none;
    return { phone: sanePhone(hit.poi.phone ?? "").slice(0, 40), website: cleanUrl(hit.poi.url ?? "").slice(0, 200), hours: "", source: "tomtom" };
  } catch {
    return none;
  }
}

// Websites HERE lists for a place that are not the business's own (social pages, directories, company records).
const NOT_OWN_SITE = /(^|\.)(facebook|fb|instagram|twitter|x|linkedin|tiktok|youtube|pinterest|tripadvisor|yell|yelp|trustpilot|foursquare|google|bing|apple|data\.gov|companieshouse\.gov|gov)\.(com|co\.uk|uk|me)$|business\.data\.gov\.uk/i;
function ownSite(urls: string[]): string {
  const ok = urls.filter((u) => { try { return !NOT_OWN_SITE.test(new URL(cleanUrl(u)).hostname); } catch { return false; } });
  return cleanUrl(ok.find((u) => /^https:/i.test(u)) ?? ok[0] ?? "");
}

/// HERE Discover (places near a point): a place's phone, website and opening hours. `at` is where to look: the picked shop's map position.
export async function hereDetails(name: string, address: string, at?: Near): Promise<PlaceDetail> {
  const none = empty("here");
  if (!hereConfigured()) return none;
  try {
    if (!(await underProviderCap("here"))) return none;
    const pos = at && Number.isFinite(at.lat) && Number.isFinite(at.lng) ? at : { lat: 52.5, lng: -1.5 };
    const q = encodeURIComponent(`${name} ${address}`.slice(0, 200));
    const res = await fetch(`https://discover.search.hereapi.com/v1/discover?q=${q}&at=${pos.lat.toFixed(4)},${pos.lng.toFixed(4)}&limit=5&lang=en-GB&apiKey=${encodeURIComponent(process.env.HERE_API_KEY!)}`, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return none;
    const j = (await res.json()) as { items?: { title?: string; address?: { label?: string; postalCode?: string }; contacts?: { phone?: { value?: string }[]; www?: { value?: string }[] }[]; openingHours?: { text?: string[] }[] }[] };
    const hit = (j.items ?? []).find((i) => samePlace(name, address, i.title ?? "", `${i.address?.label ?? ""} ${i.address?.postalCode ?? ""}`));
    if (!hit) return none;
    const c = hit.contacts?.[0];
    const hours = (hit.openingHours?.[0]?.text ?? []).join("; ").replace(/\s*-\s*/g, "–").slice(0, 300);
    return { phone: sanePhone((c?.phone ?? []).map((p) => p.value ?? "").find((p) => sanePhone(p)) ?? "").slice(0, 40), website: ownSite((c?.www ?? []).map((w) => w.value ?? "")).slice(0, 200), hours, source: "here" };
  } catch {
    return none;
  }
}

// ---- Name search for "Find your business": the same two free providers, tried before Google's paid Places search.

/// One business as a free provider lists it. The id carries the provider ("tomtom:...", "here:...") so the apps can tell it is not a Google
/// place id and skip the Google review link. Opening hours are only there when HERE lists them.
export interface FreeBusinessHit { id: string; name: string; address: string; website: string; phone: string; type: string; hours: string }

const siteOnly = (u: string) => { try { const x = new URL(cleanUrl(u)); return `${x.protocol}//${x.hostname}${x.pathname === "/" ? "" : x.pathname.replace(/\/$/, "")}`; } catch { return ""; } };

/// TomTom Search: up to five real businesses (not streets or towns) for a typed name and town.
export async function tomtomSearch(q: string, near?: Near, limit = 5): Promise<FreeBusinessHit[]> {
  if (!tomtomConfigured()) return [];
  try {
    if (!(await underProviderCap("tomtom"))) return [];
    const loc = near && Number.isFinite(near.lat) && Number.isFinite(near.lng) ? `&lat=${near.lat.toFixed(4)}&lon=${near.lng.toFixed(4)}` : "";
    const res = await fetch(`https://api.tomtom.com/search/2/search/${encodeURIComponent(q.slice(0, 100))}.json?key=${encodeURIComponent(process.env.TOMTOM_API_KEY!)}&limit=${limit}&countrySet=GB&language=en-GB&typeahead=false&idxSet=POI${loc}`, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [];
    const j = (await res.json()) as { results?: { id?: string; poi?: { name?: string; phone?: string; url?: string; categories?: string[]; classifications?: { names?: { name?: string }[] }[] }; address?: { freeformAddress?: string; postalCode?: string } }[] };
    return (j.results ?? []).flatMap((r) => r.id && r.poi?.name ? [{
      id: `tomtom:${r.id}`, name: r.poi.name.slice(0, 120), address: (r.address?.freeformAddress ?? "").slice(0, 200),
      website: siteOnly(r.poi.url ?? "").slice(0, 200), phone: sanePhone(r.poi.phone ?? "").slice(0, 40), type: [r.poi.classifications?.[0]?.names?.[0]?.name, r.poi.categories?.[0]].filter(Boolean).join(", ").slice(0, 80), hours: "",
    }] : []);
  } catch {
    return [];
  }
}

/// HERE Discover: up to five real businesses for a typed name and town, with their phone, website and opening hours where listed.
export async function hereSearch(q: string, near?: Near, limit = 5): Promise<FreeBusinessHit[]> {
  if (!hereConfigured()) return [];
  try {
    if (!(await underProviderCap("here"))) return [];
    const pos = near && Number.isFinite(near.lat) && Number.isFinite(near.lng) ? near : { lat: 52.5, lng: -1.5 };
    const res = await fetch(`https://discover.search.hereapi.com/v1/discover?q=${encodeURIComponent(q.slice(0, 100))}&at=${pos.lat.toFixed(4)},${pos.lng.toFixed(4)}&limit=${limit}&lang=en-GB&in=countryCode:GBR&apiKey=${encodeURIComponent(process.env.HERE_API_KEY!)}`, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [];
    const j = (await res.json()) as { items?: { id?: string; title?: string; resultType?: string; address?: { label?: string }; categories?: { name?: string }[]; contacts?: { phone?: { value?: string }[]; www?: { value?: string }[] }[]; openingHours?: { text?: string[] }[] }[] };
    return (j.items ?? []).flatMap((i) => i.id && i.title && i.resultType === "place" ? [{
      id: `here:${i.id}`, name: i.title.slice(0, 120), address: (i.address?.label ?? "").slice(0, 200),
      website: siteOnly(ownSite((i.contacts?.[0]?.www ?? []).map((w) => w.value ?? ""))).slice(0, 200),
      phone: sanePhone((i.contacts?.[0]?.phone ?? []).map((p) => p.value ?? "").find((p) => sanePhone(p)) ?? "").slice(0, 40),
      type: (i.categories ?? []).slice(0, 3).map((c) => c.name ?? "").filter(Boolean).join(", ").slice(0, 80),
      hours: (i.openingHours?.[0]?.text ?? []).join("; ").replace(/\s*-\s*/g, "–").slice(0, 300),
    }] : []);
  } catch {
    return [];
  }
}

// Booking platforms, delivery apps, directories and social sites: a listing that gives one of these as its "website" has not given its own, and
// reading it would put the platform's own socials and links on the card. Small businesses' own builder sites (wixsite, business.site) are fine.
const THIRD_PARTY = /(^|\.)(sevenrooms|opentable|resdiary|bookatable|designmynight|resy|tock|quandoo|thefork|toasttab|squareup|facebook|instagram|tripadvisor|yell|ubereats|deliveroo|just-eat|justeat|linktr\.ee|google|booking|expedia|hotels|airbnb)\.(com|co\.uk|ee|net)$/i;
// A deep page that is not a branch (/gallery, /menus, /contact) is trimmed to the home page, which is what carries the links, socials and hours.
// Branch pages such as /kensington stay.
const GENERIC_PAGE = /^(gallery|menus?|contact(-us)?|about(-us)?|home|index(\.html?)?|bookings?|book(-a-table|-now)?|reservations?|find-us|visit-us|events|whats-on|food|drinks?|rooms|accommodation|photos)$/i;

/// A free listing's website made safe to read: "" for a booking platform or social site, and a generic page trimmed to the home page.
export function cleanFreeWebsite(raw: string): string {
  try {
    const u = new URL(cleanUrl(raw));
    if (THIRD_PARTY.test(u.hostname)) return "";
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length === 1 && GENERIC_PAGE.test(parts[0])) return `${u.protocol}//${u.hostname}`;
    return `${u.protocol}//${u.hostname}${parts.length ? `/${parts.join("/")}` : ""}`;
  } catch {
    return "";
  }
}

/// The same business listed more than once (TomTom lists a pub and its rooms as two places at one address) becomes one entry: the first
/// listing's name and order, with whichever website, phone and hours any of them had.
export function tidyFreeHits(hits: FreeBusinessHit[]): FreeBusinessHit[] {
  const norm2 = (t: string) => t.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "");
  const out = new Map<string, FreeBusinessHit>();
  for (const h0 of hits) {
    const h = { ...h0, website: cleanFreeWebsite(h0.website) };
    const pc = postcodeOf(h.address) || norm2(h.address).slice(0, 14);
    const key = `${norm2(h.name)}|${pc}`, have = out.get(key);
    if (!have) { out.set(key, h); continue; }
    have.website ||= h.website; have.phone ||= h.phone; have.hours ||= h.hours;
    // A pub with rooms is listed as a restaurant and a hotel: the merged place keeps both types, so the card can offer food and rooms.
    const types = have.type.split(", ").filter(Boolean);
    for (const t of h.type.split(", ").filter(Boolean)) if (!types.includes(t)) types.push(t);
    have.type = types.join(", ").slice(0, 120);
  }
  return [...out.values()];
}
