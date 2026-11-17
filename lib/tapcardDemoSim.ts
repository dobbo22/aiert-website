import { randomBytes } from "node:crypto";
import sql from "@/lib/db";

// A simulated AGM for a DEMO company only (a company on the tapcard_demo_orgs list, which AIERT adds by hand). It adds made-up people
// ("Demo Investor n", example.org addresses) as followers of the company's listed card, with event attendance, headline taps and later
// followers, so a live demo can show the admin moving. Everything it adds is remembered so Clear removes it, counters included.
// Nothing here can run for a real company: every entry point checks the demo list first.

let ready: Promise<unknown> | null = null;
function ensureSchema(): Promise<unknown> {
  if (!ready) {
    ready = sql`CREATE TABLE IF NOT EXISTS tapcard_demo_orgs (org_id TEXT PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`
      .then(() => sql`CREATE TABLE IF NOT EXISTS tapcard_demo_sim_followers (card_id TEXT NOT NULL, follower TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (card_id, follower))`)
      .then(() => sql`CREATE TABLE IF NOT EXISTS tapcard_demo_sim_announcements (card_id TEXT NOT NULL, announcement_id BIGINT NOT NULL, PRIMARY KEY (card_id, announcement_id))`)
      .catch((e) => { ready = null; throw e; });
  }
  return ready;
}

/// The simulation exists for demo companies only: "Example Resources plc", or a copy made for a showing and named "... (demo)".
/// Even on the demo list, a company with any other name is refused, so a real client's card can never be touched.
export const DEMO_ORG_NAME = "Example Resources plc";
export const isDemoName = (name: string) => name === DEMO_ORG_NAME || /\(demo\)\s*$/i.test(name);

export async function isDemoOrg(orgId: string): Promise<boolean> {
  try {
    await ensureSchema();
    const rows = (await sql`
      SELECT o.name FROM tapcard_demo_orgs d JOIN tapcard_biz_orgs o ON o.id = d.org_id WHERE d.org_id = ${orgId}`) as { name: string }[];
    return rows.length > 0 && isDemoName(rows[0].name);
  } catch {
    return false;
  }
}

const FIRST = ["Alex", "Sam", "Priya", "Tom", "Hannah", "Ravi", "Emma", "Chris", "Fatima", "Liam", "Zoe", "Omar", "Grace", "Ben", "Aisha", "Jack", "Mei", "Leo", "Nina", "Paul"];
const LAST = ["Shah", "Brown", "Patel", "Evans", "Khan", "Taylor", "Wright", "Singh", "Walker", "Green", "Hall", "Lewis", "Young", "King", "Scott", "Reid", "Ford", "Kerr", "Bell", "Cole"];
export function demoPerson(n: number): { name: string; email: string; phone: string } {
  return { phone: "", name: `${FIRST[n % 20]} ${LAST[(Math.floor(n / 3) + n) % 20]} (demo ${n})`, email: `demo.investor.${n}@example.org` };
}

async function listedCardOf(orgId: string): Promise<string | null> {
  const rows = (await sql`SELECT l.card_id FROM tapcard_listed_cards l JOIN tapcard_cards c ON c.id = l.card_id WHERE c.org_id = ${orgId} ORDER BY c.created_at LIMIT 1`) as { card_id: string }[];
  return rows[0]?.card_id ?? null;
}

async function gate(orgId: string): Promise<{ ok: true; cardId: string } | { ok: false; error: string }> {
  if (!(await isDemoOrg(orgId))) return { ok: false, error: "This is not a demo company." };
  const cardId = await listedCardOf(orgId);
  if (!cardId) return { ok: false, error: "This company has no listed card." };
  return { ok: true, cardId };
}

const clampN = (n: unknown, max: number, dflt: number) => (typeof n === "number" && Number.isFinite(n) ? Math.max(0, Math.min(max, Math.floor(n))) : dflt);

/// People arriving at an event: each follows the company's card through the event, about 60% sharing their name and email.
/// `start` numbers the people so a second batch continues the names. Called in small batches by the page so the admin moves.
export async function simArrive(orgId: string, eventCode: string, count: unknown, start: unknown): Promise<{ ok: true; added: number } | { ok: false; error: string }> {
  const g = await gate(orgId);
  if (!g.ok) return g;
  const events = (await sql`SELECT code FROM tapcard_listed_events WHERE code = ${eventCode} AND org_id = ${orgId}`) as unknown[];
  if (!events.length) return { ok: false, error: "Choose one of this company's events." };
  const { setFollower } = await import("@/lib/tapcardOffers");
  const { saveFollowerDetails } = await import("@/lib/tapcardShare");
  const n = clampN(count, 25, 5), first = clampN(start, 10000, 1);
  for (let i = 0; i < n; i++) {
    const num = first + i;
    const follower = `sim-${Date.now()}-${num}-${randomBytes(5).toString("hex")}`;
    await setFollower(g.cardId, follower, true, eventCode, "code", new Date());
    if (num % 5 !== 0 && num % 5 !== 3) await saveFollowerDetails(g.cardId, follower, demoPerson(num), g.cardId, eventCode, "code");
    await sql`INSERT INTO tapcard_demo_sim_followers (card_id, follower) VALUES (${g.cardId}, ${follower}) ON CONFLICT DO NOTHING`;
  }
  return { ok: true, added: n };
}

/// The results are read: taps on the latest headline, and some new followers who came from reading it (no event).
export async function simResults(orgId: string, taps: unknown, late: unknown, start: unknown): Promise<{ ok: true; taps: number; followers: number } | { ok: false; error: string }> {
  const g = await gate(orgId);
  if (!g.ok) return g;
  const t = clampN(taps, 40, 0), l = clampN(late, 25, 0), first = clampN(start, 10000, 101);
  let tapped = 0;
  if (t > 0) {
    const a = (await sql`SELECT id FROM tapcard_announcements WHERE card_id = ${g.cardId} AND withdrawn = false ORDER BY id DESC LIMIT 1`) as { id: number }[];
    if (!a[0]) return { ok: false, error: "Post a headline first, with a story link, so there is something to tap." };
    const { recordAnnouncementOpen } = await import("@/lib/tapcardInsights");
    for (let i = 0; i < t; i++) { await recordAnnouncementOpen(Number(a[0].id)); tapped++; }
  }
  const { setFollower } = await import("@/lib/tapcardOffers");
  const { saveFollowerDetails } = await import("@/lib/tapcardShare");
  for (let i = 0; i < l; i++) {
    const num = first + i;
    const follower = `sim-${Date.now()}-${num}-${randomBytes(5).toString("hex")}`;
    await setFollower(g.cardId, follower, true);
    if (i % 2 === 0) await saveFollowerDetails(g.cardId, follower, demoPerson(num), g.cardId);
    await sql`INSERT INTO tapcard_demo_sim_followers (card_id, follower) VALUES (${g.cardId}, ${follower}) ON CONFLICT DO NOTHING`;
  }
  return { ok: true, taps: tapped, followers: l };
}

/// Clears the demo: everyone the simulation added (with their shared details and attendance), the demo's own headlines, the roadshow
/// and the demo company's counters. Real followers (people who scanned the follow QR on a real phone) are left alone and still count:
/// the join/leave history is started again with them in it.
export async function simClear(orgId: string): Promise<{ ok: true; removed: number } | { ok: false; error: string }> {
  const g = await gate(orgId);
  if (!g.ok) return g;
  const { setFollower } = await import("@/lib/tapcardOffers");
  const { withdrawFollowerDetails } = await import("@/lib/tapcardShare");
  const rows = (await sql`SELECT follower FROM tapcard_demo_sim_followers WHERE card_id = ${g.cardId}`) as { follower: string }[];
  for (const r of rows) {
    await setFollower(g.cardId, r.follower, false);
    await withdrawFollowerDetails(g.cardId, r.follower);
  }
  await sql`DELETE FROM tapcard_demo_sim_followers WHERE card_id = ${g.cardId}`;
  const { ensureInsightSchema } = await import("@/lib/tapcardInsights");
  await ensureInsightSchema();
  // The demo's headlines, with their taps.
  const ann = (await sql`SELECT announcement_id AS id FROM tapcard_demo_sim_announcements WHERE card_id = ${g.cardId}`) as { id: number }[];
  for (const a of ann) {
    await sql`DELETE FROM tapcard_announcement_opens WHERE announcement_id = ${a.id}`;
    await sql`DELETE FROM tapcard_announcement_open_log WHERE announcement_id = ${a.id}`;
    await sql`DELETE FROM tapcard_announcement_sent WHERE announcement_id = ${a.id}`;
    await sql`DELETE FROM tapcard_announcements WHERE id = ${a.id} AND card_id = ${g.cardId}`;
  }
  await sql`DELETE FROM tapcard_demo_sim_announcements WHERE card_id = ${g.cardId}`;
  // Taps that came from the "results" step on whatever headline is left, and the event-link opens.
  await sql`DELETE FROM tapcard_announcement_opens WHERE announcement_id IN (SELECT id FROM tapcard_announcements WHERE card_id = ${g.cardId})`;
  await sql`DELETE FROM tapcard_announcement_open_log WHERE announcement_id IN (SELECT id FROM tapcard_announcements WHERE card_id = ${g.cardId})`;
  // The roadshow, so the next run builds it again.
  const { ROADSHOW_LABEL } = await import("@/lib/demoScenario");
  const { deleteEvent } = await import("@/lib/tapcardEvents");
  const evs = (await sql`SELECT code FROM tapcard_listed_events WHERE org_id = ${orgId} AND lower(label) = lower(${ROADSHOW_LABEL})`) as { code: string }[];
  for (const e of evs) {
    await sql`DELETE FROM tapcard_event_attendance WHERE event_code = ${e.code}`;
    await deleteEvent(orgId, e.code);
  }
  await sql`DELETE FROM tapcard_listed_event_views WHERE code IN (SELECT code FROM tapcard_listed_events WHERE org_id = ${orgId})`;
  // The history starts again with the people who really follow.
  await sql`DELETE FROM tapcard_follow_log WHERE card_id = ${g.cardId}`;
  const real = Number(((await sql`SELECT COUNT(*)::int AS n FROM tapcard_followers WHERE card_id = ${g.cardId}`) as { n: number }[])[0]?.n ?? 0);
  if (real > 0) await sql`INSERT INTO tapcard_follow_log (card_id, day, joined) VALUES (${g.cardId}, CURRENT_DATE, ${real}) ON CONFLICT (card_id, day) DO UPDATE SET joined = ${real}`;
  return { ok: true, removed: rows.length };
}

/// The demo's event: made once (a second press finds the one already there by name), optionally for a whole day.
export async function simEvent(orgId: string, label: string, startsAt: unknown, endsAt: unknown): Promise<{ ok: true; code: string; created: boolean } | { ok: false; error: string }> {
  const g = await gate(orgId);
  if (!g.ok) return g;
  const { createEvent } = await import("@/lib/tapcardEvents");
  const clean = label.replace(/\s+/g, " ").trim();
  const existing = (await sql`SELECT code FROM tapcard_listed_events WHERE org_id = ${orgId} AND lower(label) = lower(${clean}) LIMIT 1`) as { code: string }[];
  if (existing[0]) return { ok: true, code: existing[0].code, created: false };
  const r = await createEvent(orgId, clean, startsAt, endsAt);
  return r.ok ? { ok: true, code: r.code, created: true } : r;
}

/// The demo headline: saved as the company's latest announcement. The route sends the push to followers, exactly as the News page does.
export async function simHeadline(orgId: string, text: unknown, link: unknown): Promise<{ ok: true; cardId: string } | { ok: false; error: string }> {
  const g = await gate(orgId);
  if (!g.ok) return g;
  const { setAnnouncement } = await import("@/lib/tapcardOffers");
  const r = await setAnnouncement(g.cardId, text, link);
  if (!r.ok) return { ok: false, error: r.error };
  // Remember it, so Clear removes the demo's headlines and nothing else.
  const latest = (await sql`SELECT id FROM tapcard_announcements WHERE card_id = ${g.cardId} ORDER BY id DESC LIMIT 1`) as { id: number }[];
  if (latest[0]) await sql`INSERT INTO tapcard_demo_sim_announcements (card_id, announcement_id) VALUES (${g.cardId}, ${latest[0].id}) ON CONFLICT DO NOTHING`;
  return { ok: true, cardId: g.cardId };
}

/// The roadshow: one event over the window, with a slot for each meeting. Made once; a second press adds only slots that are missing.
export async function simRoadshow(orgId: string, label: string, startsAt: unknown, endsAt: unknown, slots: unknown): Promise<{ ok: true; code: string; slots: number } | { ok: false; error: string }> {
  const e = await simEvent(orgId, label, startsAt, endsAt);
  if (!e.ok) return e;
  const { addSlot } = await import("@/lib/tapcardEvents");
  const have = new Set(((await sql`SELECT label FROM tapcard_listed_event_slots WHERE event_code = ${e.code}`) as { label: string }[]).map((r) => r.label.toLowerCase()));
  const list = Array.isArray(slots) ? (slots as { label?: unknown; startsAt?: unknown; endsAt?: unknown }[]).slice(0, 40) : [];
  for (const sl of list) {
    const lbl = String(sl.label ?? "");
    if (have.has(lbl.toLowerCase())) continue;
    const r = await addSlot(orgId, e.code, lbl, sl.startsAt, sl.endsAt);
    if (!r.ok) return { ok: false, error: r.error };
  }
  return { ok: true, code: e.code, slots: list.length };
}

/// One roadshow meeting: a random number of people (some of them fund managers from the firm who share their name and email)
/// scan the event QR at the time of the slot. `firm` is an index into the made-up firms in lib/demoScenario.ts.
export async function simMeeting(orgId: string, eventCode: string, firm: unknown, at: unknown): Promise<{ ok: true; attendees: number; shared: number; firm: string } | { ok: false; error: string }> {
  const g = await gate(orgId);
  if (!g.ok) return g;
  const sc = await import("@/lib/demoScenario");
  const f = typeof firm === "number" ? sc.FIRMS[Math.floor(firm)] : undefined;
  if (!f) return { ok: false, error: "Unknown meeting." };
  const when = new Date(String(at));
  if (Number.isNaN(when.getTime())) return { ok: false, error: "That time does not look right." };
  const events = (await sql`SELECT 1 FROM tapcard_listed_events WHERE code = ${eventCode} AND org_id = ${orgId}`) as unknown[];
  if (!events.length) return { ok: false, error: "Choose one of this company's events." };
  const { setFollower } = await import("@/lib/tapcardOffers");
  const { saveFollowerDetails } = await import("@/lib/tapcardShare");
  const [lo, hi] = sc.ATTENDEES;
  const n = lo + Math.floor(Math.random() * (hi - lo + 1));
  const sharers = Math.min(n, f.managers.length, 1 + Math.floor(Math.random() * sc.MAX_SHARERS));
  for (let i = 0; i < n; i++) {
    const follower = `sim-${Date.now()}-m${i}-${randomBytes(5).toString("hex")}`;
    await setFollower(g.cardId, follower, true, eventCode, "code", new Date(when.getTime() + i * 20_000));
    if (i < sharers) {
      const m = f.managers[i];
      const email = `${m.name.toLowerCase().replace(/[^a-z]+/g, ".")}@${f.domain}`;
      await saveFollowerDetails(g.cardId, follower, { name: `${m.name}, ${m.title}, ${f.name} (demo)`, email, phone: "" }, g.cardId, eventCode, "code");
    }
    await sql`INSERT INTO tapcard_demo_sim_followers (card_id, follower) VALUES (${g.cardId}, ${follower}) ON CONFLICT DO NOTHING`;
  }
  return { ok: true, attendees: n, shared: sharers, firm: f.name };
}
