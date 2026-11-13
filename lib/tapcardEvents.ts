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

export interface ListedEvent { code: string; label: string; createdAt: string; followers: number }

export async function createEvent(orgId: string, label: string): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  await ensureEventSchema();
  const clean = cleanEventLabel(label);
  if (clean.length < 2) return { ok: false, error: "Give the event a name, for example AGM 2026." };
  const n = (await sql`SELECT COUNT(*)::int AS n FROM tapcard_listed_events WHERE org_id = ${orgId}`) as { n: number }[];
  if ((n[0]?.n ?? 0) >= MAX_EVENTS) return { ok: false, error: "That is the most events one company can have." };
  const code = crypto.randomBytes(6).toString("base64url").slice(0, 8);
  await sql`INSERT INTO tapcard_listed_events (code, org_id, label) VALUES (${code}, ${orgId}, ${clean})`;
  return { ok: true, code };
}

export async function deleteEvent(orgId: string, code: string): Promise<void> {
  await ensureEventSchema();
  await sql`DELETE FROM tapcard_listed_events WHERE code = ${code} AND org_id = ${orgId}`;
}

/// The company's events, newest first, with how many current followers came through each.
export async function listEvents(orgId: string): Promise<ListedEvent[]> {
  await ensureEventSchema();
  await ensureFollowerEventColumn();
  const rows = (await sql`
    SELECT e.code, e.label, e.created_at,
      (SELECT COUNT(*)::int FROM tapcard_followers f WHERE f.event_code = e.code) AS followers
    FROM tapcard_listed_events e WHERE e.org_id = ${orgId} ORDER BY e.created_at DESC`) as { code: string; label: string; created_at: string; followers: number }[];
  return rows.map((r) => ({ code: r.code, label: r.label, createdAt: new Date(r.created_at).toISOString(), followers: Number(r.followers) }));
}

/// A code the app sent is only kept if it is a real event of the company that owns the card being followed.
export async function eventCodeForOrg(code: unknown, orgId: string | null): Promise<string> {
  if (typeof code !== "string" || !EVENT_CODE_RE.test(code) || !orgId) return "";
  await ensureEventSchema();
  const r = (await sql`SELECT 1 FROM tapcard_listed_events WHERE code = ${code} AND org_id = ${orgId}`) as unknown[];
  return r.length ? code : "";
}

let colReady: Promise<unknown> | null = null;
export function ensureFollowerEventColumn(): Promise<unknown> {
  if (!colReady) {
    colReady = import("@/lib/tapcardOffers").then(({ followerCount }) => followerCount("_")) // creates tapcard_followers if missing
      .then(() => sql`ALTER TABLE tapcard_followers ADD COLUMN IF NOT EXISTS event_code TEXT NOT NULL DEFAULT ''`)
      .catch((e) => { colReady = null; throw e; });
  }
  return colReady;
}
