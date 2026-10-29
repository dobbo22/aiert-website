import crypto from "crypto";
import { underProviderCap } from "@/lib/providerCaps";

// Apple Maps Server API: a free list of matching places (name, address, category, position) for the company admin's Find business /
// Find shop / Find my other shops. It does NOT return phone, website or opening hours, so a place's contact details still come from one
// Google lookup, made only for the shop the admin actually picks (see app/api/tapcard/biz/places). Needs APPLE_MAPS_KEY_P8,
// APPLE_MAPS_KEY_ID and APPLE_MAPS_TEAM_ID; without them every call returns nothing and the caller falls back to Google.

export interface ApplePlace { id: string; name: string; address: string; type: string; lat: number; lng: number }

const API = "https://maps-api.apple.com/v1";
let cached: { token: string; at: number } | null = null;

export function appleMapsConfigured(): boolean {
  return !!(process.env.APPLE_MAPS_KEY_P8 && process.env.APPLE_MAPS_KEY_ID && process.env.APPLE_MAPS_TEAM_ID);
}

function authJwt(origin?: string): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const head = b64({ alg: "ES256", kid: process.env.APPLE_MAPS_KEY_ID, typ: "JWT" });
  const body = b64({ iss: process.env.APPLE_MAPS_TEAM_ID, iat: now, exp: now + 1800, ...(origin ? { origin } : {}) });
  const key = (process.env.APPLE_MAPS_KEY_P8 ?? "").replace(/\\n/g, "\n");
  const sig = crypto.sign("sha256", Buffer.from(`${head}.${body}`), { key, dsaEncoding: "ieee-p1363" }).toString("base64url");
  return `${head}.${body}.${sig}`;
}

/// A token for MapKit JS in the admin's browser (the same Maps key as the Server API). It is tied to the page's origin, lasts 30 minutes, and is only
/// given to the signed-in admin. MapKit JS search returns a place's phone and website, which the Server API does not, as the iPhone app's does.
export function mapkitJsToken(origin: string): string | null {
  return appleMapsConfigured() ? authJwt(origin) : null;
}

async function accessToken(): Promise<string | null> {
  if (cached && Date.now() - cached.at < 20 * 60_000) return cached.token;
  const res = await fetch(`${API}/token`, { headers: { Authorization: `Bearer ${authJwt()}` }, signal: AbortSignal.timeout(5000) }).catch(() => null);
  if (!res?.ok) return null;
  const j = (await res.json().catch(() => null)) as { accessToken?: string } | null;
  if (!j?.accessToken) return null;
  cached = { token: j.accessToken, at: Date.now() };
  return cached.token;
}

/// Places matching `query`, nearest `near` first when given. Empty when Apple is not set up, fails or finds nothing.
export async function appleSearch(query: string, near?: { lat: number; lng: number } | null): Promise<ApplePlace[]> {
  if (!appleMapsConfigured()) return [];
  const q = query.trim().slice(0, 100);
  if (q.length < 3) return [];
  try {
    if (!(await underProviderCap("apple"))) return [];
    const token = await accessToken();
    if (!token) return [];
    const loc = near && Number.isFinite(near.lat) && Number.isFinite(near.lng) ? `&userLocation=${near.lat.toFixed(4)},${near.lng.toFixed(4)}` : "";
    const res = await fetch(`${API}/search?q=${encodeURIComponent(q)}&lang=en-GB&resultTypeFilter=Poi${loc}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) { if (res.status === 401) cached = null; return []; }
    const j = (await res.json()) as { results?: { id?: string; name?: string; formattedAddressLines?: string[]; poiCategory?: string; coordinate?: { latitude?: number; longitude?: number } }[] };
    return (j.results ?? []).flatMap((p) => p.id && p.name ? [{
      id: p.id, name: p.name.slice(0, 120), address: (p.formattedAddressLines ?? []).join(", ").replace(/, (England|Scotland|Wales|Northern Ireland)$/i, "").slice(0, 200),
      type: p.poiCategory ?? "", lat: p.coordinate?.latitude ?? 0, lng: p.coordinate?.longitude ?? 0,
    }] : []).slice(0, 6);
  } catch {
    return [];
  }
}
