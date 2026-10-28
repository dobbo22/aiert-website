import { postcodeOf } from "@/lib/siteLinks";

// Free-tier place data for a picked shop's phone, website and opening hours, tried before Google: TomTom, then HERE. Each needs its own key
// (TOMTOM_API_KEY, HERE_API_KEY) and is skipped when it is not set. They return the same shape so the caller can fill in whatever is missing.

export interface PlaceDetail { phone: string; website: string; hours: string; source: string }
type Near = { lat: number; lng: number } | null | undefined;

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
    const loc = near && Number.isFinite(near.lat) && Number.isFinite(near.lng) ? `&lat=${near.lat.toFixed(4)}&lon=${near.lng.toFixed(4)}` : "";
    const q = encodeURIComponent(`${name} ${address}`.slice(0, 200));
    const res = await fetch(`https://api.tomtom.com/search/2/search/${q}.json?key=${encodeURIComponent(process.env.TOMTOM_API_KEY!)}&limit=5&countrySet=GB&language=en-GB${loc}`, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return none;
    const j = (await res.json()) as { results?: { poi?: { name?: string; phone?: string; url?: string }; address?: { freeformAddress?: string; postalCode?: string } }[] };
    const hit = (j.results ?? []).find((r) => r.poi && samePlace(name, address, r.poi.name ?? "", `${r.address?.freeformAddress ?? ""} ${r.address?.postalCode ?? ""}`));
    if (!hit?.poi) return none;
    return { phone: (hit.poi.phone ?? "").slice(0, 40), website: cleanUrl(hit.poi.url ?? "").slice(0, 200), hours: "", source: "tomtom" };
  } catch {
    return none;
  }
}

/// HERE Geocoding & Search: a place's phone, website and opening hours.
export async function hereDetails(name: string, address: string): Promise<PlaceDetail> {
  const none = empty("here");
  if (!hereConfigured()) return none;
  try {
    const q = encodeURIComponent(`${name} ${address}`.slice(0, 200));
    const res = await fetch(`https://discover.search.hereapi.com/v1/geocode?q=${q}&in=countryCode:GBR&limit=5&lang=en-GB&show=contacts,openingHours&apiKey=${encodeURIComponent(process.env.HERE_API_KEY!)}`, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return none;
    const j = (await res.json()) as { items?: { title?: string; address?: { label?: string; postalCode?: string }; contacts?: { phone?: { value?: string }[]; www?: { value?: string }[] }[]; openingHours?: { text?: string[] }[] }[] };
    const hit = (j.items ?? []).find((i) => samePlace(name, address, i.title ?? "", `${i.address?.label ?? ""} ${i.address?.postalCode ?? ""}`));
    if (!hit) return none;
    const c = hit.contacts?.[0];
    const hours = (hit.openingHours?.[0]?.text ?? []).join("; ").replace(/\s*-\s*/g, "–").slice(0, 300);
    return { phone: (c?.phone?.[0]?.value ?? "").slice(0, 40), website: cleanUrl(c?.www?.[0]?.value ?? "").slice(0, 200), hours, source: "here" };
  } catch {
    return none;
  }
}
