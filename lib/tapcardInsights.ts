import sql from "@/lib/db";
import { buildSeries, lastDays, type DayPoint } from "@/lib/tapcardInsightsSeries";

// Insights for a LISTED company: counts only, never a named person. Scans of each event QR code, taps through to each announcement,
// followers over time. Nothing here links a shareholder who shared their details to what they opened.

let ready: Promise<unknown> | null = null;
function ensureInsightSchema(): Promise<unknown> {
  if (!ready) {
    ready = sql`
      CREATE TABLE IF NOT EXISTS tapcard_listed_event_views (
        code TEXT NOT NULL, day DATE NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (code, day)
      )`
      .then(() => sql`CREATE TABLE IF NOT EXISTS tapcard_announcement_opens (
        announcement_id BIGINT NOT NULL, day DATE NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (announcement_id, day)
      )`)
      // A daily count of people who started and stopped following, so Insights can show drop-off. It starts counting the day this is first created.
      .then(() => sql`CREATE TABLE IF NOT EXISTS tapcard_follow_log (card_id TEXT NOT NULL, day DATE NOT NULL, joined INTEGER NOT NULL DEFAULT 0, "left" INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (card_id, day))`)
      .then(() => sql`CREATE TABLE IF NOT EXISTS tapcard_follow_log_meta (id BOOLEAN PRIMARY KEY DEFAULT true, started DATE NOT NULL DEFAULT CURRENT_DATE)`)
      .then(() => sql`INSERT INTO tapcard_follow_log_meta (id) VALUES (true) ON CONFLICT DO NOTHING`)
      .catch((e) => { ready = null; throw e; });
  }
  return ready;
}

/// Counts one follow or one unfollow for the day (never throws: a follow must not fail because of a chart).
export async function logFollowChange(cardId: string, kind: "joined" | "left"): Promise<void> {
  try {
    await ensureInsightSchema();
    if (kind === "joined") await sql`INSERT INTO tapcard_follow_log (card_id, day, joined) VALUES (${cardId}, CURRENT_DATE, 1) ON CONFLICT (card_id, day) DO UPDATE SET joined = tapcard_follow_log.joined + 1`;
    else await sql`INSERT INTO tapcard_follow_log (card_id, day, "left") VALUES (${cardId}, CURRENT_DATE, 1) ON CONFLICT (card_id, day) DO UPDATE SET "left" = tapcard_follow_log."left" + 1`;
  } catch { /* the chart can miss one count; the follow matters more */ }
}

export const ROBOT_UA = /bot|crawl|spider|preview|whatsapp|facebookexternalhit|slurp|headless|lighthouse|googleimageproxy|linkpresentation|python|curl|wget|slack|teams|skype|outlook|safelinks|proofpoint|mimecast/i;
export const isRobotAgent = (ua: string | null | undefined) => !ua || ROBOT_UA.test(ua);

/// One open of an event's QR link (the card page with ?e=<code>). Robots are filtered by the caller.
export async function recordEventView(code: string): Promise<void> {
  await ensureInsightSchema();
  await sql`INSERT INTO tapcard_listed_event_views (code, day, n) VALUES (${code}, CURRENT_DATE, 1)
            ON CONFLICT (code, day) DO UPDATE SET n = tapcard_listed_event_views.n + 1`;
}

/// One tap through to an announcement's release (the app and card page send people via /a/<id>). Robots are filtered by the caller.
export async function recordAnnouncementOpen(id: number): Promise<void> {
  await ensureInsightSchema();
  await sql`INSERT INTO tapcard_announcement_opens (announcement_id, day, n) VALUES (${id}, CURRENT_DATE, 1)
            ON CONFLICT (announcement_id, day) DO UPDATE SET n = tapcard_announcement_opens.n + 1`;
}

export interface SlotStat { label: string; startsAt: string; endsAt: string; followers: number; shared: number }
export interface SourceRow { code: string; label: string; when: string; opens: number; followers: number; shared: number; rate: number | null; slots: SlotStat[] }
export interface AnnouncementRow { id: number; text: string; postedAt: string; sent: number; opens: number; opened: number | null }
export interface EventMark { day: string; label: string }
export interface Insights {
  totals: { following: number; new7: number; new30: number; shared: number; eventTagged: number };
  sources: SourceRow[];
  announcements: AnnouncementRow[];
  series: DayPoint[];
  logStarted: string;
  marks: EventMark[];
}

export async function getInsights(orgId: string): Promise<Insights> {
  await ensureInsightSchema();
  const { ensureFollowerEventColumn } = await import("@/lib/tapcardEvents");
  await ensureFollowerEventColumn();
  const { ensureAttendanceTable } = await import("@/lib/tapcardEvents");
  await ensureAttendanceTable();
  const [t] = (await sql`
    SELECT
      COUNT(*)::int AS following,
      COUNT(*) FILTER (WHERE f.created_at > now() - interval '7 days')::int AS new7,
      COUNT(*) FILTER (WHERE f.created_at > now() - interval '30 days')::int AS new30,
      COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM tapcard_event_attendance a WHERE a.card_id = f.card_id AND a.follower_hash = f.follower_hash))::int AS tagged
    FROM tapcard_followers f
    JOIN tapcard_listed_cards l ON l.card_id = f.card_id
    JOIN tapcard_cards c ON c.id = f.card_id
    WHERE c.org_id = ${orgId}`) as { following: number; new7: number; new30: number; tagged: number }[];
  const [sh] = (await sql`
    SELECT COUNT(*)::int AS n FROM tapcard_follower_details d
    JOIN tapcard_listed_cards l ON l.card_id = d.card_id JOIN tapcard_cards c ON c.id = d.card_id WHERE c.org_id = ${orgId}`) as { n: number }[];

  const srcRows = (await sql`
    SELECT e.code, e.label, e.starts_at, e.ends_at,
      COALESCE((SELECT SUM(v.n) FROM tapcard_listed_event_views v WHERE v.code = e.code), 0)::int AS opens,
      (SELECT COUNT(DISTINCT a.follower_hash)::int FROM tapcard_event_attendance a WHERE a.event_code = e.code) AS followers,
      (SELECT COUNT(DISTINCT a.follower_hash)::int FROM tapcard_event_attendance a JOIN tapcard_follower_details d ON d.card_id = a.card_id AND d.follower_hash = a.follower_hash WHERE a.event_code = e.code) AS shared
    FROM tapcard_listed_events e WHERE e.org_id = ${orgId} ORDER BY COALESCE(e.starts_at, e.created_at) DESC`) as
    { code: string; label: string; starts_at: string | null; ends_at: string | null; opens: number; followers: number; shared: number }[];
  // Each event's time slots (a roadshow's visits) with how many registered in each and how many of those shared their details.
  const slotRows = (await sql`
    SELECT s.event_code, s.label, s.starts_at, s.ends_at,
      (SELECT COUNT(DISTINCT a.follower_hash)::int FROM tapcard_event_attendance a WHERE a.slot_id = s.id) AS followers,
      (SELECT COUNT(DISTINCT a.follower_hash)::int FROM tapcard_event_attendance a JOIN tapcard_follower_details d ON d.card_id = a.card_id AND d.follower_hash = a.follower_hash WHERE a.slot_id = s.id) AS shared
    FROM tapcard_listed_event_slots s JOIN tapcard_listed_events e ON e.code = s.event_code WHERE e.org_id = ${orgId} ORDER BY s.starts_at`) as
    { event_code: string; label: string; starts_at: string; ends_at: string; followers: number; shared: number }[];
  const when = (a: string | null, b: string | null) => {
    if (!a || !b) return "No set time";
    const d = (x: string) => new Date(x).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" });
    const t = (x: string) => new Date(x).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
    const allDay = t(a) === "00:00" && t(b) === "23:59";
    return allDay ? d(a) : `${d(a)}, ${t(a)} to ${t(b)}`;
  };
  const sources: SourceRow[] = srcRows.map((r) => ({
    code: r.code, label: r.label, when: when(r.starts_at, r.ends_at),
    opens: Number(r.opens), followers: Number(r.followers), shared: Number(r.shared),
    rate: Number(r.opens) > 0 ? Math.round((Number(r.followers) / Number(r.opens)) * 100) : null,
    slots: slotRows.filter((x) => x.event_code === r.code).map((x) => ({
      label: x.label, startsAt: new Date(x.starts_at).toISOString(), endsAt: new Date(x.ends_at).toISOString(), followers: Number(x.followers), shared: Number(x.shared),
    })),
  }));

  const annRows = (await sql`
    SELECT a.id, a.text, a.created_at,
      (SELECT COUNT(*)::int FROM tapcard_push_log l WHERE l.card_id = a.card_id AND l.kind = 'news' AND l.ref = a.id::text) AS sent,
      COALESCE((SELECT SUM(o.n) FROM tapcard_announcement_opens o WHERE o.announcement_id = a.id), 0)::int AS opens
    FROM tapcard_announcements a
    JOIN tapcard_listed_cards l ON l.card_id = a.card_id JOIN tapcard_cards c ON c.id = a.card_id
    WHERE c.org_id = ${orgId} AND a.withdrawn = false ORDER BY a.id DESC LIMIT 20`) as { id: number; text: string; created_at: string; sent: number; opens: number }[];
  const announcements: AnnouncementRow[] = annRows.map((r) => ({
    id: Number(r.id), text: r.text, postedAt: new Date(r.created_at).toISOString(), sent: Number(r.sent), opens: Number(r.opens),
    opened: Number(r.sent) > 0 ? Math.round((Number(r.opens) / Number(r.sent)) * 100) : null,
  }));

  // Day by day for the last 90 days: who joined, who left, the total, and how many registered through an event.
  const DAYS = 90;
  const surv = (await sql`
    SELECT f.created_at::date AS d, COUNT(*)::int AS n
    FROM tapcard_followers f JOIN tapcard_listed_cards l ON l.card_id = f.card_id JOIN tapcard_cards c ON c.id = f.card_id
    WHERE c.org_id = ${orgId} AND f.created_at::date > CURRENT_DATE - (${DAYS}::int) GROUP BY 1`) as { d: string; n: number }[];
  const logRows = (await sql`
    SELECT l.day AS d, SUM(l.joined)::int AS j, SUM(l."left")::int AS x
    FROM tapcard_follow_log l JOIN tapcard_cards c ON c.id = l.card_id
    WHERE c.org_id = ${orgId} AND l.day > CURRENT_DATE - (${DAYS}::int) GROUP BY 1`) as { d: string; j: number; x: number }[];
  const viaRows = (await sql`
    SELECT a.first_at::date AS d, COUNT(*)::int AS n
    FROM tapcard_event_attendance a JOIN tapcard_listed_events e ON e.code = a.event_code
    WHERE e.org_id = ${orgId} AND a.first_at::date > CURRENT_DATE - (${DAYS}::int) GROUP BY 1`) as { d: string; n: number }[];
  const [meta] = (await sql`SELECT started FROM tapcard_follow_log_meta`) as { started: string }[];
  const iso = (v: string | Date) => new Date(v).toISOString().slice(0, 10);
  const rec = (rows: { d: string; n: number }[]) => Object.fromEntries(rows.map((r) => [iso(r.d), Number(r.n)]));
  const logStarted = meta ? iso(meta.started) : iso(new Date());
  const series = buildSeries(lastDays(DAYS), {
    survivors: rec(surv), logJoined: Object.fromEntries(logRows.map((r) => [iso(r.d), Number(r.j)])), logLeft: Object.fromEntries(logRows.map((r) => [iso(r.d), Number(r.x)])),
    viaEvents: rec(viaRows), started: logStarted, totalNow: Number(t?.following ?? 0),
  });
  const markRows = (await sql`SELECT label, COALESCE(starts_at, created_at)::date AS d FROM tapcard_listed_events WHERE org_id = ${orgId} AND COALESCE(starts_at, created_at)::date > CURRENT_DATE - (${DAYS}::int) ORDER BY 2`) as { label: string; d: string }[];
  const marks: EventMark[] = markRows.map((r) => ({ day: iso(r.d), label: r.label }));

  return {
    totals: { following: Number(t?.following ?? 0), new7: Number(t?.new7 ?? 0), new30: Number(t?.new30 ?? 0), shared: Number(sh?.n ?? 0), eventTagged: Number(t?.tagged ?? 0) },
    sources, announcements, series, logStarted, marks,
  };
}
