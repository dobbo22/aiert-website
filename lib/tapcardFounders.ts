import crypto from "crypto";
import sql from "@/lib/db";

// TapCard's "first 1,000 free for life" ladder. The app sends Apple's signed
// AppTransaction (who downloaded it, and when) on launch; each Apple ID is
// counted once, in order. Places 1–1,000 are founders (free for life);
// after that, sharing a card needs a one-off lifetime unlock whose price
// steps up £1 per 1,000 people, from £0.99 to £4.99, then £9.99 from the
// 10,001st person. Each person keeps the price that was current when they
// were first counted.

export const FREE_PLACES = 1000;
const BUNDLE_ID = "com.mailbroom.tapcard";

/// One non-consumable in-app purchase per price step (App Store Connect),
/// each starting at the given place in the count.
export const LIFETIME_TIERS = [
  { fromPlace: 1001, productId: "com.mailbroom.tapcard.lifetime1", price: "£0.99" },
  { fromPlace: 2001, productId: "com.mailbroom.tapcard.lifetime2", price: "£1.99" },
  { fromPlace: 3001, productId: "com.mailbroom.tapcard.lifetime3", price: "£2.99" },
  { fromPlace: 4001, productId: "com.mailbroom.tapcard.lifetime4", price: "£3.99" },
  { fromPlace: 5001, productId: "com.mailbroom.tapcard.lifetime5", price: "£4.99" },
  { fromPlace: 10001, productId: "com.mailbroom.tapcard.lifetime6", price: "£9.99" },
];

/// Downloads before this moment are founders whatever their place (they
/// got TapCard before there was any paywall). Set TAPCARD_PAYWALL_LAUNCH
/// (ISO date) to the release of the version with the paywall.
function paywallLaunch(): Date | null {
  const v = process.env.TAPCARD_PAYWALL_LAUNCH;
  const d = v ? new Date(v) : null;
  return d && !isNaN(d.getTime()) ? d : null;
}

/// TestFlight/Sandbox has its own count; TAPCARD_SANDBOX_FREE_PLACES=0
/// lets testers see the paywall straight away.
function freePlaces(environment: string): number {
  if (environment === "Production") return FREE_PLACES;
  const n = Number(process.env.TAPCARD_SANDBOX_FREE_PLACES);
  return Number.isFinite(n) && n >= 0 ? n : FREE_PLACES;
}

/// 0 = free (founder), otherwise LIFETIME_TIERS[tier - 1]. A Sandbox count
/// with fewer free places is shifted so its ladder starts at £0.99 too.
export function tierForPlace(place: number, environment = "Production"): number {
  const free = freePlaces(environment);
  if (place <= free) return 0;
  const effective = place + (FREE_PLACES - free);
  let tier = 0;
  LIFETIME_TIERS.forEach((t, i) => {
    if (effective >= t.fromPlace) tier = i + 1;
  });
  return Math.max(1, tier);
}

let schemaReady: Promise<unknown> | null = null;
function ensureSchema() {
  if (!schemaReady) {
    schemaReady = sql`
      CREATE TABLE IF NOT EXISTS tapcard_app_claims (
        id SERIAL PRIMARY KEY,
        claim_key TEXT NOT NULL UNIQUE,
        platform TEXT NOT NULL,
        environment TEXT NOT NULL,
        original_purchase_at TIMESTAMPTZ,
        place INTEGER,
        tier INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `.catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

// ---------------------------------------------------------------- Apple JWS

/// SHA-256 of Apple's "Apple Root CA - G3" — the root every App Store JWS
/// chains up to (https://www.apple.com/certificateauthority/).
const APPLE_ROOT_CA_G3_FINGERPRINT =
  "63:34:3A:BF:B8:9A:6A:03:EB:B5:7E:9B:3F:5F:A7:BE:7C:4F:5C:75:6F:30:17:B3:A8:C4:88:C3:65:3E:91:79";

export type AppTransactionPayload = {
  bundleId: string;
  receiptType: string; // "Production" | "Sandbox" | "Xcode"
  originalPurchaseDate?: number;
  appTransactionId?: string;
  originalApplicationVersion?: string;
};

/// Verifies an App Store–signed JWS (ES256, x5c chain to Apple's root) and
/// returns its payload. Throws if anything doesn't check out.
export function verifyAppleJws(jws: string, rootFingerprint = APPLE_ROOT_CA_G3_FINGERPRINT): AppTransactionPayload {
  const parts = jws.split(".");
  if (parts.length !== 3) throw new Error("Not a JWS");
  const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")) as { alg?: string; x5c?: string[] };
  if (header.alg !== "ES256" || !header.x5c?.length) throw new Error("Unexpected JWS header");

  const certs = header.x5c.map((c) => new crypto.X509Certificate(Buffer.from(c, "base64")));
  const now = Date.now();
  for (const cert of certs) {
    if (new Date(cert.validFrom).getTime() > now || new Date(cert.validTo).getTime() < now) throw new Error("Certificate out of date");
  }
  for (let i = 0; i < certs.length - 1; i++) {
    if (!certs[i].checkIssued(certs[i + 1]) || !certs[i].verify(certs[i + 1].publicKey)) throw new Error("Broken certificate chain");
  }
  if (certs[certs.length - 1].fingerprint256 !== rootFingerprint) throw new Error("Not signed by Apple");

  const ok = crypto.verify(
    "sha256",
    Buffer.from(`${parts[0]}.${parts[1]}`),
    { key: certs[0].publicKey, dsaEncoding: "ieee-p1363" },
    Buffer.from(parts[2], "base64url"),
  );
  if (!ok) throw new Error("Bad signature");
  return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as AppTransactionPayload;
}

// ------------------------------------------------------------------ claims

export type FounderStatus = {
  place: number;
  founder: boolean;
  /// What an unlock costs this person (null for founders).
  productId: string | null;
  price: string | null;
  freePlacesLeft: number;
};

/// Counts this Apple ID (once — later calls return the same place) and
/// says whether they're a founder or which unlock they'd buy.
export async function claimPlace(app: AppTransactionPayload): Promise<FounderStatus> {
  if (app.bundleId !== BUNDLE_ID) throw new Error("Wrong app");
  const environment = app.receiptType === "Production" ? "Production" : "Sandbox";
  // appTransactionId is unique per Apple ID + app; older payloads lack it,
  // and the original download time (to the millisecond) does the job.
  const identity = app.appTransactionId ?? `${app.originalPurchaseDate ?? ""}`;
  if (!identity) throw new Error("No transaction identity");
  const claimKey = crypto.createHash("sha256").update(`ios|${environment}|${identity}`).digest("hex");
  const originalAt = app.originalPurchaseDate ? new Date(app.originalPurchaseDate) : null;

  await ensureSchema();
  const inserted = (await sql`
    INSERT INTO tapcard_app_claims (claim_key, platform, environment, original_purchase_at)
    VALUES (${claimKey}, 'ios', ${environment}, ${originalAt})
    ON CONFLICT (claim_key) DO UPDATE SET last_seen_at = now()
    RETURNING id, place, tier
  `) as { id: number; place: number | null; tier: number | null }[];
  let { place, tier } = inserted[0];
  if (place == null || tier == null) {
    // Place = how many in this environment were counted up to and including them.
    const rank = (await sql`
      SELECT COUNT(*)::int AS n FROM tapcard_app_claims WHERE environment = ${environment} AND id <= ${inserted[0].id}
    `) as { n: number }[];
    place = rank[0].n;
    const launch = paywallLaunch();
    tier = originalAt && launch && originalAt < launch ? 0 : tierForPlace(place, environment);
    await sql`UPDATE tapcard_app_claims SET place = ${place}, tier = ${tier} WHERE id = ${inserted[0].id}`;
  }
  const status = await ladderStatus(environment);
  const unlock = tier > 0 ? LIFETIME_TIERS[tier - 1] : null;
  return { place, founder: tier === 0, productId: unlock?.productId ?? null, price: unlock?.price ?? null, freePlacesLeft: status.freePlacesLeft };
}

/// Where the ladder is now: people counted, free places left, and the
/// unlock a newcomer would be offered.
export async function ladderStatus(environment = "Production") {
  await ensureSchema();
  const rows = (await sql`SELECT COUNT(*)::int AS n FROM tapcard_app_claims WHERE environment = ${environment}`) as { n: number }[];
  const counted = rows[0]?.n ?? 0;
  const nextTier = tierForPlace(counted + 1, environment);
  const unlock = nextTier > 0 ? LIFETIME_TIERS[nextTier - 1] : null;
  return {
    counted,
    freePlacesLeft: Math.max(0, freePlaces(environment) - counted),
    nextProductId: unlock?.productId ?? null,
    nextPrice: unlock?.price ?? "Free",
  };
}

/// The live offer for invites: {freeOffer} (a sentence in the message) and
/// {offerSubject} (the email subject) — free places left, or the price once
/// they've gone.
export async function founderOffer(): Promise<{ line: string; subject: string }> {
  const status = await ladderStatus().catch(() => null);
  const first = FREE_PLACES.toLocaleString("en-GB");
  if (!status) {
    return { line: `It's free for life for the first ${first} people, so grab your place now.`, subject: "Free founder place: TapCard for iPhone" };
  }
  if (status.freePlacesLeft > 0) {
    const left = status.freePlacesLeft.toLocaleString("en-GB");
    return {
      line: `It's free for life for the first ${first} people, and there are only ${left} free founder places left, so grab yours now.`,
      subject: `Free founder place: TapCard for iPhone (${left} left)`,
    };
  }
  return {
    line: `The free founder places have all gone, but it's just ${status.nextPrice} for life — a one-off payment, no subscription.`,
    subject: `TapCard for iPhone: ${status.nextPrice} for life`,
  };
}
