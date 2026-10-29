import { searchBusinesses, type BusinessHit } from "@/lib/tapcardBusinessSearch";
import { postcodeOf } from "@/lib/siteLinks";
import { hereDetails, tomtomDetails, type PlaceDetail } from "@/lib/placeProviders";

export interface PlaceHit { id: string; name: string; address: string; website: string; phone: string; type: string; hours: string; source: string; lat?: number; lng?: number }

/// One picked business's phone, website and opening hours, cheapest source first: TomTom, then HERE (both free tiers), and Google only if
/// neither found a website. Each fills in what the others lacked. `quotaKey` is who the Google lookup is counted against.
export async function fillPlaceDetails(name: string, address: string, near: { lat: number; lng: number } | null, quotaKey: string, haveWebsite = false): Promise<{ hit: PlaceHit; found: boolean }> {
  const got: PlaceDetail = { phone: "", website: "", hours: "", source: "" };
  const take = (d: PlaceDetail) => {
    if (!d.phone && !d.website && !d.hours) return;
    got.source = got.source ? `${got.source}+${d.source}` : d.source;
    got.phone ||= d.phone; got.website ||= d.website; got.hours ||= d.hours;
  };
  take(await tomtomDetails(name, address, near ?? undefined));
  // HERE has opening hours, which TomTom does not, so it is asked whenever the website or the hours are still missing.
  if (!got.website || !got.hours) take(await hereDetails(name, address, near ?? undefined));
  let fromGoogle: BusinessHit | undefined;
  // Google is only for a business whose website nothing else found, and never when the caller already has the website.
  if (!got.website && !haveWebsite) {
    const found = await searchBusinesses(`${name} ${address}`, near, false, quotaKey).catch((): BusinessHit[] => []);
    // The same shop: the same postcode when we have one, else the first result.
    const pc = postcodeOf(address);
    fromGoogle = (pc ? found.find((h) => postcodeOf(h.address) === pc) : undefined) ?? (pc ? undefined : found[0]);
    if (fromGoogle) take({ phone: fromGoogle.phone, website: fromGoogle.website, hours: fromGoogle.hours, source: "google" });
  }
  if (!got.phone && !got.website && !got.hours) return { hit: { id: "", name, address, website: "", phone: "", type: "", hours: "", source: "apple" }, found: false };
  return {
    hit: { id: fromGoogle?.id ?? "", name, address: address || fromGoogle?.address || "", website: got.website, phone: got.phone, type: fromGoogle?.type ?? "", hours: got.hours, source: got.source },
    found: true,
  };
}
