// TapCard Promote: the paid subscription that lets a business post offers and news (and includes sharing).
// The phones check the store themselves; this proves it to the server. The app sends Apple's signed
// transaction (iPhone) or the Google Play purchase token (Android) with the card's edit token; we verify it
// with the store and remember until when that card is paid up. Posting offers and news needs it once
// TAPCARD_PROMOTE_ENFORCE=1 (left off until the apps that send the proof are live).
import crypto from "crypto";
import sql from "@/lib/db";
import { verifyAppleJwsRaw } from "@/lib/tapcardFounders";

const BUNDLE_ID = "com.mailbroom.tapcard";
export const PROMOTE_IOS_IDS = ["com.mailbroom.tapcard.promote.year", "com.mailbroom.tapcard.promote.month"];
export const PROMOTE_ANDROID_ID = "promote";

let ready: Promise<unknown> | null = null;
function ensureSchema(): Promise<unknown> {
  if (!ready) {
    ready = sql`
      CREATE TABLE IF NOT EXISTS tapcard_promote (
        card_id TEXT PRIMARY KEY,
        until TIMESTAMPTZ NOT NULL,
        trial BOOLEAN NOT NULL DEFAULT false,
        platform TEXT NOT NULL,
        product_id TEXT NOT NULL DEFAULT '',
        original_id TEXT NOT NULL DEFAULT '',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `.catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}

export interface PromoteStatus {
  active: boolean;
  until: string | null;
  trial: boolean;
}

export async function promoteStatus(cardId: string): Promise<PromoteStatus> {
  await ensureSchema();
  const row = ((await sql`SELECT until, trial FROM tapcard_promote WHERE card_id = ${cardId}`) as { until: string; trial: boolean }[])[0];
  if (!row) return { active: false, until: null, trial: false };
  return { active: new Date(row.until).getTime() > Date.now(), until: new Date(row.until).toISOString(), trial: row.trial };
}

/// Posting offers and news needs an active Promote, once enforcement is switched on.
export async function promoteAllowed(cardId: string): Promise<boolean> {
  if (process.env.TAPCARD_PROMOTE_ENFORCE !== "1") return true;
  return (await promoteStatus(cardId)).active;
}

interface Verified { until: Date; trial: boolean; platform: "ios" | "android"; productId: string; originalId: string }

export async function verifyIos(jws: string): Promise<Verified> {
  const p = verifyAppleJwsRaw(jws) as {
    bundleId?: string; productId?: string; expiresDate?: number; originalTransactionId?: string; revocationDate?: number; offerType?: number;
  };
  if (p.bundleId !== BUNDLE_ID) throw new Error("Wrong app");
  if (!p.productId || !PROMOTE_IOS_IDS.includes(p.productId)) throw new Error("Not a Promote subscription");
  if (p.revocationDate) throw new Error("This purchase was refunded");
  if (!p.expiresDate || p.expiresDate <= Date.now()) throw new Error("This subscription has ended");
  return { until: new Date(p.expiresDate), trial: p.offerType === 1, platform: "ios", productId: p.productId, originalId: String(p.originalTransactionId ?? "") };
}

// ---- Google Play

let gToken: { value: string; exp: number } | null = null;
async function googleToken(): Promise<string> {
  if (gToken && gToken.exp > Date.now() + 60_000) return gToken.value;
  const raw = process.env.GOOGLE_PLAY_SA_JSON;
  if (!raw) throw new Error("Android verification is not set up on the server yet");
  const sa = JSON.parse(raw) as { client_email: string; private_key: string };
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/androidpublisher", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 })}`;
  const assertion = `${unsigned}.${crypto.sign("RSA-SHA256", Buffer.from(unsigned), sa.private_key).toString("base64url")}`;
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  const j = (await r.json()) as { access_token?: string; expires_in?: number };
  if (!j.access_token) throw new Error("Couldn't reach Google Play");
  gToken = { value: j.access_token, exp: Date.now() + (j.expires_in ?? 3000) * 1000 };
  return gToken.value;
}

export async function verifyAndroid(purchaseToken: string): Promise<Verified> {
  if (!/^[\w.\-]{20,600}$/.test(purchaseToken)) throw new Error("Bad purchase token");
  const r = await fetch(
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${BUNDLE_ID}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`,
    { headers: { Authorization: `Bearer ${await googleToken()}` } },
  );
  if (!r.ok) throw new Error(`Google Play couldn't confirm this purchase (${r.status})`);
  const j = (await r.json()) as {
    subscriptionState?: string;
    startTime?: string;
    lineItems?: { productId?: string; expiryTime?: string; offerDetails?: { offerId?: string } }[];
  };
  const item = j.lineItems?.find((l) => l.productId === PROMOTE_ANDROID_ID);
  if (!item?.expiryTime) throw new Error("Not a Promote subscription");
  const okStates = ["SUBSCRIPTION_STATE_ACTIVE", "SUBSCRIPTION_STATE_IN_GRACE_PERIOD", "SUBSCRIPTION_STATE_CANCELED"];
  if (!j.subscriptionState || !okStates.includes(j.subscriptionState)) throw new Error("This subscription isn't active");
  const until = new Date(item.expiryTime);
  if (until.getTime() <= Date.now()) throw new Error("This subscription has ended");
  const started = j.startTime ? new Date(j.startTime).getTime() : 0;
  const trial = item.offerDetails?.offerId === "trial3m" && Date.now() < started + 95 * 24 * 3600 * 1000;
  return { until, trial, platform: "android", productId: PROMOTE_ANDROID_ID, originalId: purchaseToken.slice(0, 24) };
}

/// Stores what the store confirmed for this card, keeping the later of the two end dates.
export async function saveVerified(cardId: string, v: Verified): Promise<PromoteStatus> {
  await ensureSchema();
  await sql`
    INSERT INTO tapcard_promote (card_id, until, trial, platform, product_id, original_id)
    VALUES (${cardId}, ${v.until.toISOString()}, ${v.trial}, ${v.platform}, ${v.productId}, ${v.originalId})
    ON CONFLICT (card_id) DO UPDATE SET
      until = GREATEST(tapcard_promote.until, EXCLUDED.until),
      trial = CASE WHEN EXCLUDED.until >= tapcard_promote.until THEN EXCLUDED.trial ELSE tapcard_promote.trial END,
      platform = EXCLUDED.platform, product_id = EXCLUDED.product_id, original_id = EXCLUDED.original_id, updated_at = now()
  `;
  return promoteStatus(cardId);
}
