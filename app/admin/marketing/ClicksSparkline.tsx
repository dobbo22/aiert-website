type SnapshotRow = { snapshot_date: string; clicks: number; impressions: number };

function buildPath(values: number[], width: number, height: number, padding: number): string {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const step = (width - padding * 2) / Math.max(values.length - 1, 1);

  return values
    .map((v, i) => {
      const x = padding + i * step;
      const y = padding + (height - padding * 2) * (1 - (v - min) / range);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export default function ClicksSparkline({ data }: { data: SnapshotRow[] }) {
  const width = 800;
  const height = 140;
  const padding = 12;

  const clicks = data.map((d) => d.clicks);
  const impressions = data.map((d) => d.impressions);

  const clicksPath = buildPath(clicks, width, height, padding);
  const impressionsPath = buildPath(impressions, width, height, padding);

  const first = data[0]?.snapshot_date;
  const last = data[data.length - 1]?.snapshot_date;

  return (
    <div className="marketing-trend">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="marketing-trend-svg">
        <path d={impressionsPath} fill="none" stroke="#2DD4BF" strokeWidth="2" opacity="0.7" />
        <path d={clicksPath} fill="none" stroke="#FBBF24" strokeWidth="2.5" />
      </svg>
      <div className="marketing-trend-legend">
        <span className="marketing-trend-legend-item">
          <span className="marketing-trend-swatch marketing-trend-swatch-gold" /> Clicks
        </span>
        <span className="marketing-trend-legend-item">
          <span className="marketing-trend-swatch marketing-trend-swatch-teal" /> Impressions
        </span>
        <span className="marketing-trend-range">
          {first} – {last}
        </span>
      </div>
    </div>
  );
}
