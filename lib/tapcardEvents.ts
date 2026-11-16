import crypto from "node:crypto";
import sql from "@/lib/db";
import { pickSlot } from "@/lib/tapcardShareRules";

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
      // Slots: one printed QR code for an event (a roadshow), the day split into timed slots (one per firm). A scan is recorded against the slot it falls in.
      .then(() => sql`CREATE TABLE IF NOT EXISTS tapcard_listed_event_slots (
        id SERIAL PRIMARY KEY,
        event_code TEXT NOT NULL,
        label TEXT NOT NULL,
        starts_at TIMESTAMPTZ NOT NULL,
        ends_at TIMESTAMPTZ NOT NULL
      )`)
      .then(() => sql`CREATE INDEX IF NOT EXISTS tapcard_listed_event_slots_code ON tapcard_listed_event_slots (event_code)`)
      .catch((e) => { ready = null; throw e; });
  }
  return ready;
}

export const EVENT_CODE_RE = /^[A-Za-z0-9_-]{4,12}$/;
export const MAX_EVENTS = 50;

export function cleanEventLabel(v: unknown): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, 60) : "";
}

export interface ListedEvent { code: string; label: string; createdAt: string; followers: number; startsAt: string | null; endsAt: string | null; slots: EventSlot[] }

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
  await sql`DELETE FROM tapcard_listed_event_slots WHERE event_code IN (SELECT code FROM tapcard_listed_events WHERE code = ${code} AND org_id = ${orgId})`;
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
      .then(() => sql`ALTER TABLE tapcard_event_attendance ADD COLUMN IF NOT EXISTS slot_id INT NOT NULL DEFAULT 0`)
      // One row per follower, event AND slot (a person can scan at two firms in one roadshow day).
      .then(() => sql`ALTER TABLE tapcard_event_attendance DROP CONSTRAINT IF EXISTS tapcard_event_attendance_pkey`)
      .then(() => sql`CREATE UNIQUE INDEX IF NOT EXISTS tapcard_event_attendance_uniq ON tapcard_event_attendance (card_id, follower_hash, event_code, slot_id)`)
      .then(() => sql`CREATE INDEX IF NOT EXISTS tapcard_event_attendance_code ON tapcard_event_attendance (event_code)`)
      // Earlier single tags become the first row, ONCE (a marker row says it is done). Running it on every cold start copied a tag written moments
      // earlier by a follow into slot 0 with the wrong time, ahead of the slot logic.
      .then(() => sql`CREATE TABLE IF NOT EXISTS tapcard_event_attendance_migrated (done BOOLEAN PRIMARY KEY)`)
      .then(async () => {
        const done = (await sql`SELECT 1 FROM tapcard_event_attendance_migrated`) as unknown[];
        if (done.length) return;
        await sql`INSERT INTO tapcard_event_attendance (card_id, follower_hash, event_code, via, first_at)
                  SELECT card_id, follower_hash, event_code, CASE WHEN event_via = 'window' THEN 'window' ELSE 'code' END, created_at
                  FROM tapcard_followers f WHERE f.event_code <> '' AND NOT EXISTS (SELECT 1 FROM tapcard_event_attendance a WHERE a.card_id = f.card_id AND a.follower_hash = f.follower_hash AND a.event_code = f.event_code) ON CONFLICT DO NOTHING`;
        await sql`INSERT INTO tapcard_event_attendance_migrated (done) VALUES (true) ON CONFLICT DO NOTHING`;
      })
      .catch((e) => { attReady = null; throw e; });
  }
  return attReady;
}

/// A follower came through an event (a scanned code, or a running event window). If the event has timed slots, the scan is recorded against
/// the slot its time falls in (`at` is when the app says the scan happened; without it, now). Repeats change nothing: an app that does not send
/// the scan time re-sends the follow at every launch, so it records only the first time for that event.
export async function recordAttendance(cardId: string, followerHash: string, eventCode: string, via: "code" | "window", at?: Date | null): Promise<void> {
  if (!eventCode) return;
  await ensureAttendanceTable();
  if (!at) {
    const have = (await sql`SELECT 1 FROM tapcard_event_attendance WHERE card_id = ${cardId} AND follower_hash = ${followerHash} AND event_code = ${eventCode} LIMIT 1`) as unknown[];
    if (have.length) return;
  }
  const when = at ?? new Date();
  const slot = await slotAt(eventCode, when);
  await sql`INSERT INTO tapcard_event_attendance (card_id, follower_hash, event_code, via, slot_id, first_at) VALUES (${cardId}, ${followerHash}, ${eventCode}, ${via}, ${slot?.id ?? 0}, ${when.toISOString()}) ON CONFLICT DO NOTHING`;
}

export async function removeAttendance(cardId: string, followerHash?: string): Promise<void> {
  await ensureAttendanceTable();
  if (followerHash) await sql`DELETE FROM tapcard_event_attendance WHERE card_id = ${cardId} AND follower_hash = ${followerHash}`;
  else await sql`DELETE FROM tapcard_event_attendance WHERE card_id = ${cardId}`;
}

export interface EventSlot { id: number; label: string; startsAt: string; endsAt: string; followers: number }

async function slotsOf(code: string): Promise<{ id: number; label: string; startsAt: string; endsAt: string }[]> {
  const rows = (await sql`SELECT id, label, starts_at, ends_at FROM tapcard_listed_event_slots WHERE event_code = ${code} ORDER BY starts_at`) as { id: number; label: string; starts_at: string; ends_at: string }[];
  return rows.map((r) => ({ id: Number(r.id), label: r.label, startsAt: new Date(r.starts_at).toISOString(), endsAt: new Date(r.ends_at).toISOString() }));
}

export async function slotAt(code: string, at: Date): Promise<{ id: number; label: string } | null> {
  await ensureEventSchema();
  return pickSlot(await slotsOf(code), at);
}

export async function addSlot(orgId: string, code: string, label: string, startsAt: unknown, endsAt: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  await ensureEventSchema();
  const own = (await sql`SELECT 1 FROM tapcard_listed_events WHERE code = ${code} AND org_id = ${orgId}`) as unknown[];
  if (!own.length) return { ok: false, error: "That event was not found." };
  const win = parseWindow(startsAt, endsAt);
  if (!win || "error" in win) return { ok: false, error: win && "error" in win ? win.error : "Give the slot a start and an end time." };
  const clean = cleanEventLabel(label);
  if (clean.length < 2) return { ok: false, error: "Give the slot a name, for example the firm you are visiting." };
  const n = (await sql`SELECT COUNT(*)::int AS n FROM tapcard_listed_event_slots WHERE event_code = ${code}`) as { n: number }[];
  if ((n[0]?.n ?? 0) >= 40) return { ok: false, error: "That is the most slots one event can have." };
  await sql`INSERT INTO tapcard_listed_event_slots (event_code, label, starts_at, ends_at) VALUES (${code}, ${clean}, ${win.start.toISOString()}, ${win.end.toISOString()})`;
  return { ok: true };
}

export async function deleteSlot(orgId: string, id: number): Promise<void> {
  await ensureEventSchema();
  await sql`DELETE FROM tapcard_listed_event_slots WHERE id = ${id} AND event_code IN (SELECT code FROM tapcard_listed_events WHERE org_id = ${orgId})`;
}

/// The company's events, newest first, with how many current followers came through each.
export async function listEvents(orgId: string): Promise<ListedEvent[]> {
  await ensureEventSchema();
  await ensureAttendanceTable();
  const rows = (await sql`
    SELECT e.code, e.label, e.created_at, e.starts_at, e.ends_at,
      (SELECT COUNT(DISTINCT a.follower_hash)::int FROM tapcard_event_attendance a WHERE a.event_code = e.code) AS followers
    FROM tapcard_listed_events e WHERE e.org_id = ${orgId} ORDER BY COALESCE(e.starts_at, e.created_at) DESC`) as { code: string; label: string; created_at: string; starts_at: string | null; ends_at: string | null; followers: number }[];
  const counts = (await sql`SELECT a.slot_id, COUNT(DISTINCT a.follower_hash)::int AS n FROM tapcard_event_attendance a JOIN tapcard_listed_events e ON e.code = a.event_code WHERE e.org_id = ${orgId} AND a.slot_id <> 0 GROUP BY a.slot_id`) as { slot_id: number; n: number }[];
  const byId = new Map(counts.map((c) => [Number(c.slot_id), Number(c.n)]));
  const out: ListedEvent[] = [];
  for (const r of rows) {
    const slots = (await slotsOf(r.code)).map((x) => ({ ...x, followers: byId.get(x.id) ?? 0 }));
    out.push({
      code: r.code, label: r.label, createdAt: new Date(r.created_at).toISOString(), followers: Number(r.followers),
      startsAt: r.starts_at ? new Date(r.starts_at).toISOString() : null, endsAt: r.ends_at ? new Date(r.ends_at).toISOString() : null, slots,
    });
  }
  return out;
}

export interface EventAttendee { name: string; email: string; slot: string; at: string }
export interface EventAttendance { named: EventAttendee[]; anonymous: number }

/// Who registered at each event: named only for the people who chose to share their details; everyone else is just counted.
export async function listEventAttendees(orgId: string): Promise<Record<string, EventAttendance>> {
  await ensureAttendanceTable();
  const rows = (await sql`
    SELECT a.event_code, a.first_at, sl.label AS slot, d.name, d.email
    FROM tapcard_event_attendance a
    JOIN tapcard_listed_events e ON e.code = a.event_code AND e.org_id = ${orgId}
    LEFT JOIN tapcard_listed_event_slots sl ON sl.id = NULLIF(a.slot_id, 0)
    LEFT JOIN tapcard_follower_details d ON d.card_id = a.card_id AND d.follower_hash = a.follower_hash
    ORDER BY a.first_at DESC`) as { event_code: string; first_at: string; slot: string | null; name: string | null; email: string | null }[];
  const out: Record<string, EventAttendance> = {};
  for (const r of rows) {
    const e = (out[r.event_code] ??= { named: [], anonymous: 0 });
    if (r.name && r.email) e.named.push({ name: r.name, email: r.email, slot: r.slot ?? "", at: new Date(r.first_at).toISOString() });
    else e.anonymous += 1;
  }
  return out;
}

/// A code the app sent is only kept if it is a real event of the company that owns the card being followed.
export async function eventCodeForOrg(code: unknown, orgId: string | null): Promise<string> {
  if (typeof code !== "string" || !EVENT_CODE_RE.test(code) || !orgId) return "";
  await ensureEventSchema();
  const r = (await sql`SELECT 1 FROM tapcard_listed_events WHERE code = ${code} AND org_id = ${orgId}`) as unknown[];
  return r.length ? code : "";
}

/// The names an app or the card page shows for a scanned event code: the event and, for a roadshow, the slot the moment falls in.
export async function eventInfoForOrg(code: unknown, orgId: string | null, at: Date = new Date()): Promise<{ code: string; label: string; slot: string } | null> {
  const ok = await eventCodeForOrg(code, orgId).catch(() => "");
  if (!ok) return null;
  const r = (await sql`SELECT label FROM tapcard_listed_events WHERE code = ${ok}`) as { label: string }[];
  if (!r.length) return null;
  const slot = await slotAt(ok, at).catch(() => null);
  return { code: ok, label: r[0].label, slot: slot?.label ?? "" };
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
