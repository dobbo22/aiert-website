import { Fragment } from "react";
import type { Insights } from "@/lib/tapcardInsights";
import LineChart from "./LineChart";

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" });

export default function InsightsView({ data }: { data: Insights }) {
  const { totals, sources, announcements, series, marks, logStarted } = data;
  const anyData = series.some((p) => p.joined || p.left || p.viaEvents) || totals.following > 0;
  const stat = (n: number, label: string) => (
    <div className="rounded-2xl bg-charcoal px-4 py-4 ring-1 ring-white/10">
      <div className="text-3xl font-black text-gold">{n}</div>
      <div className="mt-1 text-sm text-cloud">{label}</div>
    </div>
  );
  const th = "py-2 pr-4 font-semibold";
  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
        <h2 className="text-lg font-bold text-cloud">Insights</h2>
        <p className="mt-2 text-cloud">Totals only, never a named person.</p>
        <details className="mt-2 text-sm text-cloud">
          <summary className="cursor-pointer font-semibold">How these numbers are counted</summary>
          <p className="mt-2">Scans and taps are counted as <strong>opens</strong>, not people: a person who opens a link twice counts twice, and link previews and scanners are left out where we can tell.</p>
        </details>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stat(totals.following, "Following now")}
        {stat(totals.new7, "New in 7 days")}
        {stat(totals.new30, "New in 30 days")}
        {stat(totals.shared, "Chose to share their details")}
        {stat(totals.eventTagged, "Came through an event")}
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
                <th className={th}>Event</th><th className={th}>When</th><th className={th}>Opens</th><th className={th}>Registered</th><th className={th}>Shared details</th><th className={th}>Registered per 100 opens</th>
              </tr></thead>
              <tbody>
                {sources.map((r) => (
                  <Fragment key={r.code}>
                    <tr className="border-b border-slate/50">
                      <td className="py-2 pr-4 font-semibold"><a className="text-gold underline" href="/business/admin/events">{r.label}</a></td>
                      <td className="py-2 pr-4">{r.when}</td>
                      <td className="py-2 pr-4">{r.opens}</td>
                      <td className="py-2 pr-4">{r.followers}</td>
                      <td className="py-2 pr-4">{r.shared}</td>
                      <td className="py-2 pr-4">{r.rate === null ? "–" : r.rate}</td>
                    </tr>
                    {r.slots.map((sl) => (
                      <tr key={r.code + sl.label + sl.startsAt} className="border-b border-slate/30 text-sm">
                        <td className="py-1 pr-4 pl-6">{sl.label}</td>
                        <td className="py-1 pr-4">{new Date(sl.startsAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" })} to {new Date(sl.endsAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" })}</td>
                        <td className="py-1 pr-4">–</td>
                        <td className="py-1 pr-4">{sl.followers}</td>
                        <td className="py-1 pr-4">{sl.shared}</td>
                        <td className="py-1 pr-4">–</td>
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
        <h2 className="text-lg font-bold text-cloud">Your announcements</h2>
        <p className="mt-2 text-cloud">How many followers each headline was sent to, and how many tapped through to the release.</p>
        {announcements.length === 0 ? (
          <p className="mt-4 rounded-xl bg-white/10 px-4 py-3 text-cloud">Nothing posted yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-cloud">
              <thead><tr className="border-b border-slate">
                <th className={th}>Headline</th><th className={th}>Posted</th><th className={th}>Sent to</th><th className={th}>Tapped through</th><th className={th}>Per 100 sent</th>
              </tr></thead>
              <tbody>
                {announcements.map((a) => (
                  <tr key={a.id} className="border-b border-slate/50 align-top">
                    <td className="py-2 pr-4 font-semibold">{a.text}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{day(a.postedAt)}</td>
                    <td className="py-2 pr-4">{a.sent}</td>
                    <td className="py-2 pr-4">{a.opens}</td>
                    <td className="py-2 pr-4">{a.opened ?? "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
        <h2 className="text-lg font-bold text-cloud">Following over time</h2>
        <p className="mt-1 text-sm text-cloud">Everyone following you, day by day over the last 90 days. A dip means people stopped following; each dot is an event.</p>
        {!anyData ? (
          <p className="mt-4 rounded-xl bg-white/10 px-4 py-3 text-cloud">No followers yet.</p>
        ) : (
          <div className="mt-4"><LineChart title="People following, per day" points={series} marks={marks}
            series={[{ name: "Following", color: "#FFFFFF", pick: (p) => p.total }]} /></div>
        )}
      </div>

      <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
        <h2 className="text-lg font-bold text-cloud">Joined and left each day</h2>
        <p className="mt-1 text-sm text-cloud">Spikes in <em>Through an event</em> show what an AGM or roadshow brought in. Stopping following is counted from {new Date(logStarted + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}; before that we only know who is still following.</p>
        {!anyData ? (
          <p className="mt-4 rounded-xl bg-white/10 px-4 py-3 text-cloud">Nothing to show yet.</p>
        ) : (
          <div className="mt-4"><LineChart title="People who joined, left and registered through an event, per day" points={series} marks={marks}
            series={[
              { name: "Joined", color: "#F5B63D", pick: (p) => p.joined },
              { name: "Left", color: "#FF8A80", dash: "6 4", pick: (p) => p.left },
              { name: "Through an event", color: "#4FD1C5", dash: "2 4", pick: (p) => p.viaEvents },
            ]} /></div>
        )}
      </div>
    </div>
  );
}
