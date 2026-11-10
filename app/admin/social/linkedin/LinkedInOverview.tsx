import type { Breakdown, PageOverview } from "@/lib/linkedinStats";

function List({ title, rows }: { title: string; rows: Breakdown[] }) {
  return (
    <div className="lk-stat">
      <h4 className="lk-stat-title">{title}</h4>
      {rows.length === 0 ? (
        <p className="lk-note">Not enough data yet.</p>
      ) : (
        <ul className="lk-stat-list">
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

function Figure({ value, label }: { value: number; label: string }) {
  return (
    <div className="lk-figure">
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}

export default function LinkedInOverview({ overview: o }: { overview: PageOverview }) {
  return (
    <div className="social-post-card lk-card">
      <p className="lk-title">Page numbers</p>
      <div className="lk-figures">
        <Figure value={o.followers} label="followers" />
        <Figure value={o.pageViews} label="page views (all time)" />
        <Figure value={o.last30.impressions} label="impressions (30 days)" />
        <Figure value={o.last30.clicks} label="clicks" />
        <Figure value={o.last30.reactions} label="reactions" />
        <Figure value={o.last30.comments} label="comments" />
        <Figure value={o.last30.shares} label="shares" />
      </div>
      <p className="lk-note">
        The 30-day totals count completed days only, so today shows up tomorrow (the per-post figures below include today). LinkedIn only shows the breakdowns once enough people are involved.
      </p>
      <div className="lk-stats">
        <List title="Followers by seniority" rows={o.followersBy.seniority} />
        <List title="Followers by industry" rows={o.followersBy.industry} />
        <List title="Followers by job function" rows={o.followersBy.function} />
        <List title="Followers by country" rows={o.followersBy.country} />
      </div>
      <div className="lk-stats">
        <List title="Page visitors by seniority" rows={o.viewersBy.seniority} />
        <List title="Page visitors by industry" rows={o.viewersBy.industry} />
        <List title="Page visitors by job function" rows={o.viewersBy.function} />
        <List title="Page visitors by country" rows={o.viewersBy.country} />
      </div>
    </div>
  );
}
