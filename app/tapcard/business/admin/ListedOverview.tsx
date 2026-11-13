import { listedSummary, type ListedSummary } from "@/lib/tapcardListedAdmin";

export default async function ListedOverview({ orgId, orgName }: { orgId: string; orgName: string }) {
  return <ListedOverviewView s={await listedSummary(orgId)} orgName={orgName} />;
}

export function ListedOverviewView({ s, orgName }: { s: ListedSummary; orgName: string }) {
  const stat = (n: number, label: string) => (
    <div className="rounded-2xl bg-charcoal px-4 py-4 ring-1 ring-white/10">
      <div className="text-3xl font-black text-gold">{n}</div>
      <div className="mt-1 text-sm text-cloud">{label}</div>
    </div>
  );
  const steps: { done: boolean; href: string; title: string; text: string }[] = [
    { done: !!s.primaryCardId, href: s.primaryCardId ? `/c/${s.primaryCardId}?preview=1` : "/business/admin/cards", title: "Check your company card",
      text: "This is what a shareholder sees when they scan your QR code: your logo, investor pages and the follow button." },
    { done: false, href: "/business/admin/cards", title: "Put your QR code where shareholders already look",
      text: "Results slides, the annual report, the AGM notice, your website and roadshow decks. Download it from Cards & QR." },
    { done: s.cards.length > 1, href: "/business/admin/employees", title: "Add the people who speak for the company",
      text: "The chair, CEO, CFO and IR contact each get their own card and QR code, so a meeting ends with a follow and a direct contact." },
    { done: !!s.latestNews, href: "/business/admin/news", title: "Post a headline after your next RNS",
      text: "A one-line headline and a link to the announcement. Followers are notified. Post only after the RNS is public." },
    { done: s.shared > 0, href: "/business/admin/followers", title: "See who chose to share their details",
      text: "Followers can choose to share their name and email. They appear on the Followers tab, with a CSV download." },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stat(s.following, "Following")}
        {stat(s.canBeNotified, "Can be notified")}
        {stat(s.shared, "Shared their details")}
        {stat(s.views, "Card views")}
        {stat(s.qrViews, "QR scans")}
      </div>

      <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-cloud">Latest headline</h2>
          <a href="/business/admin/news" className="btn-gold rounded-xl px-4 py-2 font-semibold">Post a headline</a>
        </div>
        {s.latestNews ? (
          <p className="mt-3 text-cloud">
            <span className="block text-lg">{s.latestNews.text}</span>
            <span className="mt-1 block text-sm">{s.latestNews.card} · {new Date(s.latestNews.at).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" })}</span>
          </p>
        ) : (
          <p className="mt-3 text-cloud">Nothing posted yet. When {orgName} makes an announcement, post the headline here and followers get it on their phone.</p>
        )}
      </div>

      <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
        <h2 className="text-lg font-bold text-cloud">Getting started</h2>
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
      </div>
    </div>
  );
}
