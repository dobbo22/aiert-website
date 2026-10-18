// "Find your business": a typed name becomes a short list of real businesses (name, address, website, phone) from
// Google Places, so setup is a tap instead of typing. Public endpoint, so it is rate limited per IP, results are cached
// for ten minutes, and a daily cap keeps the Places bill bounded. With no key, or past the cap, it returns an empty list
// and the apps fall back to typing the name and website.
import sql from "@/lib/db";

const DAILY_CAP = 400;

export interface BusinessHit { id: string; name: string; address: string; website: string; phone: string; type: string }

const cache = new Map<string, { at: number; hits: BusinessHit[] }>();

let ready: Promise<unknown> | null = null;
function ensureSchema(): Promise<unknown> {
  if (!ready) {
    ready = sql`CREATE TABLE IF NOT EXISTS tapcard_lookup_cap (day DATE PRIMARY KEY, n INTEGER NOT NULL DEFAULT 0)`.catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

async function underCap(): Promise<boolean> {
  await ensureSchema();
  const r = (await sql`
    INSERT INTO tapcard_lookup_cap (day, n) VALUES (CURRENT_DATE, 1)
    ON CONFLICT (day) DO UPDATE SET n = tapcard_lookup_cap.n + 1 RETURNING n
  `) as { n: number }[];
  return (r[0]?.n ?? 0) <= DAILY_CAP;
}

// Google's website field often carries campaign parameters (utm_source=...): keep just the address people would type.
const cleanSite = (u: string) => { try { const x = new URL(u); return `${x.protocol}//${x.hostname}${x.pathname === "/" ? "" : x.pathname.replace(/\/$/, "")}`; } catch { return ""; } };

export async function searchBusinesses(queryRaw: string): Promise<BusinessHit[]> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const q = queryRaw.trim().slice(0, 100);
  if (!key || q.length < 3) return [];
  const cached = cache.get(q.toLowerCase());
  if (cached && Date.now() - cached.at < 10 * 60_000) return cached.hits;
  if (!(await underCap().catch(() => false))) return [];
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json", "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber,places.primaryTypeDisplayName",
    },
    body: JSON.stringify({ textQuery: q, maxResultCount: 5, regionCode: "GB" }),
    signal: AbortSignal.timeout(6000),
  }).catch(() => null);
  if (!res?.ok) return [];
  const j = (await res.json().catch(() => ({}))) as { places?: { id?: string; displayName?: { text?: string }; formattedAddress?: string; websiteUri?: string; nationalPhoneNumber?: string; primaryTypeDisplayName?: { text?: string } }[] };
  const hits: BusinessHit[] = (j.places ?? []).flatMap((p) => p.id && p.displayName?.text ? [{
    id: p.id, name: p.displayName.text.slice(0, 120), address: (p.formattedAddress ?? "").slice(0, 200),
    website: cleanSite(p.websiteUri ?? "").slice(0, 200), phone: (p.nationalPhoneNumber ?? "").slice(0, 40), type: (p.primaryTypeDisplayName?.text ?? "").slice(0, 60),
  }] : []);
  if (cache.size > 500) cache.clear();
  cache.set(q.toLowerCase(), { at: Date.now(), hits });
  return hits;
}
