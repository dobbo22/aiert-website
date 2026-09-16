import { cookies } from "next/headers";
import sql from "@/lib/db";
import mailbroomSql from "@/lib/mailbroomDb";
import { isValidAdminSession, COOKIE_NAME } from "@/lib/mailbroomAdminAuth";
import { getSearchPerformance } from "@/lib/googleSearchConsole";
import LoginForm from "../mailbroom/LoginForm";
import AdminHeader from "../AdminHeader";
import ClicksSparkline from "./ClicksSparkline";
import "../mailbroom/admin.css";
import "./marketing.css";

const ALL_HOSTS_KEY = "__all__";

type SnapshotRow = { snapshot_date: string; clicks: number; impressions: number };

async function getTrend(): Promise<SnapshotRow[]> {
  try {
    const rows = (await sql`
      SELECT snapshot_date, clicks, impressions
      FROM search_console_snapshots
      WHERE host = ${ALL_HOSTS_KEY}
      ORDER BY snapshot_date ASC
      LIMIT 90
    `) as SnapshotRow[];
    return rows;
  } catch {
    // Table doesn't exist until the daily cron job (or a manual backfill) has run once.
    return [];
  }
}

type SignupSourceRow = { source: string; count: number };

async function getSignupsBySource(): Promise<{
  rows: SignupSourceRow[];
  totalSignups: number;
  totalAttributed: number;
}> {
  try {
    const [bySourceRaw, totalRowRaw] = await Promise.all([
      mailbroomSql`
        SELECT COALESCE("utmSource", 'direct / unknown') as source, COUNT(*)::int as count
        FROM "SignupAttribution"
        GROUP BY source
        ORDER BY count DESC
        LIMIT 15
      `,
      mailbroomSql`SELECT COUNT(*)::int as count FROM "User"`,
    ]);
    const bySource = bySourceRaw as SignupSourceRow[];
    const totalRow = totalRowRaw as { count: number }[];
    const totalAttributed = bySource.reduce((sum, r) => sum + r.count, 0);
    return { rows: bySource, totalSignups: totalRow[0]?.count ?? 0, totalAttributed };
  } catch {
    // SignupAttribution only fills in for signups after this feature shipped.
    return { rows: [], totalSignups: 0, totalAttributed: 0 };
  }
}

export const metadata = {
  title: "Marketing — Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function fmtPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function fmtPos(n: number): string {
  return n.toFixed(1);
}

export default async function MarketingPage() {
  const session = (await cookies()).get(COOKIE_NAME)?.value;
  if (!isValidAdminSession(session)) {
    return <LoginForm />;
  }

  let data: Awaited<ReturnType<typeof getSearchPerformance>> | null = null;
  let error: string | null = null;

  try {
    data = await getSearchPerformance(28);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load Search Console data";
  }

  const trend = await getTrend();
  const signupsBySource = await getSignupsBySource();

  return (
    <div className="min-h-screen hero-gradient grid-bg">
      <AdminHeader />
      <div className="admin-page">
        <h1 className="admin-title" style={{ marginBottom: "1rem" }}>
          Marketing
        </h1>

        <p className="admin-mailbroom-note">
        Organic search performance for {data?.siteUrl ?? "mailbroom.app"} from Google Search
        Console, last 28 days ({data ? `${data.startDate} – ${data.endDate}` : "—"}).
      </p>

      {error && (
        <p className="social-compose-error">
          {error}. Search Console isn&apos;t connected yet — see the setup notes in{" "}
          <code>lib/googleSearchConsole.ts</code>.
        </p>
      )}

      {data && (
        <>
          <div className="admin-stats">
            <div className="admin-stat">
              <span className="admin-stat-value">{data.totals.clicks.toLocaleString()}</span>
              <span className="admin-stat-label">Clicks</span>
            </div>
            <div className="admin-stat">
              <span className="admin-stat-value">{data.totals.impressions.toLocaleString()}</span>
              <span className="admin-stat-label">Impressions</span>
            </div>
            <div className="admin-stat">
              <span className="admin-stat-value">{fmtPct(data.totals.ctr)}</span>
              <span className="admin-stat-label">Avg. CTR</span>
            </div>
            <div className="admin-stat">
              <span className="admin-stat-value">{fmtPos(data.totals.position)}</span>
              <span className="admin-stat-label">Avg. position</span>
            </div>
          </div>

          {data.bySubdomain.length > 0 && (
            <>
              <h2 className="admin-subtitle">By subdomain</h2>
              <div className="marketing-subdomains">
                {data.bySubdomain.map((s) => (
                  <div key={s.host} className="marketing-subdomain-card">
                    <div className="marketing-subdomain-host">{s.host}</div>
                    <div className="marketing-subdomain-stats">
                      <div>
                        <span className="marketing-subdomain-value">{s.clicks}</span>
                        <span className="marketing-subdomain-label">clicks</span>
                      </div>
                      <div>
                        <span className="marketing-subdomain-value">{s.impressions.toLocaleString()}</span>
                        <span className="marketing-subdomain-label">impr.</span>
                      </div>
                      <div>
                        <span className="marketing-subdomain-value">{fmtPos(s.position)}</span>
                        <span className="marketing-subdomain-label">pos.</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <h2 className="admin-subtitle">Clicks trend</h2>
          {trend.length > 1 ? (
            <ClicksSparkline data={trend} />
          ) : (
            <p className="admin-mailbroom-note">
              No history yet — a daily snapshot job runs each morning, so a trend will build up
              from today. Trigger <code>/api/cron/search-console-snapshot?backfill=30</code>{" "}
              (with the <code>CRON_SECRET</code> bearer token) to backfill the last 30 days now.
            </p>
          )}

          <h2 className="admin-subtitle">Signups by source</h2>
          {signupsBySource.totalSignups > 0 ? (
            <>
              <p className="admin-mailbroom-note">
                {signupsBySource.totalAttributed} of {signupsBySource.totalSignups} signups have
                attribution data (tracking started 2026-09-16 — earlier signups aren&apos;t
                included).
              </p>
              <table className="admin-table" style={{ marginBottom: "2rem" }}>
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Signups</th>
                  </tr>
                </thead>
                <tbody>
                  {signupsBySource.rows.map((row) => (
                    <tr key={row.source}>
                      <td>{row.source}</td>
                      <td>{row.count}</td>
                    </tr>
                  ))}
                  {signupsBySource.rows.length === 0 && (
                    <tr>
                      <td colSpan={2} className="admin-empty-cell">
                        No attributed signups yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          ) : (
            <p className="admin-mailbroom-note" style={{ marginBottom: "2rem" }}>
              No signup data available.
            </p>
          )}

          <div className="marketing-columns">
            <div>
              <h2 className="admin-subtitle">Top queries</h2>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Query</th>
                    <th>Clicks</th>
                    <th>Impr.</th>
                    <th>Pos.</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topQueries.map((row) => (
                    <tr key={row.keys[0]}>
                      <td>{row.keys[0]}</td>
                      <td>{row.clicks}</td>
                      <td>{row.impressions}</td>
                      <td>{fmtPos(row.position)}</td>
                    </tr>
                  ))}
                  {data.topQueries.length === 0 && (
                    <tr>
                      <td colSpan={4} className="admin-empty-cell">
                        No query data for this period yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div>
              <h2 className="admin-subtitle">Top pages</h2>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Page</th>
                    <th>Clicks</th>
                    <th>Impr.</th>
                    <th>Pos.</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topPages.map((row) => (
                    <tr key={row.keys[0]}>
                      <td className="marketing-page-cell">{row.keys[0].replace(/^https?:\/\//, "")}</td>
                      <td>{row.clicks}</td>
                      <td>{row.impressions}</td>
                      <td>{fmtPos(row.position)}</td>
                    </tr>
                  ))}
                  {data.topPages.length === 0 && (
                    <tr>
                      <td colSpan={4} className="admin-empty-cell">
                        No page data for this period yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  );
}
