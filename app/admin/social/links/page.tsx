import sql from "@/lib/db";
import { TRACKED_LINKS } from "@/lib/trackedLinks";

type ClickCount = { slug: string; count: string };
type RecentClick = {
  slug: string;
  clicked_at: string;
  country: string | null;
  ip_truncated: string | null;
  user_agent: string | null;
};

// Just enough to distinguish "a person" from "a bot/crawler/preview fetch"
// in the recent-clicks list — not a full UA parser.
function browserFromUserAgent(ua: string | null): string {
  if (!ua) return "Unknown";
  if (/bot|crawler|spider|facebookexternalhit|LinkedInBot/i.test(ua)) return "Bot/crawler";
  if (/Edg\//.test(ua)) return "Edge";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return "Safari";
  if (/Firefox\//.test(ua)) return "Firefox";
  return "Other";
}

export default async function LinkClicksPage() {
  let counts: ClickCount[] = [];
  let recent: RecentClick[] = [];
  let debugError: string | null = null;

  try {
    counts = (await sql`
      SELECT slug, COUNT(*)::text AS count
      FROM link_clicks
      GROUP BY slug
      ORDER BY COUNT(*) DESC
    `) as ClickCount[];
  } catch {
    // Table is created lazily on the first real click via /api/track-click —
    // until then, this is just "no clicks yet", not a real error.
  }

  try {
    recent = (await sql`
      SELECT slug, clicked_at, country, ip_truncated, user_agent
      FROM link_clicks
      ORDER BY clicked_at DESC
      LIMIT 20
    `) as RecentClick[];
  } catch (err) {
    debugError = err instanceof Error ? err.message : String(err);
  }

  const countBySlug = new Map(counts.map((c) => [c.slug, Number(c.count)]));
  const total = counts.reduce((sum, c) => sum + Number(c.count), 0);

  // Every configured link shows up even with zero clicks so it's obvious
  // at a glance which submissions haven't sent any traffic yet.
  const rows = Object.entries(TRACKED_LINKS)
    .map(([slug, link]) => ({ slug, label: link.label, count: countBySlug.get(slug) ?? 0 }))
    .sort((a, b) => b.count - a.count);

  return (
    <div>
      <div className="admin-stats">
        <div className="admin-stat">
          <span className="admin-stat-value">{total}</span>
          <span className="admin-stat-label">Total tracked clicks</span>
        </div>
        <div className="admin-stat">
          <span className="admin-stat-value">{rows.filter((r) => r.count > 0).length}</span>
          <span className="admin-stat-label">Links with at least 1 click</span>
        </div>
        <div className="admin-stat">
          <span className="admin-stat-value">{rows.length}</span>
          <span className="admin-stat-label">Links tracked</span>
        </div>
      </div>

      <p className="admin-mailbroom-note">
        Each row is one tracked redirect (ios.mailbroom.app/fb-* for the personal launch
        post, [ios|www].mailbroom.app/go/[slug] elsewhere) — it logs a click before
        forwarding to the real destination. Counts are since tracking was set up, not
        historical. IP addresses are anonymized before storage (last octet/64 bits
        zeroed) — only country, truncated IP, and browser family are kept, no raw IP.
      </p>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1.25rem" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.15)" }}>
            <th style={{ padding: "0.5rem 0.75rem 0.5rem 0" }}>Source</th>
            <th style={{ padding: "0.5rem 0.75rem" }}>Link</th>
            <th style={{ padding: "0.5rem 0 0.5rem 0.75rem", textAlign: "right" }}>Clicks</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.slug} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <td style={{ padding: "0.5rem 0.75rem 0.5rem 0" }}>{r.label}</td>
              <td style={{ padding: "0.5rem 0.75rem", opacity: 0.6, fontSize: "0.85em" }}>
                {r.slug.startsWith("fb-") ? `/${r.slug}` : `/go/${r.slug}`}
              </td>
              <td style={{ padding: "0.5rem 0 0.5rem 0.75rem", textAlign: "right", fontWeight: 600 }}>
                {r.count}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {recent.length > 0 && (
        <>
          <h2 className="admin-subtitle" style={{ fontSize: "1rem", marginTop: "1.5rem" }}>
            Most recent clicks
          </h2>
          {recent.map((r, i) => (
            <div key={i} className="social-post-card">
              <div className="social-post-meta">
                <span>{new Date(r.clicked_at).toLocaleString()}</span>
                <span>{r.country ?? "Unknown location"}</span>
                <span>{browserFromUserAgent(r.user_agent)}</span>
                {r.ip_truncated && <span style={{ opacity: 0.5 }}>{r.ip_truncated}</span>}
              </div>
              <p className="social-post-message">{TRACKED_LINKS[r.slug]?.label ?? r.slug}</p>
            </div>
          ))}
        </>
      )}

      {recent.length === 0 && !debugError && (
        <p className="admin-mailbroom-note" style={{ marginTop: "1rem" }}>
          No clicks recorded yet.
        </p>
      )}
      {debugError && <p className="social-compose-error">DEBUG: {debugError}</p>}
    </div>
  );
}
