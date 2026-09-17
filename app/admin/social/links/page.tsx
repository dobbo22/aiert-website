import sql from "@/lib/db";

const LABELS: Record<string, string> = {
  "fb-launch": "App Store (launch post)",
  "fb-medium": "Medium article",
  "fb-review": "TheBusinessDive review",
  "fb-follow": "Facebook Page follow",
};

type ClickCount = { slug: string; count: string };
type RecentClick = { slug: string; clicked_at: string };

export default async function LinkClicksPage() {
  let counts: ClickCount[] = [];
  let recent: RecentClick[] = [];
  let error: string | null = null;

  try {
    counts = (await sql`
      SELECT slug, COUNT(*)::text AS count
      FROM link_clicks
      GROUP BY slug
      ORDER BY COUNT(*) DESC
    `) as ClickCount[];

    recent = (await sql`
      SELECT slug, clicked_at
      FROM link_clicks
      ORDER BY clicked_at DESC
      LIMIT 20
    `) as RecentClick[];
  } catch {
    // Table is created lazily on the first real click via /api/track-click —
    // until then, this is just "no clicks yet", not a real error.
    counts = [];
    recent = [];
  }

  const total = counts.reduce((sum, c) => sum + Number(c.count), 0);

  return (
    <div>
      <div className="admin-stats">
        <div className="admin-stat">
          <span className="admin-stat-value">{total}</span>
          <span className="admin-stat-label">Total tracked clicks</span>
        </div>
        {Object.keys(LABELS).map((slug) => {
          const found = counts.find((c) => c.slug === slug);
          return (
            <div className="admin-stat" key={slug}>
              <span className="admin-stat-value">{found ? found.count : 0}</span>
              <span className="admin-stat-label">{LABELS[slug] ?? slug}</span>
            </div>
          );
        })}
      </div>

      <p className="admin-mailbroom-note">
        Counts clicks on the ios.mailbroom.app/fb-* tracking links used in personal/social
        posts — each records a click before forwarding to its real destination
        (App Store, Medium, TheBusinessDive, the Facebook Page). This shows totals since
        tracking was set up, not historical activity from before then.
      </p>

      {error && <p className="social-compose-error">{error}</p>}

      {recent.length > 0 && (
        <>
          <h2 className="admin-subtitle" style={{ fontSize: "1rem", marginTop: "1.5rem" }}>
            Most recent clicks
          </h2>
          {recent.map((r, i) => (
            <div key={i} className="social-post-card">
              <div className="social-post-meta">
                <span>{new Date(r.clicked_at).toLocaleString()}</span>
              </div>
              <p className="social-post-message">{LABELS[r.slug] ?? r.slug}</p>
            </div>
          ))}
        </>
      )}

      {recent.length === 0 && !error && (
        <p className="admin-mailbroom-note" style={{ marginTop: "1rem" }}>
          No clicks recorded yet.
        </p>
      )}
    </div>
  );
}
