import { Fragment } from "react";
import type { EventMark, Insights } from "@/lib/tapcardInsights";
import LineChart from "./LineChart";
import { trimSeries, type Range } from "@/lib/tapcardInsightsSeries";

export type { Range };

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" });
const ymd = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Europe/London" });
const hm = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });

export default function InsightsView({ data, range = "since" }: { data: Insights; range?: Range }) {
  const { totals, sources, announcements, series, marks, logStarted } = data;
  const anyData = series.some((p) => p.joined || p.left || p.viaEvents) || totals.following > 0;
  const points = trimSeries(series, range);
  const first = points[0]?.day ?? "";
  const shownMarks = marks.filter((m) => m.day >= first);
  const notes: EventMark[] = announcements.map((a) => ({ day: ymd(a.postedAt), label: a.text.length > 60 ? a.text.slice(0, 57) + "..." : a.text })).filter((m) => m.day >= first);
  const left30 = series.slice(-30).reduce((n, p) => n + p.left, 0);
  const th = "py-2 pr-4 font-semibold";
  const thn = "py-2 pl-4 text-right font-semibold";
  const tdn = "py-2 pl-4 text-right tabular-nums";
  const rangeLink = (r: Range, label: string) => (
    <a key={r} href={r === "since" ? "/business/admin/insights" : `/business/admin/insights?range=${r}`} aria-current={range === r ? "true" : undefined}
      className={`rounded-xl px-3 py-1 text-sm font-semibold ring-1 ${range === r ? "bg-white text-black ring-transparent" : "text-cloud ring-slate hover:text-gold"}`}>{label}</a>
  );
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {([
          [`+${totals.new7}`, "New in 7 days", ""],
          [`+${totals.new30}`, "New in 30 days", ""],
          [String(left30), "Stopped following in 30 days", ""],
          [totals.following > 0 ? `${Math.round((totals.shared / totals.following) * 100)}%` : "–", "Chose to share their details", `${totals.shared} of ${totals.following}`],
          [totals.following > 0 ? `${Math.round((totals.eventTagged / totals.following) * 100)}%` : "–", "Came through an event", `${totals.eventTagged} of ${totals.following}`],
        ] as const).map(([n, l, sub]) => (
          <div key={l} className="rounded-2xl bg-charcoal px-4 py-4 ring-1 ring-white/10">
            <div className="text-3xl font-black text-gold tabular-nums">{n}</div>
            <div className="mt-1 text-sm text-cloud">{l}</div>
            {sub && <div className="text-sm text-cloud">{sub}</div>}
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-cloud">Following over time</h2>
          <div className="flex gap-2" aria-label="Time range">{rangeLink("since", "Since the first follower")}{rangeLink("30", "30 days")}{rangeLink("90", "90 days")}</div>
        </div>
        <p className="mt-1 text-sm text-cloud">{totals.following} following now. A dip means people stopped following. Yellow dots are events and teal diamonds are announcements you sent.</p>
        {!anyData ? (
          <p className="mt-4 rounded-xl bg-white/10 px-4 py-3 text-cloud">No followers yet.</p>
        ) : (
          <div className="mt-4"><LineChart title="People following, per day" points={points} marks={shownMarks} notes={notes}
            series={[{ name: "Following", color: "#FFFFFF", pick: (p) => p.total }]} /></div>
        )}
      </div>

      <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
        <h2 className="text-lg font-bold text-cloud">Your announcements</h2>
        <p className="mt-2 text-cloud">How many followers each headline was sent to, and how many tapped through to the release.</p>
        {announcements.length === 0 ? (
          <p className="mt-4 rounded-xl bg-white/10 px-4 py-3 text-cloud">Nothing posted yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-cloud">
              <thead><tr className="border-b border-slate">
                <th className={th}>Headline</th><th className={th}>Posted</th><th className={thn}>Sent to</th><th className={thn}>Tapped through</th><th className={thn}>Per 100 sent</th>
              </tr></thead>
              <tbody>
                {announcements.map((a) => {
                  // More taps than recorded sends (a person who has since stopped following, or a send from before sends were counted): show the taps, not a sent figure that cannot be right.
                  const unknownSent = a.opens > a.sent;
                  return (
                    <tr key={a.id} className="border-b border-slate/50 align-top">
                      <td className="py-2 pr-4 font-semibold">{a.text}</td>
                      <td className="py-2 pr-4 whitespace-nowrap">{day(a.postedAt)}</td>
                      <td className={tdn} title={unknownSent ? "Sends are only counted while the person still follows" : undefined}>{unknownSent ? "–" : a.sent}</td>
                      <td className={tdn}>{a.opens}</td>
                      <td className={tdn}>{unknownSent ? "–" : (a.opened ?? "–")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
        <h2 className="text-lg font-bold text-cloud">Where followers came from</h2>
        <p className="mt-2 text-cloud">Opens and followers for each event QR code. Make codes on the <a className="text-gold underline" href="/business/admin/events">Events</a> tab.</p>
        {sources.length === 0 ? (
          <p className="mt-4 rounded-xl bg-white/10 px-4 py-3 text-cloud">No events yet. Make one on the Events tab.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-cloud">
              <thead><tr className="border-b border-slate">
                <th className={th}>Event</th><th className={th}>When</th><th className={thn}>Opens</th><th className={thn}>Registered</th><th className={thn}>Shared details</th><th className={thn}>Registered per 100 opens</th>
              </tr></thead>
              <tbody>
                {sources.map((r) => (
                  <Fragment key={r.code}>
                    <tr className="border-b border-slate/50">
                      <td className="py-2 pr-4 font-semibold"><a className="text-gold underline" href="/business/admin/events">{r.label}</a></td>
                      <td className="py-2 pr-4">{r.when}</td>
                      <td className={tdn}>{r.opens}</td>
                      <td className={tdn}>{r.followers}</td>
                      <td className={tdn}>{r.shared}</td>
                      <td className={tdn}>{r.rate === null ? "–" : r.rate}</td>
                    </tr>
                    {r.slots.map((sl) => (
                      <tr key={r.code + sl.label + sl.startsAt} className="border-b border-slate/30 text-sm">
                        <td className="py-1 pr-4 pl-6">{sl.label}</td>
                        <td className="py-1 pr-4">{hm(sl.startsAt)} to {hm(sl.endsAt)}</td>
                        <td className="py-1 pl-4 text-right">–</td>
                        <td className="py-1 pl-4 text-right tabular-nums">{sl.followers}</td>
                        <td className="py-1 pl-4 text-right tabular-nums">{sl.shared}</td>
                        <td className="py-1 pl-4 text-right">–</td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
        <h2 className="text-lg font-bold text-cloud">Joined and left each day</h2>
        <p className="mt-1 text-sm text-cloud">Spikes in <em>Through an event</em> show what an AGM or roadshow brought in. Stopping following is counted from {new Date(logStarted + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}; before that we only know who is still following.</p>
        {!anyData ? (
          <p className="mt-4 rounded-xl bg-white/10 px-4 py-3 text-cloud">Nothing to show yet.</p>
        ) : (
          <div className="mt-4"><LineChart title="People who joined, left and registered through an event, per day" points={points} marks={shownMarks} notes={notes}
            series={[
              { name: "Joined", color: "#F5B63D", pick: (p) => p.joined },
              { name: "Left", color: "#FF8A80", dash: "6 4", pick: (p) => p.left },
              { name: "Through an event", color: "#4FD1C5", dash: "2 4", pick: (p) => p.viaEvents },
            ]} /></div>
        )}
      </div>

      <details className="rounded-2xl bg-charcoal p-4 text-sm text-cloud ring-1 ring-white/10">
        <summary className="cursor-pointer font-semibold">How these numbers are counted</summary>
        <p className="mt-2">Totals only, never a named person. Scans and taps are counted as <strong>opens</strong>, not people: a person who opens a link twice counts twice, and link previews and scanners are left out where we can tell.</p>
      </details>
    </div>
  );
}
