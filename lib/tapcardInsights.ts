import sql from "@/lib/db";

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
      .catch((e) => { ready = null; throw e; });
  }
  return ready;
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

export interface SourceRow { code: string; label: string; window: string; opens: number; followers: number; shared: number; rate: number | null }
export interface AnnouncementRow { id: number; text: string; postedAt: string; sent: number; opens: number; opened: number | null }
export interface WeekRow { weekStart: string; followers: number }
export interface Insights {
  totals: { following: number; new7: number; new30: number; shared: number; eventTagged: number };
  sources: SourceRow[];
  announcements: AnnouncementRow[];
  weeks: WeekRow[];
}

export async function getInsights(orgId: string): Promise<Insights> {
  await ensureInsightSchema();
  const { ensureFollowerEventColumn } = await import("@/lib/tapcardEvents");
  await ensureFollowerEventColumn();
  const [t] = (await sql`
    SELECT
      COUNT(*)::int AS following,
      COUNT(*) FILTER (WHERE f.created_at > now() - interval '7 days')::int AS new7,
      COUNT(*) FILTER (WHERE f.created_at > now() - interval '30 days')::int AS new30,
      COUNT(*) FILTER (WHERE f.event_code <> '')::int AS tagged
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
      (SELECT COUNT(*)::int FROM tapcard_followers f WHERE f.event_code = e.code) AS followers,
      (SELECT COUNT(*)::int FROM tapcard_follower_details d WHERE d.event_code = e.code) AS shared
    FROM tapcard_listed_events e WHERE e.org_id = ${orgId} ORDER BY COALESCE(e.starts_at, e.created_at) DESC`) as
    { code: string; label: string; starts_at: string | null; ends_at: string | null; opens: number; followers: number; shared: number }[];
  const sources: SourceRow[] = srcRows.map((r) => ({
    code: r.code, label: r.label, window: r.starts_at && r.ends_at ? "time window" : "QR code",
    opens: Number(r.opens), followers: Number(r.followers), shared: Number(r.shared),
    rate: Number(r.opens) > 0 ? Math.round((Number(r.followers) / Number(r.opens)) * 100) : null,
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

  const wk = (await sql`
    SELECT date_trunc('week', f.created_at)::date AS wk, COUNT(*)::int AS n
    FROM tapcard_followers f JOIN tapcard_listed_cards l ON l.card_id = f.card_id JOIN tapcard_cards c ON c.id = f.card_id
    WHERE c.org_id = ${orgId} AND f.created_at > now() - interval '84 days' GROUP BY 1 ORDER BY 1`) as { wk: string; n: number }[];
  const weeks: WeekRow[] = wk.map((r) => ({ weekStart: new Date(r.wk).toISOString().slice(0, 10), followers: Number(r.n) }));

  return {
    totals: { following: Number(t?.following ?? 0), new7: Number(t?.new7 ?? 0), new30: Number(t?.new30 ?? 0), shared: Number(sh?.n ?? 0), eventTagged: Number(t?.tagged ?? 0) },
    sources, announcements, weeks,
  };
}
