import type { Insights } from "@/lib/tapcardInsights";

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" });

export default function InsightsView({ data }: { data: Insights }) {
  const { totals, sources, announcements, weeks } = data;
  const max = Math.max(1, ...weeks.map((w) => w.followers));
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
        <p className="mt-2 text-cloud">
          Totals only, never a named person. Scans and taps are counted as <strong>opens</strong>, not people: a person who opens a link twice counts twice, and link
          previews and scanners are left out where we can tell.
        </p>
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
        <p className="mt-2 text-cloud">
          Make a QR code for each place it will appear (see <a className="text-gold underline" href="/business/admin/cards">Cards &amp; QR</a>), for example one for the printed annual report and one
          for the web PDF. Compare how many opened each and how many of those followed.
        </p>
        {sources.length === 0 ? (
          <p className="mt-4 rounded-xl bg-white/10 px-4 py-3 text-cloud">No event codes yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-cloud">
              <thead><tr className="border-b border-slate">
                <th className={th}>Event or code</th><th className={th}>Kind</th><th className={th}>Opens</th><th className={th}>Followers</th><th className={th}>Shared details</th><th className={th}>Followed per 100 opens</th>
              </tr></thead>
              <tbody>
                {sources.map((r) => (
                  <tr key={r.code} className="border-b border-slate/50">
                    <td className="py-2 pr-4 font-semibold">{r.label}</td>
                    <td className="py-2 pr-4">{r.window}</td>
                    <td className="py-2 pr-4">{r.window === "time window" ? "–" : r.opens}</td>
                    <td className="py-2 pr-4">{r.followers}</td>
                    <td className="py-2 pr-4">{r.shared}</td>
                    <td className="py-2 pr-4">{r.window === "time window" || r.rate === null ? "–" : r.rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
        <h2 className="text-lg font-bold text-cloud">Your announcements</h2>
        <p className="mt-2 text-cloud">
          For each headline: how many followers it was sent to, and how many tapped through to the release. A tap is counted when someone opens it from the app or the card page;
          seeing the headline in a notification is not a tap.
        </p>
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
        <h2 className="text-lg font-bold text-cloud">New followers each week</h2>
        {weeks.length === 0 ? (
          <p className="mt-4 rounded-xl bg-white/10 px-4 py-3 text-cloud">No followers in the last 12 weeks.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {weeks.map((w) => (
              <li key={w.weekStart} className="flex items-center gap-3 text-cloud">
                <span className="w-28 shrink-0 text-sm">Week of {day(w.weekStart)}</span>
                <span className="h-4 rounded bg-gold" style={{ width: `${Math.max(2, Math.round((w.followers / max) * 100))}%` }} aria-hidden="true" />
                <span className="font-semibold">{w.followers}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
