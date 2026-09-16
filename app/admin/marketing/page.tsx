import { cookies } from "next/headers";
import { isValidAdminSession, COOKIE_NAME } from "@/lib/mailbroomAdminAuth";
import { getSearchPerformance } from "@/lib/googleSearchConsole";
import LoginForm from "../mailbroom/LoginForm";
import AdminHeader from "../AdminHeader";
import "../mailbroom/admin.css";
import "./marketing.css";

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
