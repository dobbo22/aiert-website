import { per100 } from "@/lib/tapcardInsightsMath";
import { companyNameFromDomain } from "@/lib/tapcardShareRules";
import type { Insights } from "@/lib/tapcardInsights";
import PrintButton from "./PrintButton";

const DAYS = 30;
const d = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" });

export default function ReportView({ orgName, data, today }: { orgName: string; data: Insights; today: string }) {
  const days = data.series.slice(-DAYS);
  const start = days[0]?.day ?? "";
  const end = days[days.length - 1]?.day ?? "";
  const left = days.reduce((n, p) => n + p.left, 0);
  const cutoff = start ? new Date(start + "T00:00:00Z").getTime() : 0;
  const anns = data.announcements.filter((a) => new Date(a.postedAt).getTime() >= cutoff);
  const th = "border-b border-black/30 py-1.5 pr-3 text-left font-semibold";
  const td = "border-b border-black/10 py-1.5 pr-3 align-top";
  const num = "border-b border-black/10 py-1.5 pl-3 text-right tabular-nums";
  const f = data.funnel;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <a href="/business/admin/insights" className="text-gold underline">Back to Insights</a>
        <PrintButton />
      </div>
      <article className="rounded-2xl bg-white p-8 text-black print:rounded-none print:p-0">
        <p className="text-sm font-semibold uppercase tracking-wider text-[#0b6b63]">Investor relations report</p>
        <h2 className="mt-1 text-3xl font-black">{orgName}</h2>
        <p className="mt-1">{start && end ? `${d(start)} to ${d(end)}` : "Last 30 days"} · prepared {d(today)}</p>

        <h3 className="mt-6 text-lg font-bold">Followers</h3>
        <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
          {([
            [String(data.totals.following), "Following now"],
            [`+${data.totals.new30}`, "New in the last 30 days"],
            [left > 0 || data.logStarted <= start ? String(left) : "–", "Stopped following in 30 days"],
            [String(data.totals.shared), `Shared their details${per100(data.totals.shared, data.totals.following) === null ? "" : ` (${per100(data.totals.shared, data.totals.following)}%)`}`],
          ] as const).map(([n, l]) => (<div key={l} className="py-1"><dd className="text-3xl font-black tabular-nums">{n}</dd><dt className="text-sm">{l}</dt></div>))}
        </dl>
        <p className="mt-1 text-sm">{data.reach.canBeNotified} can be notified now{data.reach.ios + data.reach.android > 0 ? ` (iPhone ${data.reach.ios}, Android ${data.reach.android})` : ""}.</p>

        <h3 className="mt-6 text-lg font-bold">Announcements in the period</h3>
        {anns.length === 0 ? <p className="mt-2">None posted.</p> : (
          <table className="mt-2 w-full text-sm">
            <thead><tr><th className={th}>Headline</th><th className={th}>Posted</th><th className={`${th} text-right`}>Sent to</th><th className={`${th} text-right`}>Tapped</th><th className={`${th} text-right`}>Per 100 sent</th></tr></thead>
            <tbody>
              {anns.map((a) => {
                const unknown = a.opens > a.sent;
                return (<tr key={a.id}><td className={td}>{a.text}</td><td className={`${td} whitespace-nowrap`}>{d(a.postedAt)}</td><td className={num}>{unknown ? "–" : a.sent}</td><td className={num}>{a.opens}</td><td className={num}>{unknown ? "–" : (a.opened ?? "–")}</td></tr>);
              })}
            </tbody>
          </table>
        )}

        <h3 className="mt-6 text-lg font-bold">Events</h3>
        {data.sources.length === 0 ? <p className="mt-2">No events yet.</p> : (
          <table className="mt-2 w-full text-sm">
            <thead><tr><th className={th}>Event</th><th className={th}>When</th><th className={`${th} text-right`}>Opens</th><th className={`${th} text-right`}>Registered</th><th className={`${th} text-right`}>Shared details</th></tr></thead>
            <tbody>
              {data.sources.slice(0, 8).map((e) => (<tr key={e.code}><td className={td}>{e.label}</td><td className={td}>{e.when}</td><td className={num}>{e.opens}</td><td className={num}>{e.followers}</td><td className={num}>{e.shared}</td></tr>))}
            </tbody>
          </table>
        )}

        <h3 className="mt-6 text-lg font-bold">Who is following</h3>
        {data.mix.people === 0 ? <p className="mt-2">Nobody has shared their details yet.</p> : (
          <>
            <p className="mt-2">{data.mix.companies} organisations and {data.mix.private} private (retail) investors have shared their details; {data.mix.newOrgs30} organisation{data.mix.newOrgs30 === 1 ? "" : "s"} appeared in the last 30 days.</p>
            {data.mix.top.length > 0 && <p className="mt-1 text-sm">Largest: {data.mix.top.slice(0, 5).map((c) => `${companyNameFromDomain(c.domain)} (${c.people})`).join(", ")}.</p>}
          </>
        )}

        <h3 className="mt-6 text-lg font-bold">From scan to shared details</h3>
        <p className="mt-2">{f.qrScans} QR scans · {f.opens} card opens · {f.following} following{per100(f.following, f.opens) === null ? "" : ` (${per100(f.following, f.opens)} per 100 opens)`} · {f.shared} shared their details{per100(f.shared, f.following) === null ? "" : ` (${per100(f.shared, f.following)} per 100 followers)`}.</p>

        <p className="mt-8 border-t border-black/20 pt-3 text-xs">
          Counts only: no shareholder is named in this report. Scans, opens and taps count opens, not people; link previews and scanners are left out where we can tell. Stopping following is counted from {d(data.logStarted)}. Notifications are sent only after an announcement is public and say nothing new.
        </p>
      </article>
    </div>
  );
}
