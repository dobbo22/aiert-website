// Finds a restaurant's Google "write a review" link and its Tripadvisor page by name and address, using the
// providers' own APIs (never scraping). Both keys are optional: with no key the lookup returns nothing.
// Results are cached per name+address so each restaurant is looked up once, and a daily cap stops a public
// endpoint from running up the bill. Results are only ever offered as suggestions the owner ticks.
import crypto from "crypto";
import sql from "@/lib/db";
import { postcodeOf } from "@/lib/siteLinks";

const DAILY_CAP = 300;
const TTL_DAYS = 30;

export interface ReviewLinks { google?: string; tripadvisor?: string }

let ready: Promise<unknown> | null = null;
function ensureSchema(): Promise<unknown> {
  if (!ready) {
    ready = sql`
      CREATE TABLE IF NOT EXISTS tapcard_review_cache (
        key_hash TEXT PRIMARY KEY,
        google TEXT NOT NULL DEFAULT '',
        tripadvisor TEXT NOT NULL DEFAULT '',
        fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `.catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

const words = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length >= 4);
// The provider's place name must share a real word with what the owner typed, or it is probably another business.
const similar = (a: string, b: string) => { const bw = new Set(words(b)); return words(a).some((w) => bw.has(w)); };
const samePostcode = (card: string, found: string) => { const c = postcodeOf(card); return !c || !postcodeOf(found) || c === postcodeOf(found); };

const hostOf = (u: string) => { try { return new URL(/^[a-z]+:\/\//i.test(u) ? u : `https://${u}`).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; } };

async function googleLink(name: string, address: string, website = ""): Promise<string | undefined> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return undefined;
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.websiteUri" },
    body: JSON.stringify({ textQuery: `${name} ${address}`.trim(), maxResultCount: 1, regionCode: "GB" }),
  }).catch(() => null);
  if (!res?.ok) {
    console.error("review lookup: google places failed", res?.status, res ? (await res.text().catch(() => "")).slice(0, 300) : "no response");
    return undefined;
  }
  const p = ((await res.json().catch(() => ({}))) as { places?: { id?: string; displayName?: { text?: string }; formattedAddress?: string; websiteUri?: string }[] }).places?.[0];
  // With a website entered, the place's own website must match it: a different business with the same name is not this one.
  const wanted = hostOf(website), theirs = hostOf(p?.websiteUri ?? "");
  const siteMismatch = !!wanted && !!theirs && wanted !== theirs;
  if (!p?.id || !similar(p.displayName?.text ?? "", name) || !samePostcode(address, p.formattedAddress ?? "") || siteMismatch) {
    console.error("review lookup: google match rejected", p?.displayName?.text, p?.formattedAddress);
    return undefined;
  }
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(p.id)}`;
}

async function tripadvisorLink(name: string, address: string): Promise<string | undefined> {
  const key = process.env.TRIPADVISOR_API_KEY;
  if (!key) return undefined;
  const q = new URLSearchParams({ key, searchQuery: name, address, language: "en" });
  const res = await fetch(`https://api.content.tripadvisor.com/api/v1/location/search?${q}`, { headers: { Accept: "application/json" } }).catch(() => null);
  if (!res?.ok) return undefined;
  const hit = ((await res.json().catch(() => ({}))) as { data?: { location_id?: string; name?: string; address_obj?: { postalcode?: string; address_string?: string } }[] }).data?.[0];
  if (!hit?.location_id || !similar(hit.name ?? "", name) || !samePostcode(address, `${hit.address_obj?.postalcode ?? ""} ${hit.address_obj?.address_string ?? ""}`)) return undefined;
  const d = await fetch(`https://api.content.tripadvisor.com/api/v1/location/${encodeURIComponent(hit.location_id)}/details?key=${encodeURIComponent(key)}&language=en`, { headers: { Accept: "application/json" } }).catch(() => null);
  if (!d?.ok) return undefined;
  const j = (await d.json().catch(() => ({}))) as { write_review?: string; web_url?: string };
  const url = j.write_review || j.web_url;
  return url && /^https:\/\/([a-z]+\.)?tripadvisor\./i.test(url) ? url : undefined;
}

export async function findReviewLinks(name: string, address: string, website = ""): Promise<ReviewLinks> {
  if (!process.env.GOOGLE_PLACES_API_KEY && !process.env.TRIPADVISOR_API_KEY) return {};
  const n = name.trim().slice(0, 120);
  const a = address.trim().slice(0, 200);
  if (n.length < 3 || (a.length < 6 && n.length < 6)) return {};
  await ensureSchema();
  const keyHash = crypto.createHash("sha256").update(`${n.toLowerCase()}|${a.toLowerCase()}|${hostOf(website)}`).digest("hex");
  // Found links are kept for 30 days; "found nothing" only for an hour, so a failed lookup or a key added later is retried.
  const cached = (await sql`
    SELECT google, tripadvisor FROM tapcard_review_cache
    WHERE key_hash = ${keyHash}
      AND ((google <> '' OR tripadvisor <> '') AND fetched_at > now() - ${TTL_DAYS + " days"}::interval OR fetched_at > now() - interval '1 hour')
  `) as { google: string; tripadvisor: string }[];
  if (cached[0]) return { google: cached[0].google || undefined, tripadvisor: cached[0].tripadvisor || undefined };
  const today = (await sql`SELECT COUNT(*)::int AS n FROM tapcard_review_cache WHERE fetched_at > now() - interval '1 day'`) as { n: number }[];
  if ((today[0]?.n ?? 0) >= DAILY_CAP) return {};
  const [google, tripadvisor] = await Promise.all([googleLink(n, a, website), tripadvisorLink(n, a)]);
  await sql`
    INSERT INTO tapcard_review_cache (key_hash, google, tripadvisor) VALUES (${keyHash}, ${google ?? ""}, ${tripadvisor ?? ""})
    ON CONFLICT (key_hash) DO UPDATE SET google = EXCLUDED.google, tripadvisor = EXCLUDED.tripadvisor, fetched_at = now()
  `;
  return { google, tripadvisor };
}
