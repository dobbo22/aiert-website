import type { DayPoint } from "@/lib/tapcardInsightsSeries";
import type { EventMark } from "@/lib/tapcardInsights";

export interface LineSeries { name: string; color: string; dash?: string; pick: (p: DayPoint) => number }

const W = 720, H = 230, L = 40, R = 12, T = 14, B = 30;
const fmt = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/// A plain SVG line chart over days: one line per series, a dashed vertical line and dot for each event, readable axes, and a legend that does not rely on colour alone.
export default function LineChart({ points, series, marks, title }: { points: DayPoint[]; series: LineSeries[]; marks: EventMark[]; title: string }) {
  const n = points.length;
  const max = Math.max(1, ...series.flatMap((s) => points.map(s.pick)));
  const nice = max <= 5 ? max : Math.ceil(max / 5) * 5;
  const x = (i: number) => L + (n <= 1 ? 0 : (i / (n - 1)) * (W - L - R));
  const y = (v: number) => T + (1 - v / nice) * (H - T - B);
  const idx = new Map(points.map((p, i) => [p.day, i]));
  const ticks = [0, nice / 2, nice].map((v) => Math.round(v * 10) / 10);
  const xl = [0, Math.floor((n - 1) / 2), n - 1];
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={title}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#ffffff" strokeOpacity="0.15" />
            <text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize="12" fill="#ffffff">{v}</text>
          </g>
        ))}
        {xl.map((i) => points[i] && <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} fontSize="12" fill="#ffffff">{fmt(points[i].day)}</text>)}
        {marks.map((m) => {
          const i = idx.get(m.day);
          if (i === undefined) return null;
          return (
            <g key={m.day + m.label}>
              <line x1={x(i)} x2={x(i)} y1={T} y2={H - B} stroke="#F5B63D" strokeDasharray="3 4" strokeOpacity="0.8" />
              <circle cx={x(i)} cy={T} r="4" fill="#F5B63D"><title>{`${m.label} (${fmt(m.day)})`}</title></circle>
            </g>
          );
        })}
        {series.map((s) => (
          <polyline key={s.name} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={s.dash}
            points={points.map((p, i) => `${x(i).toFixed(1)},${y(s.pick(p)).toFixed(1)}`).join(" ")} />
        ))}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-cloud">
        {series.map((s) => (
          <span key={s.name} className="inline-flex items-center gap-2">
            <svg width="26" height="8" aria-hidden="true"><line x1="0" y1="4" x2="26" y2="4" stroke={s.color} strokeWidth="3" strokeDasharray={s.dash} /></svg>{s.name}
          </span>
        ))}
        {marks.length > 0 && <span className="inline-flex items-center gap-2"><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4" fill="#F5B63D" /></svg>An event</span>}
      </figcaption>
    </figure>
  );
}
