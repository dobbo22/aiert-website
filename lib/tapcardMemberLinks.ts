// Member links (enterprise): a company such as a football club gives each of its members a personal link or QR code that carries an opaque
// token. TapCard keeps the token and nothing else about the member (no member number, name, email or ticket). When a phone follows, joins a
// group, unfollows or claims an offer through such a link, TapCard records an event {token, event, time} for the company, which it can
// receive at its own web address (signed) or collect on request with a key. Only the company can match a token to a person, because only
// the company holds the list. Nothing here runs for a company that has not been switched on, and an ordinary follow never depends on it:
// every call from the follow and claim routes is wrapped so that a failure here cannot stop a follow.
import sql from "@/lib/db";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const EVENT_RETENTION_DAYS = 90;
export const MAX_ACTIVE_KEYS = 5;
export const MAX_DELIVERY_ATTEMPTS = 8;
export type MemberEventName = "follow" | "unfollow" | "group_joined" | "offer_claimed" | "test";

let ready: Promise<unknown> | null = null;
export function ensureMemberLinkSchema(): Promise<unknown> {
  if (!ready) {
    ready = sql`
      CREATE TABLE IF NOT EXISTS tapcard_member_links (
        org_id TEXT PRIMARY KEY,
        webhook_url TEXT,
        secret_version INT NOT NULL DEFAULT 1,
        enabled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        enabled_by TEXT NOT NULL DEFAULT ''
      )`
      .then(() => sql`
        CREATE TABLE IF NOT EXISTS tapcard_member_keys (
          id SERIAL PRIMARY KEY,
          org_id TEXT NOT NULL,
          key_hash TEXT NOT NULL UNIQUE,
          label TEXT NOT NULL DEFAULT '',
          created_by TEXT NOT NULL DEFAULT '',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          last_used_at TIMESTAMPTZ,
          revoked_at TIMESTAMPTZ
        )`)
      .then(() => sql`
        CREATE TABLE IF NOT EXISTS tapcard_member_bindings (
          org_id TEXT NOT NULL,
          token_hash TEXT NOT NULL,
          card_id TEXT NOT NULL,
          follower_hash TEXT NOT NULL,
          token TEXT NOT NULL,
          group_slug TEXT NOT NULL DEFAULT '',
          bound_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          PRIMARY KEY (org_id, token_hash)
        )`)
      .then(() => sql`CREATE INDEX IF NOT EXISTS tapcard_member_bindings_follower ON tapcard_member_bindings (org_id, card_id, follower_hash)`)
      .then(() => sql`
        CREATE TABLE IF NOT EXISTS tapcard_member_events (
          id BIGSERIAL PRIMARY KEY,
          org_id TEXT NOT NULL,
          token TEXT NOT NULL,
          event TEXT NOT NULL,
          card_id TEXT NOT NULL DEFAULT '',
          group_slug TEXT NOT NULL DEFAULT '',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          attempts INT NOT NULL DEFAULT 0,
          next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          delivered_at TIMESTAMPTZ,
          last_status INT,
          last_error TEXT NOT NULL DEFAULT ''
        )`)
      .then(() => sql`CREATE INDEX IF NOT EXISTS tapcard_member_events_org ON tapcard_member_events (org_id, id)`)
      .catch((e) => {
        ready = null;
        throw e;
      });
  }
  return ready;
}

/// A token is chosen by the company: 16 to 64 letters, digits, dash or underscore (so it can sit in a link and is never a name or email).
export function cleanMemberToken(input: unknown): string {
  return typeof input === "string" && /^[A-Za-z0-9_-]{16,64}$/.test(input) ? input : "";
}

const sha = (v: string) => createHash("sha256").update(v).digest("hex");

// ---------- who has it switched on ----------

export interface MemberLinkConfig { orgId: string; webhookUrl: string; secretVersion: number; enabledAt: string }

/// The company's settings, or null when member links are not switched on for it (the normal case).
export async function memberLinkConfig(orgId: string | null | undefined): Promise<MemberLinkConfig | null> {
  if (!orgId) return null;
  await ensureMemberLinkSchema();
  const r = ((await sql`SELECT org_id, webhook_url, secret_version, enabled_at FROM tapcard_member_links WHERE org_id = ${orgId}`) as { org_id: string; webhook_url: string | null; secret_version: number; enabled_at: string }[])[0];
  return r ? { orgId: r.org_id, webhookUrl: r.webhook_url ?? "", secretVersion: Number(r.secret_version), enabledAt: String(r.enabled_at) } : null;
}

/// AIERT switches the feature on for a company (an enterprise feature). Safe to repeat.
export async function enableMemberLinks(orgId: string, by = ""): Promise<void> {
  await ensureMemberLinkSchema();
  await sql`INSERT INTO tapcard_member_links (org_id, enabled_by) VALUES (${orgId}, ${by}) ON CONFLICT (org_id) DO NOTHING`;
}

// ---------- signing ----------

function masterSecret(): string {
  return process.env.TAPCARD_BIZ_SESSION_SECRET ?? process.env.ADMIN_PASSWORD ?? "";
}

/// The company's signing secret is derived (never stored): the same company and version always give the same secret; rotating raises the version.
export function webhookSecret(orgId: string, version: number): string {
  return "whsec_" + createHmac("sha256", masterSecret()).update(`tapcard-member-webhook:${orgId}:${version}`).digest("hex");
}

/// The header value a receiver checks: t=<unix seconds>,v1=<HMAC-SHA256 of "<t>.<body>">. Receivers should refuse a timestamp more than five minutes old.
export function signBody(secret: string, body: string, ts: number): string {
  return `t=${ts},v1=${createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex")}`;
}

export function verifySignature(secret: string, body: string, header: string, nowSeconds = Math.floor(Date.now() / 1000), toleranceSeconds = 300): boolean {
  const m = /^t=(\d+),v1=([0-9a-f]{64})$/.exec(header);
  if (!m) return false;
  const ts = Number(m[1]);
  if (Math.abs(nowSeconds - ts) > toleranceSeconds) return false;
  const want = Buffer.from(signBody(secret, body, ts).split("v1=")[1], "hex");
  const got = Buffer.from(m[2], "hex");
  return want.length === got.length && timingSafeEqual(want, got);
}

// ---------- webhook address ----------

export const deps: { fetch: typeof fetch; isPublic: (host: string) => Promise<boolean> } = {
  fetch: (...a) => fetch(...a),
  isPublic: async (host) => (await import("@/lib/siteIcon")).isPublicHost(host),
};

/// Only a public https address, no user name or password, no odd port. A private or internal address is refused so a company cannot aim us at our own network.
export async function cleanWebhookUrl(input: unknown): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (typeof input !== "string" || !input.trim()) return { ok: false, error: "Enter the https address that should receive events." };
  let u: URL;
  try { u = new URL(input.trim()); } catch { return { ok: false, error: "That is not a web address." }; }
  if (u.protocol !== "https:") return { ok: false, error: "The address must start with https://." };
  if (u.username || u.password) return { ok: false, error: "Leave the user name and password out of the address." };
  if (u.port && u.port !== "443") return { ok: false, error: "Use the standard https port." };
  if (u.href.length > 500) return { ok: false, error: "That address is too long." };
  if (!(await deps.isPublic(u.hostname))) return { ok: false, error: "That address is not reachable from the internet, or is not a public site." };
  u.hash = "";
  return { ok: true, url: u.toString() };
}

export async function setWebhook(orgId: string, url: string | null): Promise<void> {
  await ensureMemberLinkSchema();
  await sql`UPDATE tapcard_member_links SET webhook_url = ${url} WHERE org_id = ${orgId}`;
}

/// A new signing secret: the old one stops working at once.
export async function rotateWebhookSecret(orgId: string): Promise<string | null> {
  await ensureMemberLinkSchema();
  const r = (await sql`UPDATE tapcard_member_links SET secret_version = secret_version + 1 WHERE org_id = ${orgId} RETURNING secret_version`) as { secret_version: number }[];
  return r[0] ? webhookSecret(orgId, Number(r[0].secret_version)) : null;
}

// ---------- events ----------

async function addEvent(orgId: string, token: string, event: MemberEventName, cardId: string, group = ""): Promise<number> {
  const r = (await sql`INSERT INTO tapcard_member_events (org_id, token, event, card_id, group_slug) VALUES (${orgId}, ${token}, ${event}, ${cardId}, ${group}) RETURNING id`) as { id: string | number }[];
  return Number(r[0].id);
}

export type FollowOutcome = "off" | "ignored" | "linked" | "unchanged" | "conflict" | "unlinked";

/// Called by the follow route after the follow itself is saved. `cardId` is the card the follow went to; `followerHash` the hashed install id.
/// A token binds to the first phone that uses it (one member, one phone); another phone presenting it is refused, and a reinstalled app can
/// link again after the old phone unfollowed. Returns what happened so the route can tell the app; it never throws into the follow.
export async function recordFollowEvent(args: { orgId: string | null; cardId: string; followerHash: string; follow: boolean; token: unknown; group: string }): Promise<{ outcome: FollowOutcome; eventIds: number[] }> {
  const none = (outcome: FollowOutcome) => ({ outcome, eventIds: [] as number[] });
  const cfg = await memberLinkConfig(args.orgId);
  if (!cfg) return none("off");
  const orgId = cfg.orgId;
  if (!args.follow) {
    const rows = (await sql`DELETE FROM tapcard_member_bindings WHERE org_id = ${orgId} AND card_id = ${args.cardId} AND follower_hash = ${args.followerHash} RETURNING token`) as { token: string }[];
    const ids: number[] = [];
    for (const r of rows) ids.push(await addEvent(orgId, r.token, "unfollow", args.cardId));
    return { outcome: rows.length ? "unlinked" : "ignored", eventIds: ids };
  }
  const token = cleanMemberToken(args.token);
  if (!token) return none("ignored");
  const th = sha(token);
  const bound = ((await sql`SELECT follower_hash, group_slug, card_id FROM tapcard_member_bindings WHERE org_id = ${orgId} AND token_hash = ${th}`) as { follower_hash: string; group_slug: string; card_id: string }[])[0];
  if (bound && bound.follower_hash !== args.followerHash) return none("conflict");
  const ids: number[] = [];
  if (!bound) {
    const ins = (await sql`INSERT INTO tapcard_member_bindings (org_id, token_hash, card_id, follower_hash, token, group_slug) VALUES (${orgId}, ${th}, ${args.cardId}, ${args.followerHash}, ${token}, ${args.group}) ON CONFLICT DO NOTHING RETURNING token_hash`) as unknown[];
    if (!ins.length) return none("conflict"); // another request bound it a moment ago
    ids.push(await addEvent(orgId, token, "follow", args.cardId));
    if (args.group) ids.push(await addEvent(orgId, token, "group_joined", args.cardId, args.group));
    return { outcome: "linked", eventIds: ids };
  }
  // Already linked (the apps re-send their follows whenever they open): only a newly joined group is news.
  if (args.group && bound.group_slug !== args.group) {
    await sql`UPDATE tapcard_member_bindings SET group_slug = ${args.group} WHERE org_id = ${orgId} AND token_hash = ${th}`;
    ids.push(await addEvent(orgId, token, "group_joined", args.cardId, args.group));
    return { outcome: "linked", eventIds: ids };
  }
  return none("unchanged");
}

/// An offer claim by a phone linked to a member token. Nothing happens when the phone is not linked or the company is not switched on.
export async function recordClaimEvent(args: { orgId: string | null; cardId: string; claimantHash: string }): Promise<number | null> {
  const cfg = await memberLinkConfig(args.orgId);
  if (!cfg) return null;
  const b = ((await sql`SELECT token, group_slug FROM tapcard_member_bindings WHERE org_id = ${cfg.orgId} AND follower_hash = ${args.claimantHash} LIMIT 1`) as { token: string; group_slug: string }[])[0];
  if (!b) return null;
  // Asking again for the same code is not a new claim: one claim event per member and card an hour.
  const recent = (await sql`SELECT 1 FROM tapcard_member_events WHERE org_id = ${cfg.orgId} AND token = ${b.token} AND card_id = ${args.cardId} AND event = 'offer_claimed' AND created_at > now() - interval '1 hour' LIMIT 1`) as unknown[];
  return recent.length ? null : addEvent(cfg.orgId, b.token, "offer_claimed", args.cardId, b.group_slug);
}

// ---------- delivery ----------

export interface MemberEventRow { id: number; token: string; event: string; cardId: string; group: string; at: string }
const toRow = (r: Record<string, unknown>): MemberEventRow => ({ id: Number(r.id), token: String(r.token), event: String(r.event), cardId: String(r.card_id), group: String(r.group_slug), at: new Date(String(r.created_at)).toISOString() });

export function eventBody(r: MemberEventRow): string {
  return JSON.stringify({ id: r.id, event: r.event, token: r.token, card: r.cardId, group: r.group || undefined, at: r.at });
}

async function deliverOne(cfg: MemberLinkConfig, row: Record<string, unknown>): Promise<{ ok: boolean; status: number | null; error: string }> {
  let url: URL;
  try { url = new URL(cfg.webhookUrl); } catch { return { ok: false, status: null, error: "no valid address set" }; }
  if (url.protocol !== "https:" || !(await deps.isPublic(url.hostname))) return { ok: false, status: null, error: "address is not a public https address" };
  const body = eventBody(toRow(row));
  const ts = Math.floor(Date.now() / 1000);
  try {
    const res = await deps.fetch(url, {
      method: "POST",
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
      headers: { "content-type": "application/json", "user-agent": "TapCard-Webhook/1", "x-tapcard-signature": signBody(webhookSecret(cfg.orgId, cfg.secretVersion), body, ts), "x-tapcard-event": String(row.event), "x-tapcard-delivery": String(row.id) },
      body,
    });
    return res.status >= 200 && res.status < 300 ? { ok: true, status: res.status, error: "" } : { ok: false, status: res.status, error: res.status >= 300 && res.status < 400 ? "redirects are not followed" : `receiver answered ${res.status}` };
  } catch (e) {
    return { ok: false, status: null, error: (e instanceof Error && e.name === "TimeoutError" ? "no answer within 5 seconds" : "could not connect").slice(0, 120) };
  }
}

/// Sends events that are due. A company with no address set just keeps them for collection. Failures retry with growing gaps (1, 2, 4 ... minutes, at most 6 hours) up to 8 times.
export async function deliverDue(limit = 50, onlyIds?: number[]): Promise<{ sent: number; failed: number }> {
  await ensureMemberLinkSchema();
  const due = (onlyIds?.length
    ? await sql`SELECT e.* FROM tapcard_member_events e WHERE e.id = ANY(${onlyIds}) AND e.delivered_at IS NULL AND e.attempts < ${MAX_DELIVERY_ATTEMPTS}`
    : await sql`SELECT e.* FROM tapcard_member_events e JOIN tapcard_member_links l ON l.org_id = e.org_id
        WHERE e.delivered_at IS NULL AND e.attempts < ${MAX_DELIVERY_ATTEMPTS} AND e.next_attempt_at <= now() AND COALESCE(l.webhook_url, '') <> ''
        ORDER BY e.id LIMIT ${limit}`) as Record<string, unknown>[];
  let sent = 0, failed = 0;
  const cfgs = new Map<string, MemberLinkConfig | null>();
  for (const row of due) {
    const orgId = String(row.org_id);
    if (!cfgs.has(orgId)) cfgs.set(orgId, await memberLinkConfig(orgId));
    const cfg = cfgs.get(orgId);
    if (!cfg || !cfg.webhookUrl) continue;
    const r = await deliverOne(cfg, row);
    if (r.ok) {
      sent++;
      await sql`UPDATE tapcard_member_events SET delivered_at = now(), attempts = attempts + 1, last_status = ${r.status}, last_error = '' WHERE id = ${row.id as number}`;
    } else {
      failed++;
      const attempts = Number(row.attempts) + 1;
      const waitMinutes = Math.min(2 ** (attempts - 1), 360);
      await sql`UPDATE tapcard_member_events SET attempts = ${attempts}, last_status = ${r.status}, last_error = ${r.error}, next_attempt_at = now() + (${waitMinutes} * interval '1 minute') WHERE id = ${row.id as number}`;
    }
  }
  return { sent, failed };
}

/// Called after a request: tries the new events at once so a company sees them quickly; the cron picks up whatever fails.
export async function deliverNow(ids: number[]): Promise<void> {
  if (ids.length) await deliverOne_safe(ids);
}
async function deliverOne_safe(ids: number[]) {
  try { await deliverDue(ids.length, ids); } catch { /* the cron retries */ }
}

/// A test event (token "test") sent to the company's address now, with the answer shown to the admin.
export async function sendTestEvent(orgId: string): Promise<{ ok: boolean; status: number | null; error: string }> {
  const cfg = await memberLinkConfig(orgId);
  if (!cfg) return { ok: false, status: null, error: "Member links are not switched on." };
  if (!cfg.webhookUrl) return { ok: false, status: null, error: "Set the address first." };
  const id = await addEvent(orgId, "test-event-not-a-member", "test", "");
  const row = ((await sql`SELECT * FROM tapcard_member_events WHERE id = ${id}`) as Record<string, unknown>[])[0];
  const r = await deliverOne(cfg, row);
  if (r.ok) await sql`UPDATE tapcard_member_events SET delivered_at = now(), attempts = 1, last_status = ${r.status} WHERE id = ${id}`;
  else await sql`UPDATE tapcard_member_events SET attempts = ${MAX_DELIVERY_ATTEMPTS}, last_status = ${r.status}, last_error = ${r.error} WHERE id = ${id}`;
  return r;
}

export interface DeliveryLogRow { id: number; event: string; at: string; delivered: boolean; attempts: number; status: number | null; error: string; waiting: boolean }
export async function deliveryLog(orgId: string, limit = 30): Promise<DeliveryLogRow[]> {
  await ensureMemberLinkSchema();
  const rows = (await sql`SELECT id, event, created_at, delivered_at, attempts, last_status, last_error FROM tapcard_member_events WHERE org_id = ${orgId} ORDER BY id DESC LIMIT ${limit}`) as Record<string, unknown>[];
  return rows.map((r) => ({ id: Number(r.id), event: String(r.event), at: new Date(String(r.created_at)).toISOString(), delivered: !!r.delivered_at, attempts: Number(r.attempts), status: r.last_status == null ? null : Number(r.last_status), error: String(r.last_error ?? ""), waiting: !r.delivered_at && Number(r.attempts) < MAX_DELIVERY_ATTEMPTS }));
}

export async function eventCounts(orgId: string): Promise<{ linked: number; events: number; undelivered: number }> {
  await ensureMemberLinkSchema();
  const a = ((await sql`SELECT count(*)::int AS n FROM tapcard_member_bindings WHERE org_id = ${orgId}`) as { n: number }[])[0];
  const b = ((await sql`SELECT count(*)::int AS n, count(*) FILTER (WHERE delivered_at IS NULL AND event <> 'test')::int AS u FROM tapcard_member_events WHERE org_id = ${orgId}`) as { n: number; u: number }[])[0];
  return { linked: Number(a?.n ?? 0), events: Number(b?.n ?? 0), undelivered: Number(b?.u ?? 0) };
}

// ---------- collecting on request (keys) ----------

export interface KeyRow { id: number; label: string; createdAt: string; lastUsedAt: string | null; revokedAt: string | null }

/// A key lets the company's own system collect its events. Shown once, stored only as a hash; at most five live at a time.
export async function createMemberKey(orgId: string, by: string, label: string): Promise<{ ok: true; key: string } | { ok: false; error: string }> {
  await ensureMemberLinkSchema();
  const live = ((await sql`SELECT count(*)::int AS n FROM tapcard_member_keys WHERE org_id = ${orgId} AND revoked_at IS NULL`) as { n: number }[])[0];
  if (Number(live?.n ?? 0) >= MAX_ACTIVE_KEYS) return { ok: false, error: `Up to ${MAX_ACTIVE_KEYS} keys can be live at once. Revoke one first.` };
  const key = "tcm_" + randomBytes(32).toString("base64url");
  await sql`INSERT INTO tapcard_member_keys (org_id, key_hash, label, created_by) VALUES (${orgId}, ${sha(key)}, ${label.trim().slice(0, 60)}, ${by})`;
  return { ok: true, key };
}

export async function listMemberKeys(orgId: string): Promise<KeyRow[]> {
  await ensureMemberLinkSchema();
  const rows = (await sql`SELECT id, label, created_at, last_used_at, revoked_at FROM tapcard_member_keys WHERE org_id = ${orgId} ORDER BY id DESC`) as Record<string, unknown>[];
  const iso = (v: unknown) => (v ? new Date(String(v)).toISOString() : null);
  return rows.map((r) => ({ id: Number(r.id), label: String(r.label), createdAt: iso(r.created_at) as string, lastUsedAt: iso(r.last_used_at), revokedAt: iso(r.revoked_at) }));
}

export async function revokeMemberKey(orgId: string, id: number): Promise<boolean> {
  await ensureMemberLinkSchema();
  const r = (await sql`UPDATE tapcard_member_keys SET revoked_at = now() WHERE id = ${id} AND org_id = ${orgId} AND revoked_at IS NULL RETURNING id`) as unknown[];
  return r.length > 0;
}

/// The company a "Bearer tcm_..." key belongs to, or null. A revoked key, or a company that is switched off, gets nothing.
export async function orgForKey(authorization: string | null): Promise<string | null> {
  const m = /^Bearer\s+(tcm_[A-Za-z0-9_-]{20,100})$/.exec(authorization ?? "");
  if (!m) return null;
  await ensureMemberLinkSchema();
  const r = ((await sql`SELECT k.id, k.org_id FROM tapcard_member_keys k JOIN tapcard_member_links l ON l.org_id = k.org_id WHERE k.key_hash = ${sha(m[1])} AND k.revoked_at IS NULL`) as { id: number; org_id: string }[])[0];
  if (!r) return null;
  await sql`UPDATE tapcard_member_keys SET last_used_at = now() WHERE id = ${r.id}`.catch(() => {});
  return r.org_id;
}

/// Events after a cursor (the id of the last one the company has), oldest first. `since` (an ISO time) is accepted when no cursor is given. Test events are left out.
export async function eventsAfter(orgId: string, after: number, limit = 500, since?: string): Promise<{ events: MemberEventRow[]; next: number }> {
  await ensureMemberLinkSchema();
  const lim = Math.min(Math.max(Math.floor(limit) || 500, 1), 1000);
  const t = since && !Number.isNaN(Date.parse(since)) ? new Date(since).toISOString() : null;
  const rows = (after > 0 || !t
    ? await sql`SELECT * FROM tapcard_member_events WHERE org_id = ${orgId} AND id > ${after} AND event <> 'test' ORDER BY id LIMIT ${lim}`
    : await sql`SELECT * FROM tapcard_member_events WHERE org_id = ${orgId} AND created_at >= ${t} AND event <> 'test' ORDER BY id LIMIT ${lim}`) as Record<string, unknown>[];
  const events = rows.map(toRow);
  return { events, next: events.length ? events[events.length - 1].id : after };
}

/// Housekeeping: events older than the retention period go, and so do links to phones that no longer follow.
export async function purgeMemberLinks(now = new Date()): Promise<{ events: number; bindings: number }> {
  await ensureMemberLinkSchema();
  const cutoff = new Date(now.getTime() - EVENT_RETENTION_DAYS * 86_400_000).toISOString();
  const e = (await sql`DELETE FROM tapcard_member_events WHERE created_at < ${cutoff} RETURNING id`) as unknown[];
  let bindings = 0;
  try {
    bindings = ((await sql`DELETE FROM tapcard_member_bindings b WHERE NOT EXISTS (SELECT 1 FROM tapcard_followers f WHERE f.card_id = b.card_id AND f.follower_hash = b.follower_hash) RETURNING 1`) as unknown[]).length;
  } catch { /* the followers table may not use this column name: leave links alone rather than guess */ }
  return { events: e.length, bindings };
}
