import { listedSummary, type ListedSummary } from "@/lib/tapcardListedAdmin";
import { listEvents } from "@/lib/tapcardEvents";
import { listSharedFollowers, type SharedFollower } from "@/lib/tapcardShare";
import { isDemoOrg } from "@/lib/tapcardDemoSim";
import DemoPanel from "./DemoPanel";
import { nowMs } from "@/lib/clock";
import { approvalRequired, pendingDrafts, seniorAdmins } from "@/lib/tapcardNewsPolicy";
import { linksForOrg } from "@/lib/tapcardAdvisers";
import { adviserSummary, coverInfoForOrg } from "@/lib/tapcardAdviserBilling";
import { getFeedConfig } from "@/lib/tapcardIrFeed";
import { getPrivacyUrl } from "@/lib/tapcardShare";
import { attentionItems, nextStep, setupSteps, type AttentionItem, type SetupStep } from "@/lib/tapcardOverviewTasks";

type EventItem = Awaited<ReturnType<typeof listEvents>>[number];

export default async function ListedOverview({ orgId, orgName, viewer }: { orgId: string; orgName: string; viewer: { email: string; senior: boolean } }) {
  const [s, events, people] = await Promise.all([
    listedSummary(orgId),
    listEvents(orgId).catch(() => [] as EventItem[]),
    listSharedFollowers(orgId).catch(() => [] as SharedFollower[]),
  ]);
  const demo = await isDemoOrg(orgId);
  // What needs this person's attention and the next set-up step (lib/tapcardOverviewTasks.ts). Anything that fails to load is simply left out.
  const [drafts, links, seniors, approvalOn, cfg, privacy, cover] = await Promise.all([
    pendingDrafts(orgId).catch(() => []), linksForOrg(orgId).catch(() => []), seniorAdmins(orgId).catch(() => []), approvalRequired(orgId).catch(() => false),
    s.primaryCardId ? getFeedConfig(s.primaryCardId).catch(() => null) : Promise.resolve(null), s.primaryCardId ? getPrivacyUrl(s.primaryCardId).catch(() => "") : Promise.resolve(""),
    coverInfoForOrg(orgId).catch(() => []),
  ]);
  let paymentProblem: string | null = null;
  for (const l of links.filter((x) => x.status === "approved" && (x.coverStatus === "active" || x.coverStatus === "ending"))) {
    const a = await adviserSummary(l.adviserId).catch(() => null);
    if (a && (a.adviser.billingStatus === "past_due" || a.adviser.billingStatus === "canceled")) paymentProblem = l.adviserName;
  }
  const input = {
    viewer, waitingDrafts: drafts, adviserRequests: links.filter((l) => l.status === "pending").length, seniorCount: seniors.filter((a) => a.senior).length, adminCount: seniors.length,
    approvalOn, announcementsPageSet: !!cfg, privacyUrlSet: !!privacy, teamCards: Math.max(0, s.cards.length - 1), events: events.length, hasPosted: !!s.latestNews, shared: s.shared,
    adviserCover: cover.map((c) => ({ adviserName: c.adviserName, ending: c.ending, until: c.until })), adviserPaymentProblem: paymentProblem,
  };
  const steps = setupSteps(input, s.primaryCardId);
  return (
    <>
      {demo && <DemoPanel />}
      <ListedOverviewView s={s} orgName={orgName} events={events} people={people} now={nowMs()} attention={attentionItems(input)} steps={steps} next={nextStep(steps, viewer.senior)} viewerSenior={viewer.senior} />
    </>
  );
}

const LEVEL: Record<AttentionItem["level"], string> = { action: "bg-gold/15 ring-gold/50", warning: "bg-red-500/15 ring-red-400/50", info: "bg-white/[0.06] ring-white/15" };

const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
const short = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" });

export function ListedOverviewView({ s, orgName, events = [], people = [], now, attention = [], steps: stepsIn, next = null, viewerSenior = true }: { s: ListedSummary; orgName: string; events?: EventItem[]; people?: SharedFollower[]; now: number; attention?: AttentionItem[]; steps?: SetupStep[]; next?: SetupStep | null; viewerSenior?: boolean }) {
  const steps = stepsIn ?? [];
  const doneCount = steps.filter((x) => x.done).length;
  const state = (e: EventItem) => (!e.startsAt || !e.endsAt ? "" : now < new Date(e.startsAt).getTime() ? "Not started" : now < new Date(e.endsAt).getTime() ? "Running now" : "Ended");
  const card = "rounded-2xl bg-charcoal p-6 ring-1 ring-white/10";
  const row = "flex items-baseline justify-between gap-4 border-b border-slate/50 py-2 text-cloud last:border-0";
  const figures: [string, number][] = [["Can be notified", s.canBeNotified], ["Card views", s.views], ["QR scans", s.qrViews]];

  return (
    <div className="space-y-6">
      {attention.length > 0 && (
        <div className="space-y-2" aria-label="Needs attention">
          {attention.map((a) => (
            <a key={a.id} href={a.href} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 text-cloud no-underline ring-1 ${LEVEL[a.level]}`}>
              <span className="min-w-0 flex-1 font-semibold">{a.text}</span>
              <span className="whitespace-nowrap rounded-lg bg-black/30 px-3 py-1 text-sm font-bold text-gold">{a.cta} →</span>
            </a>
          ))}
        </div>
      )}
      {next && (
        <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-gold/50">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal">Your next step</p>
          <h2 className="mt-1 text-lg font-bold text-cloud">{next.title}</h2>
          <p className="mt-1 text-cloud">{next.text}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <a href={next.href} className="btn-gold inline-block rounded-xl px-5 py-2 font-semibold">Go there</a>
            <a href="/business/admin/setup" className="inline-block rounded-xl px-5 py-2 font-semibold text-cloud ring-1 ring-slate">Open the guided setup</a>
          </div>
        </div>
      )}
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

      <details className={card} open={doneCount < steps.length - 2}>
        <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 text-lg font-bold text-cloud">
          <span>Getting started</span><span className="text-sm font-semibold text-cloud">{doneCount} of {steps.length} done</span>
        </summary>
        <ol className="mt-3 space-y-3 text-cloud">
          {steps.map((st, i) => (
            <li key={st.id} className="flex gap-3">
              <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold ${st.done ? "bg-teal text-black" : "bg-slate text-cloud"}`}>{st.done ? "✓" : i + 1}</span>
              <span>
                <a href={st.href} className="font-semibold text-gold underline">{st.title}</a>{st.optional ? <span className="text-sm"> (optional)</span> : null}
                <span className="block text-sm text-cloud">{st.text}</span>
                {st.seniorOnly && !viewerSenior && !st.done && <span className="block text-sm text-gold">Ask a senior admin: only they can do this.</span>}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-cloud">Prefer to be asked the questions? <a href="/business/admin/setup" className="text-gold underline">Open the guided setup</a>. Need more detail? The <a href="/business/investor-guide/setup" className="text-gold underline">setup guide</a> explains each step, and the <a href="/business/investor-guide" className="text-gold underline">manual</a> opens on your role.</p>
      </details>
    </div>
  );
}
