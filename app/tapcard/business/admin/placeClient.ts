// Place lookups from the company admin pages: the list comes from Apple first (free), and a picked business's phone, website and opening
// hours are filled in by one Google lookup (app/api/tapcard/biz/places).
export interface PlaceHit { id: string; name: string; address: string; website: string; phone: string; type: string; hours: string; source?: string }

export async function searchPlaces(q: string): Promise<PlaceHit[]> {
  const res = await fetch(`/api/tapcard/biz/places?q=${encodeURIComponent(q)}`).catch(() => null);
  const data = (await res?.json().catch(() => null)) as { hits?: PlaceHit[] } | null;
  return Array.isArray(data?.hits) ? data!.hits! : [];
}

/// A hit from Apple has only a name and address: add its phone, website and hours (one Google lookup). A hit that already has them is returned as is.
export async function enrichPlace(hit: PlaceHit): Promise<PlaceHit> {
  if (hit.website || hit.phone) return hit;
  const res = await fetch("/api/tapcard/biz/places", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: hit.name, address: hit.address }) }).catch(() => null);
  const data = (await res?.json().catch(() => null)) as { hit?: PlaceHit } | null;
  return data?.hit && (data.hit.website || data.hit.phone) ? { ...hit, ...data.hit, address: hit.address || data.hit.address } : hit;
}
