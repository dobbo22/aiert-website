import crypto from "node:crypto";
import sql from "@/lib/db";

// Event QR codes for a LISTED company: the company names a meeting or event ("AGM 2026", "London roadshow"), gets its own QR code, and
// each follow that came through it is tagged with that event. No location is read or stored: the tag is only which code was scanned.

let ready: Promise<unknown> | null = null;
function ensureEventSchema(): Promise<unknown> {
  if (!ready) {
    ready = sql`
      CREATE TABLE IF NOT EXISTS tapcard_listed_events (
        code TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        label TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`
      .then(() => sql`ALTER TABLE tapcard_listed_events ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ`)
      .then(() => sql`ALTER TABLE tapcard_listed_events ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ`)
      .then(() => sql`CREATE INDEX IF NOT EXISTS tapcard_listed_events_org ON tapcard_listed_events (org_id)`)
      .catch((e) => { ready = null; throw e; });
  }
  return ready;
}

export const EVENT_CODE_RE = /^[A-Za-z0-9_-]{4,12}$/;
export const MAX_EVENTS = 50;

export function cleanEventLabel(v: unknown): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, 60) : "";
}

export interface ListedEvent { code: string; label: string; createdAt: string; followers: number; startsAt: string | null; endsAt: string | null }

export const MAX_WINDOW_DAYS = 14;

/// An optional event window: both ends, in order, no longer than two weeks. Returns null for "no window", or an error.
export function parseWindow(startsAt: unknown, endsAt: unknown): { start: Date; end: Date } | null | { error: string } {
  const has = (v: unknown) => typeof v === "string" && v.trim() !== "";
  if (!has(startsAt) && !has(endsAt)) return null;
  if (!has(startsAt) || !has(endsAt)) return { error: "Give both a start and an end, or neither." };
  const start = new Date(String(startsAt)), end = new Date(String(endsAt));
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return { error: "That date or time does not look right." };
  if (end <= start) return { error: "The end must be after the start." };
  if (end.getTime() - start.getTime() > MAX_WINDOW_DAYS * 86_400_000) return { error: `An event window can be at most ${MAX_WINDOW_DAYS} days.` };
  return { start, end };
}

export async function createEvent(orgId: string, label: string, startsAt?: unknown, endsAt?: unknown): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  await ensureEventSchema();
  const win = parseWindow(startsAt, endsAt);
  if (win && "error" in win) return { ok: false, error: win.error };
  const clean = cleanEventLabel(label);
  if (clean.length < 2) return { ok: false, error: "Give the event a name, for example AGM 2026." };
  const n = (await sql`SELECT COUNT(*)::int AS n FROM tapcard_listed_events WHERE org_id = ${orgId}`) as { n: number }[];
  if ((n[0]?.n ?? 0) >= MAX_EVENTS) return { ok: false, error: "That is the most events one company can have." };
  const code = crypto.randomBytes(6).toString("base64url").slice(0, 8);
  await sql`INSERT INTO tapcard_listed_events (code, org_id, label, starts_at, ends_at) VALUES (${code}, ${orgId}, ${clean}, ${win ? win.start.toISOString() : null}, ${win ? win.end.toISOString() : null})`;
  return { ok: true, code };
}

export async function deleteEvent(orgId: string, code: string): Promise<void> {
  await ensureEventSchema();
  await sql`DELETE FROM tapcard_listed_events WHERE code = ${code} AND org_id = ${orgId}`;
}

// EVERY event a follower came through is recorded (one row per follower and event), not only the first. Rows hold the hashed follower id
// only; a name shows beside an event only when that person chose to share their details. Unfollowing or deleting the card removes them.
let attReady: Promise<unknown> | null = null;
export function ensureAttendanceTable(): Promise<unknown> {
  if (!attReady) {
    attReady = ensureFollowerEventColumn()
      .then(() => sql`
        CREATE TABLE IF NOT EXISTS tapcard_event_attendance (
          card_id TEXT NOT NULL,
          follower_hash TEXT NOT NULL,
          event_code TEXT NOT NULL,
          via TEXT NOT NULL DEFAULT 'code',
          first_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          PRIMARY KEY (card_id, follower_hash, event_code)
        )`)
      .then(() => sql`CREATE INDEX IF NOT EXISTS tapcard_event_attendance_code ON tapcard_event_attendance (event_code)`)
      // Earlier single tags become the first row (safe to repeat).
      .then(() => sql`INSERT INTO tapcard_event_attendance (card_id, follower_hash, event_code, via, first_at)
                      SELECT card_id, follower_hash, event_code, CASE WHEN event_via = 'window' THEN 'window' ELSE 'code' END, created_at
                      FROM tapcard_followers WHERE event_code <> '' ON CONFLICT DO NOTHING`)
      .catch((e) => { attReady = null; throw e; });
  }
  return attReady;
}

/// A follower came through an event (a scanned code, or a running event window). Repeats (the apps re-send at launch) change nothing.
export async function recordAttendance(cardId: string, followerHash: string, eventCode: string, via: "code" | "window"): Promise<void> {
  if (!eventCode) return;
  await ensureAttendanceTable();
  await sql`INSERT INTO tapcard_event_attendance (card_id, follower_hash, event_code, via) VALUES (${cardId}, ${followerHash}, ${eventCode}, ${via}) ON CONFLICT DO NOTHING`;
}

export async function removeAttendance(cardId: string, followerHash?: string): Promise<void> {
  await ensureAttendanceTable();
  if (followerHash) await sql`DELETE FROM tapcard_event_attendance WHERE card_id = ${cardId} AND follower_hash = ${followerHash}`;
  else await sql`DELETE FROM tapcard_event_attendance WHERE card_id = ${cardId}`;
}

/// The company's events, newest first, with how many current followers came through each.
export async function listEvents(orgId: string): Promise<ListedEvent[]> {
  await ensureEventSchema();
  await ensureAttendanceTable();
  const rows = (await sql`
    SELECT e.code, e.label, e.created_at, e.starts_at, e.ends_at,
      (SELECT COUNT(*)::int FROM tapcard_event_attendance a WHERE a.event_code = e.code) AS followers
    FROM tapcard_listed_events e WHERE e.org_id = ${orgId} ORDER BY COALESCE(e.starts_at, e.created_at) DESC`) as { code: string; label: string; created_at: string; starts_at: string | null; ends_at: string | null; followers: number }[];
  return rows.map((r) => ({
    code: r.code, label: r.label, createdAt: new Date(r.created_at).toISOString(), followers: Number(r.followers),
    startsAt: r.starts_at ? new Date(r.starts_at).toISOString() : null, endsAt: r.ends_at ? new Date(r.ends_at).toISOString() : null,
  }));
}

/// A code the app sent is only kept if it is a real event of the company that owns the card being followed.
export async function eventCodeForOrg(code: unknown, orgId: string | null): Promise<string> {
  if (typeof code !== "string" || !EVENT_CODE_RE.test(code) || !orgId) return "";
  await ensureEventSchema();
  const r = (await sql`SELECT 1 FROM tapcard_listed_events WHERE code = ${code} AND org_id = ${orgId}`) as unknown[];
  return r.length ? code : "";
}

/// The event running right now for a company (an event window that has started and not ended); the latest start wins. "" if none.
export async function activeEventForOrg(orgId: string | null, now: Date = new Date()): Promise<string> {
  if (!orgId) return "";
  await ensureEventSchema();
  const r = (await sql`
    SELECT code FROM tapcard_listed_events
    WHERE org_id = ${orgId} AND starts_at IS NOT NULL AND ends_at IS NOT NULL AND starts_at <= ${now.toISOString()} AND ends_at > ${now.toISOString()}
    ORDER BY starts_at DESC LIMIT 1`) as { code: string }[];
  return r[0]?.code ?? "";
}

let colReady: Promise<unknown> | null = null;
export function ensureFollowerEventColumn(): Promise<unknown> {
  if (!colReady) {
    colReady = import("@/lib/tapcardOffers").then(({ followerCount }) => followerCount("_")) // creates tapcard_followers if missing
      .then(() => sql`ALTER TABLE tapcard_followers ADD COLUMN IF NOT EXISTS event_code TEXT NOT NULL DEFAULT ''`)
      .then(() => sql`ALTER TABLE tapcard_followers ADD COLUMN IF NOT EXISTS event_via TEXT NOT NULL DEFAULT ''`)
      .catch((e) => { colReady = null; throw e; });
  }
  return colReady;
}
