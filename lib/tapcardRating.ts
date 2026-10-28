// Google rating for a business ("4.6 from 1,234 reviews") shown on its TapCard, from Google Places by place id (the id is already
// in the card's "Review us on Google" link). Google's terms limit storing Places content, so nothing is saved: answers are held
// in memory for a few hours (and cached by the CDN), a daily cap keeps the bill bounded, and the apps show "Google" next to it.
// With no key, or past the cap, it returns null and the card simply shows no rating. Tripadvisor is not read: its ratings need
// their API, so the card only links to its review page.
import sql from "@/lib/db";

// Each lookup is a paid Google call, so the cap is low and an answer is held for a day (the CDN holds it too): the busiest businesses keep
// their stars and the bill stays small.
const DAILY_CAP = 300;
const HOLD_MS = 24 * 3600_000;

export interface GoogleRating { rating: number; count: number }

const memory = new Map<string, { at: number; value: GoogleRating | null }>();

let ready: Promise<unknown> | null = null;
function ensureSchema(): Promise<unknown> {
  if (!ready) {
    ready = sql`CREATE TABLE IF NOT EXISTS tapcard_rating_cap (day DATE PRIMARY KEY, n INTEGER NOT NULL DEFAULT 0)`.catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

async function underCap(): Promise<boolean> {
  await ensureSchema();
  const r = (await sql`
    INSERT INTO tapcard_rating_cap (day, n) VALUES (CURRENT_DATE, 1)
    ON CONFLICT (day) DO UPDATE SET n = tapcard_rating_cap.n + 1 RETURNING n
  `) as { n: number }[];
  const ok = (r[0]?.n ?? 0) <= DAILY_CAP;
  if (!ok) console.warn("rating lookup: daily cap reached");
  return ok;
}

/** The card's Google place id, from its review link ("…/writereview?placeid=<id>"), or "" if there is none. */
export function placeIdFromLinks(links: { kind?: string; value?: string }[] | null | undefined): string {
  const link = (links ?? []).find((l) => l.kind === "google_review" && l.value);
  const m = link?.value?.match(/[?&]placeid=([A-Za-z0-9_-]{10,200})/);
  return m?.[1] ?? "";
}

export async function placeRating(placeId: string): Promise<GoogleRating | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key || !/^[A-Za-z0-9_-]{10,200}$/.test(placeId)) return null;
  const held = memory.get(placeId);
  if (held && Date.now() - held.at < HOLD_MS) return held.value;
  if (!(await underCap().catch(() => false))) return null;
  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "rating,userRatingCount" },
    signal: AbortSignal.timeout(6000),
  }).catch(() => null);
  if (!res?.ok) {
    console.warn(`rating lookup: Google Places ${res ? res.status : "no response"}`);
    return null;
  }
  const j = (await res.json().catch(() => ({}))) as { rating?: number; userRatingCount?: number };
  const value = typeof j.rating === "number" && j.rating > 0 ? { rating: Math.round(j.rating * 10) / 10, count: Math.max(0, j.userRatingCount ?? 0) } : null;
  if (memory.size > 2000) memory.clear();
  memory.set(placeId, { at: Date.now(), value });
  return value;
}
