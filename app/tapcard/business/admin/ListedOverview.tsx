import { listedSummary, type ListedSummary } from "@/lib/tapcardListedAdmin";
import { getInsights, type EventMark, type Insights } from "@/lib/tapcardInsights";
import { listSharedFollowers, type SharedFollower } from "@/lib/tapcardShare";
import { trimSeries } from "@/lib/tapcardInsightsSeries";
import LineChart from "./insights/LineChart";

export default async function ListedOverview({ orgId, orgName }: { orgId: string; orgName: string }) {
  const [s, insights, people] = await Promise.all([
    listedSummary(orgId),
    getInsights(orgId).catch(() => null),
    listSharedFollowers(orgId).catch(() => [] as SharedFollower[]),
  ]);
  return <ListedOverviewView s={s} orgName={orgName} insights={insights} people={people} />;
}

const ymd = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Europe/London" });
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
const short = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" });

export function ListedOverviewView({ s, orgName, insights = null, people = [] }: { s: ListedSummary; orgName: string; insights?: Insights | null; people?: SharedFollower[] }) {
  const steps: { done: boolean; href: string; title: string; text: string }[] = [
    { done: !!s.primaryCardId, href: s.primaryCardId ? `/c/${s.primaryCardId}?preview=1` : "/business/admin/cards", title: "Check your company card",
      text: "This is what a shareholder sees when they scan your QR code: your logo, investor pages and the follow button." },
    { done: false, href: "/business/admin/cards", title: "Put your QR code where shareholders already look",
      text: "Results slides, the annual report, the AGM notice, your website and roadshow decks. Download it from Cards & QR." },
    { done: (insights?.sources.length ?? 0) > 0, href: "/business/admin/events", title: "Make a QR code for your AGM or a roadshow",
      text: "Each event gets its own code, with optional time slots for a day of visits. You see who registered, and the people who shared their details by name." },
    { done: s.cards.length > 1, href: "/business/admin/employees", title: "Add the people who speak for the company",
      text: "The chair, CEO, CFO and IR contact each get their own card and QR code, so a meeting ends with a follow and a direct contact." },
    { done: !!s.latestNews, href: "/business/admin/news", title: "Post a headline after your next RNS",
      text: "A one-line headline and a link to the announcement. Followers are notified. Post only after the RNS is public." },
    { done: s.shared > 0, href: "/business/admin/followers", title: "See who chose to share their details",
      text: "Followers can choose to share their name and email. They appear on the Followers tab, with a CSV download." },
  ];
  const doneCount = steps.filter((x) => x.done).length;
  const totals = insights?.totals;
  const latest = insights?.announcements[0] ?? null;
  const unknownSent = latest ? latest.opens > latest.sent : false;
  const points = insights ? trimSeries(insights.series, "since").slice(-56) : [];
  const first = points[0]?.day ?? "";
  const marks: EventMark[] = (insights?.marks ?? []).filter((m) => m.day >= first);
  const notes: EventMark[] = (insights?.announcements ?? []).map((a) => ({ day: ymd(a.postedAt), label: a.text.length > 60 ? a.text.slice(0, 57) + "..." : a.text })).filter((m) => m.day >= first);
  const card = "rounded-2xl bg-charcoal p-6 ring-1 ring-white/10";
  const row = "flex items-baseline justify-between gap-4 border-b border-slate/50 py-2 text-cloud last:border-0";
  const figures: [string, number][] = [["Can be notified", s.canBeNotified], ["Card views", s.views], ["QR scans", s.qrViews]];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className={`${card} lg:col-span-1`}>
          <div className="text-6xl font-black text-gold">{s.following}</div>
          <div className="mt-1 text-lg text-cloud">Following</div>
          {totals && <div className="mt-2 text-sm text-cloud"><strong className="text-teal">+{totals.new7}</strong> in the last 7 days · <strong className="text-teal">+{totals.new30}</strong> in the last 30 days</div>}
        </div>
        <div className={`${card} lg:col-span-2`}>
          <h2 className="text-lg font-bold text-cloud">Key figures</h2>
          <dl className="mt-2">
            {figures.slice(0, 1).map(([l, n]) => <div key={l} className={row}><dt>{l}</dt><dd className="font-bold tabular-nums">{n}</dd></div>)}
            <div className={row}><dt>Shared their details{s.following > 0 ? ` (${Math.round((s.shared / s.following) * 100)}% of followers)` : ""}</dt><dd className="font-bold tabular-nums">{s.shared}</dd></div>
            {figures.slice(1).map(([l, n]) => <div key={l} className={row}><dt>{l}</dt><dd className="font-bold tabular-nums">{n}</dd></div>)}
          </dl>
        </div>
      </div>

      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-cloud">Latest headline</h2>
          <a href="/business/admin/news" className="btn-gold rounded-xl px-4 py-2 font-semibold">Post a headline</a>
        </div>
        {s.latestNews ? (
          <div className="mt-3 text-cloud">
            <span className="block text-lg">{s.latestNews.text}</span>
            <span className="mt-1 block text-sm">{s.latestNews.card} · {when(s.latestNews.at)}</span>
            {latest && (
              <span className="mt-2 block text-sm">
                {unknownSent ? <><strong className="tabular-nums">{latest.opens}</strong> tapped through to the release.</> : <>Sent to <strong className="tabular-nums">{latest.sent}</strong> {latest.sent === 1 ? "follower" : "followers"} · <strong className="tabular-nums">{latest.opens}</strong> tapped through to the release.</>}
                {" "}<a href="/business/admin/insights" className="text-gold underline">See every announcement</a>
              </span>
            )}
          </div>
        ) : (
          <p className="mt-3 text-cloud">Nothing posted yet. When {orgName} makes an announcement, post the headline here and followers get it on their phone.</p>
        )}
      </div>

      {insights && points.length > 0 && (insights.totals.following > 0 || insights.series.some((p) => p.joined || p.left)) && (
        <div className={card}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-cloud">Following over time</h2>
            <a href="/business/admin/insights" className="text-gold underline">More in Insights</a>
          </div>
          <p className="mt-1 text-sm text-cloud">Yellow dots are events and teal diamonds are announcements you sent.</p>
          <div className="mt-3"><LineChart title="People following, per day" points={points} marks={marks} notes={notes} series={[{ name: "Following", color: "#FFFFFF", pick: (p) => p.total }]} /></div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={card}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-cloud">Recently shared their details</h2>
            <a href="/business/admin/followers" className="text-gold underline">All followers</a>
          </div>
          {people.length === 0 ? (
            <p className="mt-3 text-cloud">Nobody yet. A follower chooses &ldquo;Follow and share my details&rdquo; to appear here.</p>
          ) : (
            <ul className="mt-2">
              {people.slice(0, 5).map((p) => (
                <li key={p.email + p.consentedAt} className="border-b border-slate/50 py-2 text-cloud last:border-0">
                  <span className="font-semibold">{p.name}</span> <span className="text-sm">· {short(p.consentedAt)}</span>
                  <span className="block text-sm">{p.event ? `Through ${p.event}` : p.followedThrough}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={card}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-cloud">Events</h2>
            <a href="/business/admin/events" className="text-gold underline">All events</a>
          </div>
          {!insights || insights.sources.length === 0 ? (
            <p className="mt-3 text-cloud">No events yet. Make a QR code for your next AGM or roadshow.</p>
          ) : (
            <ul className="mt-2">
              {insights.sources.slice(0, 4).map((e) => (
                <li key={e.code} className="flex items-baseline justify-between gap-3 border-b border-slate/50 py-2 text-cloud last:border-0">
                  <span><span className="font-semibold">{e.label}</span> <span className="text-sm">· {e.when}</span></span>
                  <span className="whitespace-nowrap text-sm"><strong className="tabular-nums">{e.followers}</strong> registered · <strong className="tabular-nums">{e.shared}</strong> shared</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <details className={card} open={doneCount < 4}>
        <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 text-lg font-bold text-cloud">
          <span>Getting started</span><span className="text-sm font-semibold text-cloud">{doneCount} of {steps.length} done</span>
        </summary>
        <ol className="mt-3 space-y-3 text-cloud">
          {steps.map((st, i) => (
            <li key={i} className="flex gap-3">
              <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold ${st.done ? "bg-teal text-black" : "bg-slate text-cloud"}`}>{st.done ? "✓" : i + 1}</span>
              <span>
                <a href={st.href} className="font-semibold text-gold underline">{st.title}</a>
                <span className="block text-sm text-cloud">{st.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
