import { appleSearch } from "@/lib/appleMaps";
import { hereDetails, hereSearch, tomtomDetails, tomtomSearch, type FreeBusinessHit } from "@/lib/placeProviders";
import { postcodeOf } from "@/lib/siteLinks";

// The restaurant list-finder's search (src=finder): Apple, TomTom and HERE only, never Google. Each provider is asked, the answers are merged
// into one list (the same place from two providers becomes one entry, keeping whichever phone, website and hours either had), and the first
// few places that still have no website get one more TomTom/HERE details lookup. Each provider has its own free-tier daily limit
// (lib/providerCaps.ts); one that is over its limit or not set up is simply skipped.
type Near = { lat: number; lng: number } | null | undefined;

const norm = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "");
// The same place from different providers: the same name and postcode (or, with no postcode, the same name and the start of the address).
const keyOf = (h: FreeBusinessHit) => `${norm(h.name)}|${postcodeOf(h.address) || norm(h.address).slice(0, 14)}`;

export async function finderSearch(q: string, near?: Near): Promise<FreeBusinessHit[]> {
  const [apple, tomtom, here] = await Promise.all([appleSearch(q, near), tomtomSearch(q, near, 10), hereSearch(q, near, 10)]);
  const merged = new Map<string, FreeBusinessHit>();
  const add = (h: FreeBusinessHit) => {
    const key = keyOf(h), have = merged.get(key);
    if (!have) { merged.set(key, { ...h, id: `place:${key}` }); return; }
    have.website ||= h.website; have.phone ||= h.phone; have.hours ||= h.hours; have.type ||= h.type;
  };
  // TomTom and HERE first: they carry phone and website, which Apple's search does not.
  [...tomtom, ...here].forEach(add);
  apple.forEach((p) => add({ id: p.id, name: p.name, address: p.address, website: "", phone: "", type: p.type, hours: "" }));
  const hits = [...merged.values()].slice(0, 12);
  // A place with no website yet gets one details lookup (TomTom, then HERE), a few per search so a busy list stays within the free tiers.
  let lookups = 0;
  for (const h of hits) {
    if (h.website || lookups >= 4) continue;
    lookups++;
    const t = await tomtomDetails(h.name, h.address, near);
    h.website ||= t.website; h.phone ||= t.phone;
    if (!h.website) { const r = await hereDetails(h.name, h.address, near); h.website ||= r.website; h.phone ||= r.phone; h.hours ||= r.hours; }
  }
  return hits;
}
