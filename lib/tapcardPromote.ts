// TapCard Promote: the paid subscription that lets a business post offers and news (and includes sharing).
// The phones check the store themselves; this proves it to the server. The app sends Apple's signed
// transaction (iPhone) or the Google Play purchase token (Android) with the card's edit token; we verify it
// with the store and remember until when that card is paid up. Posting offers and news needs it once
// TAPCARD_PROMOTE_ENFORCE=1 (left off until the apps that send the proof are live).
import crypto from "crypto";
import sql from "@/lib/db";
import { verifyAppleJwsRaw } from "@/lib/tapcardFounders";
import { getOrg, isOrgActive } from "@/lib/tapcardBiz";
import { activeGrant } from "@/lib/tapcardGrants";
import { businessDomain } from "@/lib/tapcardDomain";

const BUNDLE_ID = "com.mailbroom.tapcard";
export const PROMOTE_IOS_IDS = [
  "com.mailbroom.tapcard.promote.year", "com.mailbroom.tapcard.promote.month",
  "com.mailbroom.tapcard.promotegroup.year", "com.mailbroom.tapcard.promotegroup.month",
];
// Android: two subscription products, "promote" (one card) and "promote_group" (up to GROUP_CARDS cards).
export const PROMOTE_ANDROID_IDS = ["promote", "promote_group"];
export const GROUP_CARDS = 5;

/// How many cards one subscription covers: 1, or GROUP_CARDS on the group plan.
export function cardsCovered(productId: string): number {
  return /promotegroup|promote_group/.test(productId) ? GROUP_CARDS : 1;
}

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
  /// true when a paid TapCard for Business company covers this card (no in-app subscription needed).
  company?: boolean;
  /// true when the card has a complimentary Promote (a charity, society or early business), not a subscription.
  granted?: boolean;
}

/// A company card is covered while its company's TapCard for Business billing is active.
async function companyCover(cardId: string): Promise<PromoteStatus | null> {
  const row = ((await sql`SELECT org_id FROM tapcard_cards WHERE id = ${cardId}`) as { org_id: string | null }[])[0];
  if (!row?.org_id) return null;
  const org = await getOrg(row.org_id);
  if (!org || !isOrgActive(org)) return null;
  const until = org.current_period_end ? new Date(org.current_period_end).toISOString() : null;
  return { active: true, until, trial: false, company: true };
}

export async function promoteStatus(cardId: string): Promise<PromoteStatus> {
  await ensureSchema();
  const company = await companyCover(cardId).catch(() => null);
  if (company) return company;
  // A complimentary Promote: counts like a company cover (the apps need no subscription), flagged so it can be worded differently.
  const grant = await activeGrant(cardId).catch(() => null);
  if (grant) return { active: true, until: grant.until, trial: false, company: true, granted: true };
  const row = ((await sql`SELECT until, trial FROM tapcard_promote WHERE card_id = ${cardId}`) as { until: string; trial: boolean }[])[0];
  if (!row) return { active: false, until: null, trial: false };
  return { active: new Date(row.until).getTime() > Date.now(), until: new Date(row.until).toISOString(), trial: row.trial };
}

/// Posting offers and news needs an active Promote, once enforcement is switched on.
export async function promoteAllowed(cardId: string): Promise<boolean> {
  if (process.env.TAPCARD_PROMOTE_ENFORCE !== "1") return true;
  return (await promoteStatus(cardId)).active;
}

interface Verified { until: Date; trial: boolean; platform: "ios" | "android"; productId: string; originalId: string; plan?: string }

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
  const item = j.lineItems?.find((l) => l.productId && PROMOTE_ANDROID_IDS.includes(l.productId));
  if (!item?.expiryTime) throw new Error("Not a Promote subscription");
  const okStates = ["SUBSCRIPTION_STATE_ACTIVE", "SUBSCRIPTION_STATE_IN_GRACE_PERIOD", "SUBSCRIPTION_STATE_CANCELED"];
  if (!j.subscriptionState || !okStates.includes(j.subscriptionState)) throw new Error("This subscription isn't active");
  const until = new Date(item.expiryTime);
  if (until.getTime() <= Date.now()) throw new Error("This subscription has ended");
  const started = j.startTime ? new Date(j.startTime).getTime() : 0;
  const trial = item.offerDetails?.offerId === "trial3m" && Date.now() < started + 95 * 24 * 3600 * 1000;
  return { until, trial, platform: "android", productId: item.productId!, originalId: purchaseToken.slice(0, 24) };
}

/// One Promote subscription covers ONE card. A second card on the same subscription is refused, unless the owner
/// moves it (at most once every 30 days, so it can't be passed around between restaurants).
export class PromoteLimitError extends Error {
  constructor(public otherCardId: string, public canMove: boolean, public limit = 1) {
    super(limit > 1
      ? (canMove
        ? `This group plan already covers ${limit} cards. You can move one to this card.`
        : `This group plan already covers ${limit} cards, and one was moved recently. Email enquiries@aiert.co.uk to add more.`)
      : (canMove
        ? "This Promote subscription is already on another of your cards. You can move it to this card. For several locations, email enquiries@aiert.co.uk about TapCard for Business."
        : "This Promote subscription is already on another of your cards, and was moved recently. For several locations, email enquiries@aiert.co.uk about TapCard for Business."));
  }
}
const MOVE_COOLDOWN_DAYS = 30;

/// The 3-month free trial belongs to an Apple ID (or Google account), not to a business, so a business could otherwise start a new trial
/// with each new account. It is therefore remembered per business: by the domain it verified, and by its website's domain. A trial that
/// arrives for a business that already had one on a DIFFERENT subscription is refused; the same subscription renewing is fine, and a paid
/// (non-trial) purchase is never affected.
export class TrialUsedError extends Error {
  constructor() {
    super("This business has already had its 3 months free, on another Apple ID or Google account, so the free trial can't be used again. Promote starts when your first payment is taken, or you can sign in with the account you first used.");
  }
}

let trialReady: Promise<unknown> | null = null;
function ensureTrialSchema(): Promise<unknown> {
  if (!trialReady) {
    trialReady = sql`
      CREATE TABLE IF NOT EXISTS tapcard_promote_trials (
        business_key TEXT PRIMARY KEY,
        original_id TEXT NOT NULL,
        card_id TEXT NOT NULL,
        platform TEXT NOT NULL,
        started_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `
      // The verified domain column is made by the verification code the first time it runs; the trial check must not depend on that having happened.
      .then(() => sql`ALTER TABLE tapcard_cards ADD COLUMN IF NOT EXISTS verified_domain TEXT NOT NULL DEFAULT ''`)
      .catch((err) => { trialReady = null; throw err; });
  }
  return trialReady;
}

async function claimTrial(cardId: string, v: Verified): Promise<void> {
  await ensureTrialSchema();
  const row = ((await sql`SELECT website, verified_domain FROM tapcard_cards WHERE id = ${cardId}`) as { website: string; verified_domain: string }[])[0];
  const keys = [...new Set([row?.verified_domain ?? "", businessDomain(row?.website ?? "")].filter(Boolean))];
  // A business with no domain of its own can only be held to its own card.
  if (!keys.length) keys.push(`card:${cardId}`);
  const seen = (await sql`SELECT business_key, original_id FROM tapcard_promote_trials WHERE business_key = ANY(${keys})`) as { business_key: string; original_id: string }[];
  if (seen.some((s) => s.original_id !== v.originalId)) throw new TrialUsedError();
  for (const k of keys) {
    await sql`INSERT INTO tapcard_promote_trials (business_key, original_id, card_id, platform) VALUES (${k}, ${v.originalId}, ${cardId}, ${v.platform}) ON CONFLICT (business_key) DO NOTHING`;
  }
}

/// Stores what the store confirmed for this card, keeping the later of the two end dates.
export async function saveVerified(cardId: string, v: Verified, opts: { move?: boolean } = {}): Promise<PromoteStatus> {
  await ensureSchema();
  if (v.trial) await claimTrial(cardId, v);
  if (v.originalId) {
    const others = (await sql`
      SELECT card_id, updated_at FROM tapcard_promote
      WHERE original_id = ${v.originalId} AND card_id <> ${cardId} AND until > now()
      ORDER BY updated_at ASC
    `) as { card_id: string; updated_at: string }[];
    const limit = cardsCovered(v.productId);
    if (others.length >= limit) {
      // Full. The oldest card can be moved to this one, once every 30 days.
      const oldest = others[0];
      const movedLongAgo = Date.now() - new Date(oldest.updated_at).getTime() > MOVE_COOLDOWN_DAYS * 86_400_000;
      if (!opts.move || !movedLongAgo) throw new PromoteLimitError(oldest.card_id, movedLongAgo, limit);
      await sql`UPDATE tapcard_promote SET until = now(), updated_at = now() WHERE card_id = ${oldest.card_id}`;
    }
  }
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
