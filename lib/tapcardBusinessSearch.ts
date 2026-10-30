// "Find your business": a typed name becomes a short list of real businesses (name, address, website, phone) from
// Google Places, so setup is a tap instead of typing. Public endpoint, so it is rate limited per IP, results are cached
// for ten minutes, and a daily cap keeps the Places bill bounded. With no key, or past the cap, it returns an empty list
// and the apps fall back to typing the name and website.
import { createHash } from "crypto";
import sql from "@/lib/db";
import { formatHours } from "@/lib/siteLinks";
import { hereDetails, hereSearch, tomtomSearch } from "@/lib/placeProviders";

// Customers' lookups and the restaurant list-finder (src=finder) have separate daily allowances, so one can't starve the other.
const DAILY_CAP = 400;
const FINDER_CAP = 1500;
const DEVICE_CAP = 10; // Google lookups per phone per day (apps send their install id as `device`; it is hashed and only counted; Apple's search on the phone is free and tried first)

export interface BusinessHit { id: string; name: string; address: string; website: string; phone: string; type: string; hours: string }

const cache = new Map<string, { at: number; hits: BusinessHit[] }>();

let ready: Promise<unknown> | null = null;
function ensureSchema(): Promise<unknown> {
  if (!ready) {
    ready = Promise.all([
      sql`CREATE TABLE IF NOT EXISTS tapcard_lookup_cap (day DATE PRIMARY KEY, n INTEGER NOT NULL DEFAULT 0)`,
      sql`CREATE TABLE IF NOT EXISTS tapcard_lookup_cap_finder (day DATE PRIMARY KEY, n INTEGER NOT NULL DEFAULT 0)`,
      sql`CREATE TABLE IF NOT EXISTS tapcard_lookup_cap_device (day DATE NOT NULL, device_hash TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, device_hash))`,
    ]).catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

// The apps search as the person types, so "royal", "royal malta" and "royal malta yacht club" arrive seconds apart: one typing
// session counts as one lookup, not one per pause. Remembered per device in memory (best effort across server instances).
const lastQuery = new Map<string, { q: string; at: number }>();
function sameTypingSession(device: string, q: string): boolean {
  const now = Date.now(), n = q.toLowerCase().trim(), prev = lastQuery.get(device);
  if (lastQuery.size > 2000) lastQuery.clear();
  lastQuery.set(device, { q: n, at: now });
  return !!prev && now - prev.at < 45_000 && (n.startsWith(prev.q) || prev.q.startsWith(n));
}

async function underDeviceCap(device: string): Promise<boolean> {
  await ensureSchema();
  const hash = createHash("sha256").update(`tapcard-lookup|${device}`).digest("hex").slice(0, 32);
  const r = (await sql`
    INSERT INTO tapcard_lookup_cap_device (day, device_hash, n) VALUES (CURRENT_DATE, ${hash}, 1)
    ON CONFLICT (day, device_hash) DO UPDATE SET n = tapcard_lookup_cap_device.n + 1 RETURNING n
  `) as { n: number }[];
  return (r[0]?.n ?? 0) <= DEVICE_CAP;
}

async function underCap(finder: boolean): Promise<boolean> {
  await ensureSchema();
  const r = (finder
    ? await sql`INSERT INTO tapcard_lookup_cap_finder (day, n) VALUES (CURRENT_DATE, 1) ON CONFLICT (day) DO UPDATE SET n = tapcard_lookup_cap_finder.n + 1 RETURNING n`
    : await sql`INSERT INTO tapcard_lookup_cap (day, n) VALUES (CURRENT_DATE, 1) ON CONFLICT (day) DO UPDATE SET n = tapcard_lookup_cap.n + 1 RETURNING n`) as { n: number }[];
  const ok = (r[0]?.n ?? 0) <= (finder ? FINDER_CAP : DAILY_CAP);
  if (!ok) console.warn(`business-search: daily cap reached (${finder ? "finder" : "customers"})`);
  return ok;
}

// Google's website field often carries campaign parameters (utm_source=...): keep just the address people would type.
const cleanSite = (u: string) => { try { const x = new URL(u); return `${x.protocol}//${x.hostname}${x.pathname === "/" ? "" : x.pathname.replace(/\/$/, "")}`; } catch { return ""; } };

// Google's weekly periods (day 0 = Sunday) as the "Mon–Fri 09:00–17:00; Sat 10:00–16:00" text the cards use. A day with two
// sittings (lunch and dinner), a 24-hour place, or anything odd gives "" rather than a guess.
function hoursOf(periods?: { open?: { day?: number; hour?: number; minute?: number }; close?: { day?: number; hour?: number; minute?: number } }[]): string {
  if (!periods?.length) return "";
  const hh = (h = 0, m = 0) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  const specs: { days: number[]; opens: string; closes: string }[] = [];
  for (const p of periods) {
    if (!p.open || !p.close || p.open.day === undefined) return "";
    specs.push({ days: [(p.open.day + 6) % 7], opens: hh(p.open.hour, p.open.minute), closes: hh(p.close.hour, p.close.minute) });
  }
  return formatHours(specs).slice(0, 200);
}

/// `free` (the new apps' "Find your business") tries TomTom, then HERE, before Google: they cost nothing and have their own daily limits, and
/// Google (paid, capped per phone) is only the last resort. Their ids start "tomtom:" or "here:", so they never carry a Google review link.
/// Without `free` (older apps, the Google-listing dialog, the restaurant finder) it is Google only, exactly as before.
export async function searchBusinesses(queryRaw: string, near?: { lat: number; lng: number } | null, finder = false, device = "", free = false): Promise<BusinessHit[]> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const q = queryRaw.trim().slice(0, 100);
  if (q.length < 3) return [];
  // The searcher's rough area (from their connection, never stored) puts the nearest branch first: a local branch first, not one in another city.
  const area = near && Number.isFinite(near.lat) && Number.isFinite(near.lng) && Math.abs(near.lat) <= 90 && Math.abs(near.lng) <= 180 ? near : null;
  const useFree = free && !finder;
  const cacheKey = `${useFree ? "free|" : ""}${q.toLowerCase()}|${area ? `${area.lat.toFixed(1)},${area.lng.toFixed(1)}` : ""}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < 10 * 60_000) return cached.hits;
  let weakFree: BusinessHit[] = [];
  if (useFree) {
    // A free result is only worth showing when it has a website (that is what builds the card). A bare name and address, which is often a
    // stale or wrong listing, falls through to the next provider and finally to Google; it is shown only if Google has nothing either.
    const useful = (h: BusinessHit[]) => h.some((x) => x.website);
    // TomTom and HERE weigh the name over the town ("PizzaExpress Clifton Bristol" gives London branches), so a result only counts when every
    // typed word that is not in its name (the town) appears in its address.
    const words = q.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3);
    const inTown = (h: BusinessHit) => {
      const name = h.name.toLowerCase(), addr = h.address.toLowerCase();
      return words.filter((w) => !name.includes(w)).every((w) => addr.includes(w));
    };
    const tt = (await tomtomSearch(q, area)).filter(inTown);
    let found = tt;
    if (!useful(found)) { const hr = (await hereSearch(q, area)).filter(inTown); if (useful(hr) || !found.length) found = hr; }
    if (useful(found)) {
      // TomTom has no opening hours (Google gave them): the first few results still without any get them from HERE, which does.
      await Promise.all(found.filter((h) => !h.hours).slice(0, 3).map(async (h) => {
        const d = await hereDetails(h.name, h.address, area ?? undefined);
        h.hours = d.hours; h.phone ||= d.phone; h.website ||= d.website;
      }));
      if (cache.size > 500) cache.clear();
      cache.set(cacheKey, { at: Date.now(), hits: found });
      return found;
    }
    if (!key) return found;
    weakFree = found;
  }
  if (!key) return [];
  // A phone past its own 20 a day gets nothing (the apps then use their on-device fallback or typing); cached answers above are free.
  if (!finder && device && !sameTypingSession(device, q) && !(await underDeviceCap(device).catch(() => true))) return [];
  if (!(await underCap(finder).catch(() => false))) return [];
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json", "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.websiteUri,places.internationalPhoneNumber,places.primaryTypeDisplayName,places.regularOpeningHours",
    },
    body: JSON.stringify({
      textQuery: q, maxResultCount: 5, regionCode: "GB",
      ...(area ? { locationBias: { circle: { center: { latitude: area.lat, longitude: area.lng }, radius: 30000 } } } : {}),
    }),
    signal: AbortSignal.timeout(6000),
  }).catch(() => null);
  if (!res?.ok) { console.warn(`business-search: Google Places ${res ? res.status : "no response"}`); return useFree ? weakFree : []; }
  const j = (await res.json().catch(() => ({}))) as { places?: { id?: string; displayName?: { text?: string }; formattedAddress?: string; websiteUri?: string; internationalPhoneNumber?: string; primaryTypeDisplayName?: { text?: string }; regularOpeningHours?: { periods?: { open?: { day?: number; hour?: number; minute?: number }; close?: { day?: number; hour?: number; minute?: number } }[] } }[] };
  const hits: BusinessHit[] = (j.places ?? []).flatMap((p) => p.id && p.displayName?.text ? [{
    id: p.id, name: p.displayName.text.slice(0, 120), address: (p.formattedAddress ?? "").slice(0, 200),
    website: cleanSite(p.websiteUri ?? "").slice(0, 200), phone: (p.internationalPhoneNumber ?? "").slice(0, 40), type: (p.primaryTypeDisplayName?.text ?? "").slice(0, 60), hours: hoursOf(p.regularOpeningHours?.periods),
  }] : []);
  const result = hits.length || !useFree ? hits : weakFree;
  if (cache.size > 500) cache.clear();
  cache.set(cacheKey, { at: Date.now(), hits: result });
  return result;
}
