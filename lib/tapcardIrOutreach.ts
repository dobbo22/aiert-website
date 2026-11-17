import crypto from "node:crypto";
import sql from "@/lib/db";
import { isRobotAgent } from "@/lib/tapcardInsights";

// Personal outreach to people we write to about TapCard for investor relations (a broker, an adviser, an old colleague): each gets their own
// link to the investors page (/investors?v=<code>), so AIERT can see whether the page was opened and really looked at. Nothing about the
// reader is kept except what they did on the page: no IP address, no cookie, no device details beyond "a person's browser or a robot".
// Email "open" pixels are NOT used: mail apps and security scanners fetch them automatically, so they say nothing reliable.

export const IR_TOKEN_RE = /^[a-z0-9]{8,16}$/;
export const IR_KINDS = ["visit", "engaged", "tab", "video", "video-end"] as const;
export type IrKind = (typeof IR_KINDS)[number];
const DAILY_CAP = 300; // beacons per link per day, so a forwarded or looping link cannot fill the table

let ready: Promise<unknown> | null = null;
export function ensureIrSchema(): Promise<unknown> {
  if (!ready) {
    ready = sql`CREATE TABLE IF NOT EXISTS tapcard_ir_recipients (
        token TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        org TEXT NOT NULL DEFAULT '',
        note TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        sent_at TIMESTAMPTZ
      )`
      .then(() => sql`CREATE TABLE IF NOT EXISTS tapcard_ir_visits (
        id BIGSERIAL PRIMARY KEY,
        token TEXT NOT NULL,
        at TIMESTAMPTZ NOT NULL DEFAULT now(),
        kind TEXT NOT NULL,
        detail TEXT NOT NULL DEFAULT '',
        agent TEXT NOT NULL DEFAULT 'person'
      )`)
      .then(() => sql`CREATE INDEX IF NOT EXISTS tapcard_ir_visits_token ON tapcard_ir_visits (token, at)`)
      .catch((e) => { ready = null; throw e; });
  }
  return ready;
}

export const irLink = (token: string) => `https://tapcard.aiert.co.uk/investors?v=${token}`;

export async function addIrRecipient(name: string, org: string, note = ""): Promise<{ token: string; link: string }> {
  await ensureIrSchema();
  const token = crypto.randomBytes(8).toString("hex").slice(0, 10);
  await sql`INSERT INTO tapcard_ir_recipients (token, name, org, note) VALUES (${token}, ${name.trim().slice(0, 120)}, ${org.trim().slice(0, 120)}, ${note.trim().slice(0, 300)})`;
  return { token, link: irLink(token) };
}

export async function markIrSent(token: string, when: Date = new Date()): Promise<void> {
  await ensureIrSchema();
  await sql`UPDATE tapcard_ir_recipients SET sent_at = ${when.toISOString()} WHERE token = ${token}`;
}

export async function deleteIrRecipient(token: string): Promise<void> {
  await ensureIrSchema();
  await sql`DELETE FROM tapcard_ir_visits WHERE token = ${token}`;
  await sql`DELETE FROM tapcard_ir_recipients WHERE token = ${token}`;
}

/// One thing a reader did on the page. Unknown codes and unknown kinds are ignored without saying so.
export async function recordIrVisit(token: string, kind: string, detail: string, userAgent: string | null): Promise<boolean> {
  if (!IR_TOKEN_RE.test(token) || !(IR_KINDS as readonly string[]).includes(kind)) return false;
  await ensureIrSchema();
  const known = (await sql`SELECT 1 FROM tapcard_ir_recipients WHERE token = ${token}`) as unknown[];
  if (!known.length) return false;
  const today = (await sql`SELECT COUNT(*)::int AS n FROM tapcard_ir_visits WHERE token = ${token} AND at > now() - interval '1 day'`) as { n: number }[];
  if (Number(today[0]?.n ?? 0) >= DAILY_CAP) return false;
  await sql`INSERT INTO tapcard_ir_visits (token, kind, detail, agent) VALUES (${token}, ${kind}, ${detail.slice(0, 40)}, ${isRobotAgent(userAgent) ? "robot" : "person"})`;
  return true;
}

export interface IrRow {
  token: string;
  name: string;
  org: string;
  note: string;
  createdAt: string;
  sentAt: string | null;
  /// First and last time a person (not a robot) had the page open.
  firstAt: string | null;
  lastAt: string | null;
  opens: number;
  /// Stayed on the page for a few seconds, clicked a tab, or played the video: something a link-checking scanner does not do.
  engaged: boolean;
  tabs: string[];
  video: "none" | "played" | "finished";
  robotHits: number;
}

export async function irSummary(): Promise<IrRow[]> {
  await ensureIrSchema();
  const people = (await sql`SELECT token, name, org, note, created_at, sent_at FROM tapcard_ir_recipients ORDER BY created_at DESC`) as { token: string; name: string; org: string; note: string; created_at: string; sent_at: string | null }[];
  const visits = (await sql`SELECT token, at, kind, detail, agent FROM tapcard_ir_visits ORDER BY at`) as { token: string; at: string; kind: string; detail: string; agent: string }[];
  return people.map((p) => {
    const mine = visits.filter((v) => v.token === p.token);
    const human = mine.filter((v) => v.agent === "person");
    const iso = (d: string | null) => (d ? new Date(d).toISOString() : null);
    const tabs = [...new Set(human.filter((v) => v.kind === "tab").map((v) => v.detail))];
    const ended = human.some((v) => v.kind === "video-end");
    const played = human.some((v) => v.kind === "video");
    return {
      token: p.token, name: p.name, org: p.org, note: p.note, createdAt: iso(p.created_at)!, sentAt: iso(p.sent_at),
      firstAt: iso(human[0]?.at ?? null), lastAt: iso(human[human.length - 1]?.at ?? null),
      opens: human.filter((v) => v.kind === "visit").length,
      engaged: human.some((v) => v.kind === "engaged" || v.kind === "tab" || v.kind === "video"),
      tabs, video: ended ? "finished" : played ? "played" : "none",
      robotHits: mine.length - human.length,
    };
  });
}
