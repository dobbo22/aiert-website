import { listedSummary, type ListedSummary } from "@/lib/tapcardListedAdmin";
import { listEvents } from "@/lib/tapcardEvents";
import { listSharedFollowers, type SharedFollower } from "@/lib/tapcardShare";

type EventItem = Awaited<ReturnType<typeof listEvents>>[number];

export default async function ListedOverview({ orgId, orgName }: { orgId: string; orgName: string }) {
  const [s, events, people] = await Promise.all([
    listedSummary(orgId),
    listEvents(orgId).catch(() => [] as EventItem[]),
    listSharedFollowers(orgId).catch(() => [] as SharedFollower[]),
  ]);
  return <ListedOverviewView s={s} orgName={orgName} events={events} people={people} now={Date.now()} />;
}

const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
const short = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" });

export function ListedOverviewView({ s, orgName, events = [], people = [], now }: { s: ListedSummary; orgName: string; events?: EventItem[]; people?: SharedFollower[]; now: number }) {
  const steps: { done: boolean; href: string; title: string; text: string }[] = [
    { done: !!s.primaryCardId, href: s.primaryCardId ? `/c/${s.primaryCardId}?preview=1` : "/business/admin/cards", title: "Check your company card",
      text: "This is what a shareholder sees when they scan your QR code: your logo, investor pages and the follow button." },
    { done: false, href: "/business/admin/cards", title: "Put your QR code where shareholders already look",
      text: "Results slides, the annual report, the AGM notice, your website and roadshow decks. Download it from Cards & QR." },
    { done: events.length > 0, href: "/business/admin/cards?tab=events", title: "Make a QR code for your AGM or a roadshow",
      text: "Each event gets its own code, with optional time slots for a day of visits. You see who registered, and the people who shared their details by name." },
    { done: s.cards.length > 1, href: "/business/admin/cards?tab=team", title: "Add the people who speak for the company",
      text: "The chair, CEO, CFO and IR contact each get their own card and QR code, so a meeting ends with a follow and a direct contact." },
    { done: !!s.latestNews, href: "/business/admin/news", title: "Post a headline after your next RNS",
      text: "A one-line headline and a link to the announcement. Followers are notified. Never post an RNS before it is public." },
    { done: s.shared > 0, href: "/business/admin/followers", title: "See who chose to share their details",
      text: "Followers can choose to share their name and email. They appear on the Followers tab, with a CSV download." },
  ];
  const doneCount = steps.filter((x) => x.done).length;
  const state = (e: EventItem) => (!e.startsAt || !e.endsAt ? "" : now < new Date(e.startsAt).getTime() ? "Not started" : now < new Date(e.endsAt).getTime() ? "Running now" : "Ended");
  const card = "rounded-2xl bg-charcoal p-6 ring-1 ring-white/10";
  const row = "flex items-baseline justify-between gap-4 border-b border-slate/50 py-2 text-cloud last:border-0";
  const figures: [string, number][] = [["Can be notified", s.canBeNotified], ["Card views", s.views], ["QR scans", s.qrViews]];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className={`${card} lg:col-span-1`}>
          <div className="text-6xl font-black text-gold">{s.following}</div>
          <div className="mt-1 text-lg text-cloud">Following</div>
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
          </div>
        ) : (
          <p className="mt-3 text-cloud">Nothing posted yet. When {orgName} makes an announcement, post the headline here and followers get it on their phone.</p>
        )}
      </div>

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
            <a href="/business/admin/cards?tab=events" className="text-gold underline">All events</a>
          </div>
          {events.length === 0 ? (
            <p className="mt-3 text-cloud">No events yet. Make a QR code for your next AGM or roadshow.</p>
          ) : (
            <ul className="mt-2">
              {events.slice(0, 4).map((e) => (
                <li key={e.code} className="flex items-baseline justify-between gap-3 border-b border-slate/50 py-2 text-cloud last:border-0">
                  <span className="font-semibold">{e.label}</span>
                  <span className="whitespace-nowrap text-sm">{state(e) || (e.startsAt ? "" : "Any time")}{e.startsAt ? ` · ${short(e.startsAt)}` : ""}</span>
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
