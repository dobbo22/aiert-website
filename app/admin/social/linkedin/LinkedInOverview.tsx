import type { Breakdown, PageOverview } from "@/lib/linkedinStats";

function List({ title, rows }: { title: string; rows: Breakdown[] }) {
  return (
    <div>
      <h4 className="social-post-meta">{title}</h4>
      {rows.length === 0 ? (
        <p className="social-empty">Not enough data yet.</p>
      ) : (
        <ul>
          {rows.map((r) => (
            <li key={r.label}>
              {r.label}: <b>{r.value}</b>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function LinkedInOverview({ overview: o }: { overview: PageOverview }) {
  return (
    <div className="social-post-card">
      <p className="social-post-message">
        <b>{o.followers}</b> followers · <b>{o.pageViews}</b> page views (all time) · last 30 days: <b>{o.last30.impressions}</b> impressions,{" "}
        <b>{o.last30.clicks}</b> clicks, <b>{o.last30.reactions}</b> reactions, <b>{o.last30.comments}</b> comments, <b>{o.last30.shares}</b> shares
      </p>
      <p className="social-empty">The 30-day totals count completed days only, so today shows up tomorrow (the per-post figures below include today). LinkedIn only shows the breakdowns once enough people are involved.</p>
      <div className="social-compose-row" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 24 }}>
        <List title="Followers by seniority" rows={o.followersBy.seniority} />
        <List title="Followers by industry" rows={o.followersBy.industry} />
        <List title="Followers by job function" rows={o.followersBy.function} />
        <List title="Followers by country" rows={o.followersBy.country} />
      </div>
      <div className="social-compose-row" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 24 }}>
        <List title="Page visitors by seniority" rows={o.viewersBy.seniority} />
        <List title="Page visitors by industry" rows={o.viewersBy.industry} />
        <List title="Page visitors by job function" rows={o.viewersBy.function} />
        <List title="Page visitors by country" rows={o.viewersBy.country} />
      </div>
    </div>
  );
}
