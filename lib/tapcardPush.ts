// Real push notifications for offers and updates: Apple's push service (APNs) for iPhone, Google's (FCM) for Android.
// What we store (Neon): one device token per app install, keyed by the same hashed per-install id as the follower
// count, and per business followed the person's choices (offers / ending soon / changes / news). No name, email or
// contact details. Tokens go when someone unfollows, when Apple or Google says the device is gone, or after 90 days.
// The "at most two notifications a week per business" rule is enforced here, so it can't be bypassed.
// With no keys configured every send is skipped, so this can ship before the keys exist.
import crypto from "crypto";
import http2 from "http2";
import sql from "@/lib/db";
import { hashSecret } from "@/lib/tapcardAuth";

export type PushKind = "offers" | "ending" | "changes" | "news";
export interface PushPrefs { offers: boolean; ending: boolean; changes: boolean; news: boolean }

const WEEKLY_CAP = 2;
const MAX_PER_SEND = 5000;
const BUNDLE_ID = "com.mailbroom.tapcard";

let ready: Promise<unknown> | null = null;
function ensureSchema(): Promise<unknown> {
  if (!ready) {
    ready = sql`
      CREATE TABLE IF NOT EXISTS tapcard_push_devices (
        follower_hash TEXT PRIMARY KEY,
        platform TEXT NOT NULL,
        token TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `
      .then(() => sql`
        CREATE TABLE IF NOT EXISTS tapcard_push_prefs (
          card_id TEXT NOT NULL,
          follower_hash TEXT NOT NULL,
          offers BOOLEAN NOT NULL DEFAULT true,
          ending BOOLEAN NOT NULL DEFAULT true,
          changes BOOLEAN NOT NULL DEFAULT true,
          news BOOLEAN NOT NULL DEFAULT true,
          PRIMARY KEY (card_id, follower_hash)
        )
      `)
      .then(() => sql`
        CREATE TABLE IF NOT EXISTS tapcard_push_log (
          card_id TEXT NOT NULL,
          follower_hash TEXT NOT NULL,
          kind TEXT NOT NULL,
          ref TEXT NOT NULL,
          sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `)
      .then(() => sql`CREATE INDEX IF NOT EXISTS tapcard_push_log_card ON tapcard_push_log (card_id, follower_hash, sent_at)`)
      .catch((e) => {
        ready = null;
        throw e;
      });
  }
  return ready;
}

const followerHash = (follower: string) => hashSecret(`tapcard-follower:${follower}`);

// ---- registration (called by the apps)

export async function registerDevice(follower: string, platform: string, token: string): Promise<void> {
  await ensureSchema();
  const p = platform === "android" ? "android" : "ios";
  await sql`
    INSERT INTO tapcard_push_devices (follower_hash, platform, token) VALUES (${followerHash(follower)}, ${p}, ${token.slice(0, 400)})
    ON CONFLICT (follower_hash) DO UPDATE SET platform = EXCLUDED.platform, token = EXCLUDED.token, updated_at = now()
  `;
}

/// Called alongside the follower count: remembers (or forgets) which kinds of message this install wants from a business.
export async function setPushPrefs(cardId: string, follower: string, follow: boolean, prefs?: Partial<PushPrefs>): Promise<void> {
  await ensureSchema();
  const who = followerHash(follower);
  if (!follow) {
    await sql`DELETE FROM tapcard_push_prefs WHERE card_id = ${cardId} AND follower_hash = ${who}`;
    return;
  }
  const o = prefs?.offers !== false, e = prefs?.ending !== false, c = prefs?.changes !== false, n = prefs?.news !== false;
  await sql`
    INSERT INTO tapcard_push_prefs (card_id, follower_hash, offers, ending, changes, news) VALUES (${cardId}, ${who}, ${o}, ${e}, ${c}, ${n})
    ON CONFLICT (card_id, follower_hash) DO UPDATE SET offers = ${o}, ending = ${e}, changes = ${c}, news = ${n}
  `;
}

export async function forgetDevice(follower: string): Promise<void> {
  await ensureSchema();
  const who = followerHash(follower);
  await sql`DELETE FROM tapcard_push_prefs WHERE follower_hash = ${who}`;
  await sql`DELETE FROM tapcard_push_devices WHERE follower_hash = ${who}`;
}

// ---- Apple (APNs, token-based auth)

const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64url");
let apnsJwt: { value: string; at: number } | null = null;

export function apnsConfigured(): boolean {
  return !!(process.env.APNS_KEY_P8 && process.env.APNS_KEY_ID);
}

/// ES256 JWT for APNs: header {alg, kid}, claims {iss: team id, iat}; Apple wants it refreshed between 20 and 60 minutes.
export function makeApnsJwt(p8: string, keyId: string, teamId: string, now = Math.floor(Date.now() / 1000)): string {
  const unsigned = `${b64url(JSON.stringify({ alg: "ES256", kid: keyId }))}.${b64url(JSON.stringify({ iss: teamId, iat: now }))}`;
  const sig = crypto.sign("sha256", Buffer.from(unsigned), { key: p8, dsaEncoding: "ieee-p1363" });
  return `${unsigned}.${b64url(sig)}`;
}

function apnsAuth(): string {
  if (apnsJwt && Date.now() - apnsJwt.at < 40 * 60_000) return apnsJwt.value;
  const p8 = (process.env.APNS_KEY_P8 ?? "").replace(/\\n/g, "\n");
  const value = makeApnsJwt(p8, process.env.APNS_KEY_ID ?? "", process.env.APNS_TEAM_ID || "ATMHQQQQ5S");
  apnsJwt = { value, at: Date.now() };
  return value;
}

type SendResult = "ok" | "dead" | "error";

function apnsSend(client: http2.ClientHttp2Session, token: string, payload: object): Promise<{ result: SendResult; reason?: string }> {
  return new Promise((resolve) => {
    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${token}`,
      authorization: `bearer ${apnsAuth()}`,
      "apns-topic": process.env.APNS_TOPIC || BUNDLE_ID,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json",
    });
    let status = 0;
    let body = "";
    req.setTimeout(10_000, () => { req.close(); resolve({ result: "error", reason: "timeout" }); });
    req.on("response", (h) => { status = Number(h[":status"] ?? 0); });
    req.on("data", (d) => { body += d; });
    req.on("end", () => {
      if (status === 200) return resolve({ result: "ok" });
      let reason = "";
      try { reason = (JSON.parse(body) as { reason?: string }).reason ?? ""; } catch { /* no body */ }
      resolve({ result: status === 410 || reason === "BadDeviceToken" || reason === "Unregistered" || reason === "DeviceTokenNotForTopic" ? "dead" : "error", reason });
    });
    req.on("error", () => resolve({ result: "error", reason: "network" }));
    req.end(JSON.stringify(payload));
  });
}

// ---- Google (FCM HTTP v1)

let fcmToken: { value: string; exp: number } | null = null;

export function fcmConfigured(): boolean {
  return !!process.env.FCM_SA_JSON;
}

async function fcmAccessToken(): Promise<{ token: string; project: string }> {
  const sa = JSON.parse(process.env.FCM_SA_JSON ?? "{}") as { client_email: string; private_key: string; project_id: string };
  if (fcmToken && fcmToken.exp > Date.now() + 60_000) return { token: fcmToken.value, project: sa.project_id };
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(JSON.stringify({
    iss: sa.client_email, scope: "https://www.googleapis.com/auth/firebase.messaging", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600,
  }))}`;
  const assertion = `${unsigned}.${b64url(crypto.sign("RSA-SHA256", Buffer.from(unsigned), sa.private_key))}`;
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  const j = (await r.json()) as { access_token?: string; expires_in?: number };
  if (!j.access_token) throw new Error("FCM auth failed");
  fcmToken = { value: j.access_token, exp: Date.now() + (j.expires_in ?? 3000) * 1000 };
  return { token: j.access_token, project: sa.project_id };
}

async function fcmSend(token: string, title: string, body: string, data: Record<string, string>): Promise<{ result: SendResult; reason?: string }> {
  try {
    const auth = await fcmAccessToken();
    const r = await fetch(`https://fcm.googleapis.com/v1/projects/${auth.project}/messages:send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${auth.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ message: { token, data: { title, body, ...data }, android: { priority: "HIGH" } } }),
    });
    if (r.ok) return { result: "ok" };
    const text = await r.text();
    return { result: r.status === 404 || /UNREGISTERED|INVALID_ARGUMENT/.test(text) ? "dead" : "error", reason: text.slice(0, 120) };
  } catch (e) {
    return { result: "error", reason: e instanceof Error ? e.message : "error" };
  }
}

// ---- sending

export interface PushMessage { title: string; body: string; ref: string }

/// Pushes one message to everyone who follows `cardId`, wants this kind, hasn't had two from this business this week,
/// and hasn't already had this one (same kind + ref). Never throws: a failed push must not fail the post that caused it.
export async function pushToFollowers(cardId: string, kind: PushKind, msg: PushMessage): Promise<{ sent: number; skipped: boolean }> {
  try {
    if (!apnsConfigured() && !fcmConfigured()) return { sent: 0, skipped: true };
    await ensureSchema();
    const rows = (await sql`
      SELECT p.follower_hash, d.platform, d.token
      FROM tapcard_push_prefs p JOIN tapcard_push_devices d ON d.follower_hash = p.follower_hash
      WHERE p.card_id = ${cardId}
        AND (CASE ${kind} WHEN 'offers' THEN p.offers WHEN 'ending' THEN p.ending WHEN 'changes' THEN p.changes ELSE p.news END)
        AND (SELECT COUNT(*) FROM tapcard_push_log l WHERE l.card_id = p.card_id AND l.follower_hash = p.follower_hash AND l.sent_at > now() - interval '7 days') < ${WEEKLY_CAP}
        AND NOT EXISTS (SELECT 1 FROM tapcard_push_log l WHERE l.card_id = p.card_id AND l.follower_hash = p.follower_hash AND l.kind = ${kind} AND l.ref = ${msg.ref})
      LIMIT ${MAX_PER_SEND}
    `) as { follower_hash: string; platform: string; token: string }[];
    if (!rows.length) return { sent: 0, skipped: false };

    const data = { cardId, kind, ref: msg.ref };
    const aps = { aps: { alert: { title: msg.title, body: msg.body }, sound: "default", "thread-id": cardId }, tapcard: data };
    const client = apnsConfigured() && rows.some((r) => r.platform === "ios") ? http2.connect("https://api.push.apple.com") : null;
    client?.on("error", () => {});
    const sandbox = process.env.APNS_SANDBOX_FALLBACK === "1" ? http2.connect("https://api.sandbox.push.apple.com") : null;
    sandbox?.on("error", () => {});
    let sent = 0;
    const dead: string[] = [];
    const done: string[] = [];
    const queue = [...rows];
    const worker = async () => {
      for (let r = queue.shift(); r; r = queue.shift()) {
        let out: { result: SendResult; reason?: string };
        if (r.platform === "android") out = fcmConfigured() ? await fcmSend(r.token, msg.title, msg.body, data) : { result: "error" };
        else if (client) {
          out = await apnsSend(client, r.token, aps);
          if (out.result === "dead" && sandbox) out = await apnsSend(sandbox, r.token, aps);
        } else out = { result: "error" };
        if (out.result === "ok") { sent++; done.push(r.follower_hash); }
        else if (out.result === "dead") { dead.push(r.follower_hash); console.error("push: dead token", r.platform, out.reason ?? ""); }
        else console.error("push: send failed", r.platform, out.reason ?? "");
      }
    };
    await Promise.all(Array.from({ length: 12 }, worker));
    console.log(`push: ${kind} for card ${cardId.slice(0, 6)}: ${rows.length} phone(s) tried, ${sent} accepted`);
    client?.close();
    sandbox?.close();
    if (done.length) {
      await sql`INSERT INTO tapcard_push_log (card_id, follower_hash, kind, ref) SELECT ${cardId}, h, ${kind}, ${msg.ref} FROM unnest(${done}::text[]) AS h`;
    }
    if (dead.length) await sql`DELETE FROM tapcard_push_devices WHERE follower_hash = ANY(${dead})`;
    return { sent, skipped: false };
  } catch (e) {
    console.error("push failed", e);
    return { sent: 0, skipped: false };
  }
}

/// Daily housekeeping: old send records, tokens nobody has refreshed for 90 days, and tokens with no business followed.
export async function cleanupPush(): Promise<void> {
  await ensureSchema();
  await sql`DELETE FROM tapcard_push_log WHERE sent_at < now() - interval '14 days'`;
  await sql`DELETE FROM tapcard_push_devices WHERE updated_at < now() - interval '90 days'`;
  await sql`
    DELETE FROM tapcard_push_devices d WHERE d.updated_at < now() - interval '30 days'
      AND NOT EXISTS (SELECT 1 FROM tapcard_push_prefs p WHERE p.follower_hash = d.follower_hash)
  `;
}
