// Scheduled social posts. Facebook can schedule natively but LinkedIn's API cannot, so one queue serves both: rows wait here and the
// cron /api/cron/social-queue publishes whatever is due. Targets: LinkedIn page (AIERT LTD), LinkedIn personal (Martin), Facebook Page.
import sql from "@/lib/db";
import { createLinkedInPost } from "./linkedinApi";
import { validatePoll, type PollInput } from "./linkedinPoll";
import { createPhotoPost, createTextPost } from "./facebookGraph";

export { TARGETS, TARGET_LABEL, type Target, type QueueRow } from "./socialQueueShared";
import type { Target, QueueRow } from "./socialQueueShared";
import { TARGETS } from "./socialQueueShared";

let ready: Promise<unknown> | null = null;
function ensureTable() {
  ready ??= sql`
    CREATE TABLE IF NOT EXISTS social_queue (
      id serial PRIMARY KEY,
      created_at timestamptz NOT NULL DEFAULT now(),
      run_at timestamptz NOT NULL,
      status text NOT NULL DEFAULT 'pending',
      targets text[] NOT NULL,
      kind text NOT NULL DEFAULT 'post',
      body text NOT NULL,
      media_url text,
      media_name text,
      poll jsonb,
      results jsonb
    )`;
  return ready;
}

// "2026-11-10T09:00" typed in the admin means UK time. Works across the GMT/BST change without a date library.
export function londonToUtc(local: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) throw new Error("Invalid date and time");
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  // What clock time does London show at that instant? The difference is the UK offset (0 or 1 hour); apply it, then re-check once.
  const offsetAt = (t: number) => {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(t));
    const g = (k: string) => Number(parts.find((p) => p.type === k)?.value);
    return Date.UTC(g("year"), g("month") - 1, g("day"), g("hour") % 24, g("minute")) - t;
  };
  const first = guess - offsetAt(guess);
  return new Date(guess - offsetAt(first));
}

export type NewItem = { runAt: Date; targets: Target[]; kind: QueueRow["kind"]; body: string; mediaUrl?: string; mediaName?: string; poll?: PollInput };

export function validateItem(i: NewItem): string | null {
  if (!i.body.trim()) return "Post text is required";
  if (!i.targets.length || i.targets.some((t) => !TARGETS.includes(t))) return "Choose at least one place to post";
  if (i.kind !== "post" && i.targets.includes("facebook")) return "Polls and PDF documents can only go to LinkedIn";
  if (i.kind === "poll") return i.poll ? validatePoll(i.poll) : "A poll needs a question and options";
  if (i.kind === "document" && !i.mediaUrl) return "Choose a PDF to attach";
  return null;
}

export async function enqueue(i: NewItem): Promise<number> {
  await ensureTable();
  const bad = validateItem(i);
  if (bad) throw new Error(bad);
  const rows = (await sql`
    INSERT INTO social_queue (run_at, targets, kind, body, media_url, media_name, poll)
    VALUES (${i.runAt.toISOString()}, ${i.targets}, ${i.kind}, ${i.body}, ${i.mediaUrl ?? null}, ${i.mediaName ?? null}, ${i.poll ? JSON.stringify(i.poll) : null})
    RETURNING id`) as { id: number }[];
  return rows[0].id;
}

export async function listQueue(limit = 40): Promise<QueueRow[]> {
  await ensureTable();
  return (await sql`
    SELECT id, run_at, status, targets, kind, body, media_url, media_name, poll, results
    FROM social_queue ORDER BY (status = 'pending') DESC, CASE WHEN status = 'pending' THEN run_at END ASC, run_at DESC LIMIT ${limit}`) as QueueRow[];
}

export async function cancelItem(id: number): Promise<void> {
  await ensureTable();
  await sql`UPDATE social_queue SET status = 'cancelled' WHERE id = ${id} AND status = 'pending'`;
}

async function fetchBytes(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load the attached file (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

async function publish(row: QueueRow, target: Target): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    if (target === "facebook") {
      const isImage = row.kind === "post" && row.media_url;
      const id = isImage ? await createPhotoPost(row.body, await fetchBytes(row.media_url!), row.media_name ?? "image.jpg") : await createTextPost(row.body);
      return { ok: true, url: `https://www.facebook.com/${id}` };
    }
    const as = target === "linkedin_person" ? "person" : "page";
    if (row.kind === "poll" && row.poll) return { ok: true, url: (await createLinkedInPost(row.body, { as, poll: row.poll })).url };
    if (row.kind === "document" && row.media_url) {
      const bytes = await fetchBytes(row.media_url);
      return { ok: true, url: (await createLinkedInPost(row.body, { as, document: { bytes, title: row.media_name ?? "Document.pdf" } })).url };
    }
    const image = row.media_url ? { bytes: await fetchBytes(row.media_url) } : undefined;
    return { ok: true, url: (await createLinkedInPost(row.body, { as, image })).url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "failed" };
  }
}

// Publishes what is due. Each row is claimed first (so overlapping runs never double-post) and is never retried automatically,
// because a half-failed row that was retried could post twice somewhere; the per-target result shows what happened.
export async function runDue(limit = 5): Promise<{ processed: number; ok: number; failed: number }> {
  await ensureTable();
  const claimed = (await sql`
    UPDATE social_queue SET status = 'sending'
    WHERE id IN (SELECT id FROM social_queue WHERE status = 'pending' AND run_at <= now() ORDER BY run_at LIMIT ${limit} FOR UPDATE SKIP LOCKED)
    RETURNING id, run_at, status, targets, kind, body, media_url, media_name, poll, results`) as QueueRow[];
  let ok = 0;
  let failed = 0;
  for (const row of claimed) {
    const results: NonNullable<QueueRow["results"]> = {};
    for (const t of row.targets) results[t] = await publish(row, t);
    const good = Object.values(results).filter((r) => r.ok).length;
    const status = good === row.targets.length ? "sent" : good === 0 ? "failed" : "partial";
    await sql`UPDATE social_queue SET status = ${status}, results = ${JSON.stringify(results)} WHERE id = ${row.id}`;
    if (status === "sent") ok++;
    else failed++;
  }
  return { processed: claimed.length, ok, failed };
}
