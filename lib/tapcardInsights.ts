import sql from "@/lib/db";
import { buildSeries, lastDays, type DayPoint } from "@/lib/tapcardInsightsSeries";
import { followChangeAfter, investorMix, type InvestorMix } from "@/lib/tapcardInsightsMath";

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
      // When taps through to an announcement happen: how soon after posting, and the hour of the day (UK time), counted from the day this was first created.
      .then(() => sql`CREATE TABLE IF NOT EXISTS tapcard_announcement_open_log (
        announcement_id BIGINT NOT NULL, delay TEXT NOT NULL, hod INTEGER NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (announcement_id, delay, hod)
      )`)
      // How many phones each announcement was pushed to. The push log is cleared after 14 days, so the count is kept here.
      .then(() => sql`CREATE TABLE IF NOT EXISTS tapcard_announcement_sent (announcement_id BIGINT PRIMARY KEY, sent INTEGER NOT NULL DEFAULT 0)`)
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
  // When it happened: within the first hour, the first day, or later; and the hour of day in the UK. Never fails the tap.
  try {
    await sql`INSERT INTO tapcard_announcement_open_log (announcement_id, delay, hod, n)
              SELECT a.id, CASE WHEN now() - a.created_at < interval '1 hour' THEN 'hour' WHEN now() - a.created_at < interval '1 day' THEN 'day' ELSE 'later' END,
                     EXTRACT(HOUR FROM now() AT TIME ZONE 'Europe/London')::int, 1
              FROM tapcard_announcements a WHERE a.id = ${id}
              ON CONFLICT (announcement_id, delay, hod) DO UPDATE SET n = tapcard_announcement_open_log.n + 1`;
  } catch { /* the headline count above is what matters */ }
}

/// Remembers how many phones an announcement was pushed to (never throws).
export async function recordNewsSent(announcementId: number, n: number): Promise<void> {
  if (!Number.isFinite(announcementId) || n <= 0) return;
  try {
    await ensureInsightSchema();
    await sql`INSERT INTO tapcard_announcement_sent (announcement_id, sent) VALUES (${announcementId}, ${n})
              ON CONFLICT (announcement_id) DO UPDATE SET sent = tapcard_announcement_sent.sent + ${n}`;
  } catch { /* a missed count must not fail a push */ }
}

export interface SlotStat { label: string; startsAt: string; endsAt: string; followers: number; shared: number }
export interface SourceRow { code: string; label: string; when: string; opens: number; followers: number; shared: number; rate: number | null; slots: SlotStat[] }
export interface AnnouncementRow {
  id: number; text: string; postedAt: string; sent: number; opens: number; opened: number | null;
  /// Taps within the first hour and the first day after posting (counted from when timing started being recorded).
  firstHour: number; firstDay: number;
  /// Who started and stopped following over the posting day and the next (null when that was before leavers were counted).
  joined48: number | null; left48: number | null;
}
export interface EventMark { day: string; label: string }
export interface Insights {
  totals: { following: number; new7: number; new30: number; shared: number; eventTagged: number };
  sources: SourceRow[];
  announcements: AnnouncementRow[];
  series: DayPoint[];
  logStarted: string;
  marks: EventMark[];
  /// Scan to card open to follow to shared details (opens are not people).
  funnel: { qrScans: number; opens: number; following: number; shared: number };
  mix: InvestorMix;
  /// Followers who can receive an announcement now, and on which phones.
  reach: { canBeNotified: number; ios: number; android: number };
  /// Taps through to announcements by hour of the day (UK time), 24 numbers; empty counts until timing has been recorded.
  tapHours: number[];
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
    if (!a || !b) return "Any time";
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

  // Keep each announcement's send count past the 14 days the push log is held for: record whatever the log has now.
  await sql`
    INSERT INTO tapcard_announcement_sent (announcement_id, sent)
    SELECT l.ref::bigint, COUNT(*)::int FROM tapcard_push_log l
    WHERE l.kind = 'news' AND l.ref ~ '^[0-9]+$' AND l.ref::bigint IN (
      SELECT a.id FROM tapcard_announcements a JOIN tapcard_listed_cards lc ON lc.card_id = a.card_id JOIN tapcard_cards c ON c.id = a.card_id WHERE c.org_id = ${orgId})
    GROUP BY l.ref
    ON CONFLICT (announcement_id) DO UPDATE SET sent = GREATEST(tapcard_announcement_sent.sent, EXCLUDED.sent)`.catch(() => []);
  const annRows = (await sql`
    SELECT a.id, a.text, a.created_at,
      COALESCE((SELECT s.sent FROM tapcard_announcement_sent s WHERE s.announcement_id = a.id), 0)::int AS sent,
      COALESCE((SELECT SUM(o.n) FROM tapcard_announcement_opens o WHERE o.announcement_id = a.id), 0)::int AS opens,
      COALESCE((SELECT SUM(o.n) FROM tapcard_announcement_open_log o WHERE o.announcement_id = a.id AND o.delay = 'hour'), 0)::int AS first_hour,
      COALESCE((SELECT SUM(o.n) FROM tapcard_announcement_open_log o WHERE o.announcement_id = a.id AND o.delay IN ('hour', 'day')), 0)::int AS first_day
    FROM tapcard_announcements a
    JOIN tapcard_listed_cards l ON l.card_id = a.card_id JOIN tapcard_cards c ON c.id = a.card_id
    WHERE c.org_id = ${orgId} AND a.withdrawn = false ORDER BY a.id DESC LIMIT 20`) as { id: number; text: string; created_at: string; sent: number; opens: number; first_hour: number; first_day: number }[];
  const hourRows = (await sql`
    SELECT o.hod, SUM(o.n)::int AS n FROM tapcard_announcement_open_log o
    WHERE o.announcement_id IN (SELECT a.id FROM tapcard_announcements a JOIN tapcard_listed_cards l ON l.card_id = a.card_id JOIN tapcard_cards c ON c.id = a.card_id WHERE c.org_id = ${orgId})
    GROUP BY o.hod`) as { hod: number; n: number }[];
  const tapHours = Array.from({ length: 24 }, (_, h) => Number(hourRows.find((r) => Number(r.hod) === h)?.n ?? 0));

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

  const announcements: AnnouncementRow[] = annRows.map((r) => {
    const posted = new Date(r.created_at).toISOString();
    const change = followChangeAfter(series, posted.slice(0, 10), logStarted);
    return {
      id: Number(r.id), text: r.text, postedAt: posted, sent: Number(r.sent), opens: Number(r.opens),
      opened: Number(r.sent) > 0 ? Math.round((Number(r.opens) / Number(r.sent)) * 100) : null,
      firstHour: Number(r.first_hour), firstDay: Number(r.first_day),
      joined48: change ? change.joined : null, left48: change ? change.left : null,
    };
  });

  // Scan to card open to follow to shared details, who is on a company address, and who can be reached and on what phone.
  const { listedSummary } = await import("@/lib/tapcardListedAdmin");
  const { listSharedFollowers } = await import("@/lib/tapcardShare");
  const { emailGroup } = await import("@/lib/tapcardShareRules");
  const [summary, people] = await Promise.all([listedSummary(orgId).catch(() => null), listSharedFollowers(orgId).catch(() => [])]);
  const mix = investorMix(people.map((p) => { const g = emailGroup(p.email); return { domain: g.kind === "company" ? g.domain : null, consentedAt: p.consentedAt }; }));
  const plat = (await sql`
    SELECT d.platform, COUNT(*)::int AS n FROM tapcard_push_prefs p JOIN tapcard_push_devices d ON d.follower_hash = p.follower_hash
    WHERE p.news AND p.card_id IN (SELECT l.card_id FROM tapcard_listed_cards l JOIN tapcard_cards c ON c.id = l.card_id WHERE c.org_id = ${orgId})
    GROUP BY d.platform`.catch(() => [])) as { platform: string; n: number }[];
  const nOf = (p: string) => Number(plat.find((r) => r.platform === p)?.n ?? 0);

  return {
    totals: { following: Number(t?.following ?? 0), new7: Number(t?.new7 ?? 0), new30: Number(t?.new30 ?? 0), shared: Number(sh?.n ?? 0), eventTagged: Number(t?.tagged ?? 0) },
    sources, announcements, series, logStarted, marks,
    funnel: { qrScans: summary?.qrViews ?? 0, opens: summary?.views ?? 0, following: Number(t?.following ?? 0), shared: Number(sh?.n ?? 0) },
    mix,
    reach: { canBeNotified: summary?.canBeNotified ?? 0, ios: nOf("ios"), android: nOf("android") },
    tapHours,
  };
}
