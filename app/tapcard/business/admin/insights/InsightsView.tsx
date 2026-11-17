import { Fragment } from "react";
import type { EventMark, Insights } from "@/lib/tapcardInsights";
import LineChart from "./LineChart";
import { trimSeries, type Range } from "@/lib/tapcardInsightsSeries";
import { per100 } from "@/lib/tapcardInsightsMath";
import { companyNameFromDomain } from "@/lib/tapcardShareRules";

export type { Range };

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" });
const ymd = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Europe/London" });
const hm = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });

export default function InsightsView({ data, range = "since" }: { data: Insights; range?: Range }) {
  const { totals, sources, announcements, series, marks, logStarted, funnel, mix, reach, tapHours } = data;
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
      <div className="flex justify-end"><a href="/business/admin/report" className="rounded-xl px-4 py-2 text-sm font-semibold text-cloud ring-1 ring-slate hover:text-gold">Monthly report (print or save as PDF)</a></div>
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
          <div className="mt-4 overflow-x-auto" tabIndex={0} role="region" aria-label="Announcements table, scrolls sideways on a small screen">
            <table className="w-full text-left text-cloud">
              <thead><tr className="border-b border-slate">
                <th className={th}>Headline</th><th className={th}>Posted</th><th className={thn}>Sent to</th><th className={thn}>Tapped through</th><th className={thn}>Per 100 sent</th><th className={thn}>Tapped in first day</th><th className={thn}>Joined / left in 48 hours</th>
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
                      <td className={tdn} title="Counted from when timing began to be recorded">{a.firstDay > 0 ? a.firstDay : "–"}</td>
                      <td className={tdn} title="The day it was posted and the day after">{a.joined48 === null ? "–" : <><span className="text-teal">+{a.joined48}</span> / <span>{a.left48 ? `−${a.left48}` : "0"}</span></>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
        <h2 className="text-lg font-bold text-cloud">When announcements get read</h2>
        <p className="mt-1 text-sm text-cloud">Taps through to a release, by the hour of the day (UK time). It builds up from the day timing started being recorded, so it fills in as announcements go out.</p>
        {tapHours.reduce((n, x) => n + x, 0) === 0 ? (
          <p className="mt-4 rounded-xl bg-white/10 px-4 py-3 text-cloud">No timing yet. Taps are being recorded from now.</p>
        ) : (
          <>
            <div className="mt-4 flex h-28 items-end gap-1" role="img" aria-label="Taps through to announcements by hour of the day">
              {tapHours.map((n, h) => (
                <div key={h} className="flex-1 rounded-t bg-gold" title={`${String(h).padStart(2, "0")}:00 · ${n} ${n === 1 ? "tap" : "taps"}`} style={{ height: `${Math.max(3, Math.round((n / Math.max(1, ...tapHours)) * 100))}%`, opacity: n === 0 ? 0.25 : 1 }} />
              ))}
            </div>
            <div className="mt-1 flex justify-between text-sm text-cloud"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span></div>
            <p className="mt-2 text-cloud">Busiest hour: <strong>{String(tapHours.indexOf(Math.max(...tapHours))).padStart(2, "0")}:00</strong> ({Math.max(...tapHours)} {Math.max(...tapHours) === 1 ? "tap" : "taps"}).</p>
          </>
        )}
      </div>

      <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
        <h2 className="text-lg font-bold text-cloud">From scan to shared details</h2>
        <p className="mt-1 text-sm text-cloud">Where interest drops off. Scans and opens are counts of opens, not people.</p>
        <div className="mt-3">
          <Bar label="QR code scans" n={funnel.qrScans} max={Math.max(funnel.qrScans, funnel.opens)} />
          <Bar label="Card opens (any way)" n={funnel.opens} max={Math.max(funnel.qrScans, funnel.opens)} color="bg-white" />
          <Bar label="Following" n={funnel.following} max={Math.max(funnel.qrScans, funnel.opens)} sub={per100(funnel.following, funnel.opens) === null ? undefined : `${per100(funnel.following, funnel.opens)} per 100 opens`} color="bg-teal" />
          <Bar label="Chose to share their details" n={funnel.shared} max={Math.max(funnel.qrScans, funnel.opens)} sub={per100(funnel.shared, funnel.following) === null ? undefined : `${per100(funnel.shared, funnel.following)} per 100 followers`} color="bg-teal" />
        </div>
        <p className="mt-3 border-t border-slate/50 pt-3 text-cloud">
          <strong className="tabular-nums">{reach.canBeNotified}</strong> of {funnel.following} followers can be notified{per100(reach.canBeNotified, funnel.following) === null ? "" : ` (${per100(reach.canBeNotified, funnel.following)}%)`}
          {reach.ios + reach.android > 0 ? <> · iPhone <strong className="tabular-nums">{reach.ios}</strong> · Android <strong className="tabular-nums">{reach.android}</strong></> : null}.
          <span className="block text-sm">A follower can be notified when they have the app with notifications on.</span>
        </p>
      </div>

      <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
        <h2 className="text-lg font-bold text-cloud">Who is following</h2>
        <p className="mt-1 text-sm text-cloud">People who chose to share their details, grouped by the web address of their email. Private means addresses such as Gmail or Hotmail, usually retail investors.</p>
        {mix.people === 0 ? (
          <p className="mt-4 rounded-xl bg-white/10 px-4 py-3 text-cloud">Nobody has shared their details yet.</p>
        ) : (
          <>
            <div className="mt-3 grid grid-cols-3 gap-3 text-cloud">
              <div><div className="text-2xl font-black text-gold tabular-nums">{mix.companies}</div><div className="text-sm">Organisations</div></div>
              <div><div className="text-2xl font-black text-gold tabular-nums">{mix.private}</div><div className="text-sm">Private / retail</div></div>
              <div><div className="text-2xl font-black text-gold tabular-nums">{mix.newOrgs30}</div><div className="text-sm">New organisations in 30 days</div></div>
            </div>
            {mix.top.length > 0 && (
              <div className="mt-3 border-t border-slate/50 pt-2">
                {mix.top.map((c) => <Bar key={c.domain} label={companyNameFromDomain(c.domain)} n={c.people} max={mix.top[0].people} sub={c.domain} />)}
              </div>
            )}
          </>
        )}
      </div>

      <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
        <h2 className="text-lg font-bold text-cloud">Where followers came from</h2>
        <p className="mt-2 text-cloud">Opens and followers for each event QR code. Make codes under <a className="text-gold underline" href="/business/admin/cards?tab=events">Cards &amp; QR, Events</a>.</p>
        {sources.length === 0 ? (
          <p className="mt-4 rounded-xl bg-white/10 px-4 py-3 text-cloud">No events yet. Make one under Cards &amp; QR, Events.</p>
        ) : (
          <div className="mt-4 overflow-x-auto" tabIndex={0} role="region" aria-label="Events table, scrolls sideways on a small screen">
            <table className="w-full text-left text-cloud">
              <thead><tr className="border-b border-slate">
                <th className={th}>Event</th><th className={th}>When</th><th className={thn}>Opens</th><th className={thn}>Registered</th><th className={thn}>Shared details</th><th className={thn}>Registered per 100 opens</th>
              </tr></thead>
              <tbody>
                {sources.map((r) => (
                  <Fragment key={r.code}>
                    <tr className="border-b border-slate/50">
                      <td className="py-2 pr-4 font-semibold"><a className="text-gold underline" href="/business/admin/cards?tab=events">{r.label}</a></td>
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

/// A horizontal bar with a label and a number: the bar's length is the share of the biggest figure in its group.
function Bar({ label, n, max, sub, color = "bg-gold" }: { label: string; n: number; max: number; sub?: string; color?: string }) {
  return (
    <div className="py-1.5">
      <div className="flex items-baseline justify-between gap-3 text-cloud"><span className="font-semibold">{label}</span><span className="whitespace-nowrap tabular-nums"><strong>{n}</strong>{sub ? <span className="text-sm"> · {sub}</span> : null}</span></div>
      <div className="mt-1 h-2.5 rounded-full bg-white/10" role="presentation"><div className={`h-2.5 rounded-full ${color}`} style={{ width: `${max > 0 ? Math.max(2, Math.round((n / max) * 100)) : 0}%` }} /></div>
    </div>
  );
}
