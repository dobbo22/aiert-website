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
      // Who they are, to choose the right email: company (a listed company's IR, finance or chair), agency (IR or PR adviser), broker (broker, NOMAD, corporate finance), contact (someone we know).
      .then(() => sql`ALTER TABLE tapcard_ir_recipients ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT ''`)
      .then(() => sql`ALTER TABLE tapcard_ir_recipients ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'contact'`)
      // What was said and when (emails, WhatsApps, meetings), so each person's story reads in one place with what they did on the page.
      .then(() => sql`CREATE TABLE IF NOT EXISTS tapcard_ir_events (
        id BIGSERIAL PRIMARY KEY,
        token TEXT NOT NULL,
        at TIMESTAMPTZ NOT NULL DEFAULT now(),
        kind TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT '',
        detail TEXT NOT NULL DEFAULT ''
      )`)
      .then(() => sql`CREATE INDEX IF NOT EXISTS tapcard_ir_events_token ON tapcard_ir_events (token, at)`)
      .catch((e) => { ready = null; throw e; });
  }
  return ready;
}

export const irLink = (token: string) => `https://tapcard.aiert.co.uk/investors?v=${token}`;

export const IR_KINDS_OF_PERSON = ["company", "agency", "broker", "contact"] as const;
export type IrPersonKind = (typeof IR_KINDS_OF_PERSON)[number];
const cleanKind = (k: unknown): IrPersonKind => ((IR_KINDS_OF_PERSON as readonly string[]).includes(String(k)) ? (k as IrPersonKind) : "contact");
const cleanEmail = (e: unknown) => (typeof e === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()) ? e.trim().slice(0, 200) : "");

export async function addIrRecipient(name: string, org: string, note = "", email = "", kind: string = "contact"): Promise<{ token: string; link: string }> {
  await ensureIrSchema();
  const token = crypto.randomBytes(8).toString("hex").slice(0, 10);
  await sql`INSERT INTO tapcard_ir_recipients (token, name, org, note, email, kind) VALUES (${token}, ${name.trim().slice(0, 120)}, ${org.trim().slice(0, 120)}, ${note.trim().slice(0, 300)}, ${cleanEmail(email)}, ${cleanKind(kind)})`;
  return { token, link: irLink(token) };
}

export const IR_EVENT_KINDS = ["email-sent", "email-received", "message-sent", "message-received", "meeting", "note"] as const;
export type IrEventKind = (typeof IR_EVENT_KINDS)[number];

export async function addIrEvent(token: string, kind: string, title: string, detail = "", at: Date = new Date()): Promise<boolean> {
  if (!IR_TOKEN_RE.test(token) || !(IR_EVENT_KINDS as readonly string[]).includes(kind) || title.trim().length < 2 || Number.isNaN(at.getTime())) return false;
  await ensureIrSchema();
  const known = (await sql`SELECT 1 FROM tapcard_ir_recipients WHERE token = ${token}`) as unknown[];
  if (!known.length) return false;
  await sql`INSERT INTO tapcard_ir_events (token, at, kind, title, detail) VALUES (${token}, ${at.toISOString()}, ${kind}, ${title.trim().slice(0, 160)}, ${detail.trim().slice(0, 600)})`;
  return true;
}

export async function deleteIrEvent(token: string, id: number): Promise<void> {
  await ensureIrSchema();
  await sql`DELETE FROM tapcard_ir_events WHERE id = ${id} AND token = ${token}`;
}

export async function markIrSent(token: string, when: Date = new Date()): Promise<void> {
  await ensureIrSchema();
  await sql`UPDATE tapcard_ir_recipients SET sent_at = ${when.toISOString()} WHERE token = ${token}`;
}

export async function deleteIrRecipient(token: string): Promise<void> {
  await ensureIrSchema();
  await sql`DELETE FROM tapcard_ir_visits WHERE token = ${token}`;
  await sql`DELETE FROM tapcard_ir_events WHERE token = ${token}`;
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
  email: string;
  kind: IrPersonKind;
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
  /// Oldest first: what was said (emails, messages, meetings, notes) mixed with what the person did on the page.
  timeline: IrTimelineItem[];
}

export interface IrTimelineItem {
  at: string;
  /// An IrEventKind, or "page" for something the person did on the investors page.
  kind: IrEventKind | "page";
  title: string;
  detail: string;
  /// Present for typed-in events, so one can be removed.
  id?: number;
}

const PAGE_TITLES: Record<string, string> = { visit: "Opened the investors page", engaged: "Stayed on the page", tab: "Looked at a tab", video: "Played the video", "video-end": "Watched the video to the end" };

/// Page visits by a person, closest repeats (same thing within a minute) folded into one line.
export function pageTimeline(visits: { at: string; kind: string; detail: string; agent: string }[]): IrTimelineItem[] {
  const out: IrTimelineItem[] = [];
  const last = new Map<string, number>();
  for (const v of visits) {
    if (v.agent !== "person" || !PAGE_TITLES[v.kind]) continue;
    const t = new Date(v.at).getTime();
    const key = `${v.kind}:${v.detail}`;
    if (last.has(key) && t - last.get(key)! < 60_000) continue;
    last.set(key, t);
    out.push({ at: new Date(v.at).toISOString(), kind: "page", title: PAGE_TITLES[v.kind], detail: v.kind === "tab" ? v.detail : "" });
  }
  return out;
}

export async function irSummary(): Promise<IrRow[]> {
  await ensureIrSchema();
  const people = (await sql`SELECT token, name, org, note, email, kind, created_at, sent_at FROM tapcard_ir_recipients ORDER BY created_at DESC`) as { token: string; name: string; org: string; note: string; email: string; kind: string; created_at: string; sent_at: string | null }[];
  const visits = (await sql`SELECT token, at, kind, detail, agent FROM tapcard_ir_visits ORDER BY at`) as { token: string; at: string; kind: string; detail: string; agent: string }[];
  const events = (await sql`SELECT id, token, at, kind, title, detail FROM tapcard_ir_events ORDER BY at`) as { id: number | string; token: string; at: string; kind: IrEventKind; title: string; detail: string }[];
  return people.map((p) => {
    const mine = visits.filter((v) => v.token === p.token);
    const human = mine.filter((v) => v.agent === "person");
    const iso = (d: string | null) => (d ? new Date(d).toISOString() : null);
    const tabs = [...new Set(human.filter((v) => v.kind === "tab").map((v) => v.detail))];
    const ended = human.some((v) => v.kind === "video-end");
    const played = human.some((v) => v.kind === "video");
    return {
      token: p.token, name: p.name, org: p.org, note: p.note, email: p.email ?? "", kind: cleanKind(p.kind), createdAt: iso(p.created_at)!, sentAt: iso(p.sent_at),
      firstAt: iso(human[0]?.at ?? null), lastAt: iso(human[human.length - 1]?.at ?? null),
      opens: human.filter((v) => v.kind === "visit").length,
      engaged: human.some((v) => v.kind === "engaged" || v.kind === "tab" || v.kind === "video"),
      tabs, video: ended ? "finished" : played ? "played" : "none",
      robotHits: mine.length - human.length,
      timeline: [
        ...events.filter((e) => e.token === p.token).map((e) => ({ at: new Date(e.at).toISOString(), kind: e.kind, title: e.title, detail: e.detail, id: Number(e.id) })),
        ...pageTimeline(mine),
      ].sort((x, y) => x.at.localeCompare(y.at)),
    };
  });
}
