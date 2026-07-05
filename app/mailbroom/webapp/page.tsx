import type { Metadata } from "next";
import mailbroomSql from "@/lib/mailbroomDb";

// Refresh the aggregate impact stat at most once an hour rather than
// querying the DB on every page load.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "MailBroom for Business – Inbox Cleanup for Microsoft 365 | AIERT Ltd",
  description:
    "MailBroom for Business brings Smart Sweep, Storage Cleanup, and Power Search to Microsoft 365 and Exchange Online — right in the browser, no install needed. Licensed per company, not per person: once IT subscribes, every employee on that domain gets access automatically.",
  keywords: ["MailBroom", "MailBroom for Business", "email cleaner", "Microsoft 365", "Exchange Online", "IT admin", "inbox cleanup", "Graph API", "enterprise email"],
  metadataBase: new URL("https://aiert.co.uk"),
  openGraph: {
    title: "MailBroom for Business – Inbox Cleanup for Microsoft 365",
    description: "Smart Sweep, Storage Cleanup, and Power Search for Microsoft 365 — no install, licensed per company domain.",
    url: "https://aiert.co.uk/mailbroom/webapp",
    siteName: "AIERT Ltd",
    locale: "en_GB",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MailBroom for Business – Inbox Cleanup for Microsoft 365",
    description: "Smart Sweep, Storage Cleanup, and Power Search for Microsoft 365 — no install, licensed per company domain.",
  },
};

const bands = [
  { seats: "1–5 seats", price: "£25", period: "/mo" },
  { seats: "6–10 seats", price: "£45", period: "/mo" },
  { seats: "11–25 seats", price: "£105", period: "/mo" },
  { seats: "26–50 seats", price: "£200", period: "/mo" },
  { seats: "51–100 seats", price: "£350", period: "/mo" },
];

// Pure aggregate across all web-app users — no per-org or per-user
// attribution ever leaves the database. Same cross-database read pattern
// already used in app/admin/mailbroom/page.tsx to check reviewer signups.
async function getImpactStats() {
  try {
    const [{ total_bytes }] = (await mailbroomSql`
      SELECT COALESCE(SUM(bytes), 0) AS total_bytes
      FROM "UsageEvent"
      WHERE action IN ('sweep_delete', 'sweep_unsubscribe')
    `) as { total_bytes: string }[];
    const bytes = Number(total_bytes);
    const gb = bytes / 1_000_000_000;
    const co2Kg = gb * 0.233;
    return { gb, co2Kg };
  } catch {
    return null;
  }
}

export default async function MailBroomWebAppPage() {
  const impact = await getImpactStats();
  return (
    <div className="min-h-screen hero-gradient grid-bg">

      {/* ── NAV ─────────────────────────────────────────── */}
      <nav className="nav-glass sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between">
          <a href="/" className="flex items-center gap-4">
            <div className="nav-logo-icon w-11 h-11 rounded-lg flex items-center justify-center font-black text-base">
              AI
            </div>
            <span className="font-bold text-2xl tracking-tight text-cloud">
              AIERT<span className="text-sm font-normal ml-1 text-mist">Ltd</span>
            </span>
          </a>
          <div className="hidden md:flex items-center gap-10 text-base text-mist">
            <a href="/mailbroom/webapp/roi" className="hover:text-white transition-colors font-medium">Business Case</a>
            <a href="#pricing" className="hover:text-white transition-colors font-medium">Pricing</a>
            <a href="/mailbroom/leaderboard" className="hover:text-white transition-colors font-medium">Leaderboard</a>
            <a href="#faq" className="hover:text-white transition-colors font-medium">FAQ</a>
            <a href="/#contact" className="hover:text-white transition-colors font-medium">Contact</a>
          </div>
          <a
            href="/mailbroom/webapp/trial"
            className="btn-gold px-6 py-3 rounded-full text-base hidden md:block"
          >
            Start a Trial
          </a>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="badge-live inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-gold animate-pulse inline-block" />
              Web App · For Microsoft 365 &amp; Exchange Online
            </div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-tight mb-6">
              <span className="text-cloud">Inbox cleanup</span>
              <br />
              <span className="gold-text">for the whole company.</span>
            </h1>
            <p className="text-lg text-mist leading-relaxed mb-8 max-w-lg">
              MailBroom for Business brings Smart Sweep, Storage Cleanup, and Power Search
              to Microsoft 365 and Exchange Online — right in the browser, no install, no
              per-user App Store purchase. IT signs in once, subscribes, and every employee
              on the company domain gets access automatically.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="https://app.mailbroom.app"
                className="btn-gold px-8 py-4 rounded-full text-base inline-flex items-center gap-2 justify-center"
              >
                <span>🏢</span> Sign in with Microsoft
              </a>
              <a href="#pricing" className="btn-outline px-8 py-4 rounded-full text-base inline-block text-center">
                See Pricing
              </a>
            </div>

            <div className="flex gap-8 mt-10">
              {[
                { value: "No install", label: "Runs in the browser" },
                { value: "Per company", label: "One licence, whole domain" },
                { value: "Entra ID", label: "Microsoft SSO sign-in" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-2xl font-black gold-text">{s.value}</div>
                  <div className="text-xs text-mist">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute -inset-10 rounded-full blur-3xl opacity-20 bg-gold" />
              <div className="card-glass rounded-3xl p-10 max-w-sm w-full">
                <div className="text-cloud font-bold text-sm mb-5">Your organisation</div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-mist">Domain</span>
                    <span className="text-cloud font-semibold">yourcompany.com</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-mist">Plan</span>
                    <span className="text-gold font-semibold">11–25 seats</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-mist">Seats used</span>
                    <span className="text-cloud font-semibold">14 / 25</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2 mt-2">
                    <div className="bg-gold h-2 rounded-full" style={{ width: "56%" }} />
                  </div>
                  <p className="text-xs text-mist pt-3 border-t border-white/10 mt-4">
                    Any teammate signing in with an @yourcompany.com Microsoft account joins automatically — no invites to send.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PROBLEM ─────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-gold">The problem</p>
          <h2 className="text-4xl font-black text-cloud">Three things your inbox is quietly costing you</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: "💰",
              title: "Storage costs are rising",
              desc: "Microsoft charges by the gigabyte once a mailbox outgrows its plan — and archive storage past 1.5 TB is billed the same way. Every year of unswept newsletters and old attachments is a recurring line item, not a one-off.",
              href: "/mailbroom/webapp/storage-costs",
              linkLabel: "See the real cost of email storage",
            },
            {
              icon: "🎫",
              title: "IT time goes to quota tickets",
              desc: "\"My mailbox is full\" is one of the most common helpdesk tickets in any Microsoft 365 estate — and the fix is almost always the same manual cleanup, repeated per employee, every few months.",
              href: "/mailbroom/webapp/roi",
              linkLabel: "See the ROI case",
            },
            {
              icon: "🛡️",
              title: "Compliance can't be an afterthought",
              desc: "Whatever tool clears out a mailbox has to respect the holds and retention policies already in place — not work around them. That has to be true by design, not by policy memo.",
              href: "/mailbroom/webapp/roi#compliance",
              linkLabel: "Read how holds are respected",
            },
          ].map((item) => (
            <div key={item.title} className="card-glass rounded-2xl p-8 flex flex-col">
              <div className="text-3xl mb-4">{item.icon}</div>
              <h3 className="text-lg font-bold text-cloud mb-3">{item.title}</h3>
              <p className="text-sm text-mist leading-relaxed mb-5 flex-1">{item.desc}</p>
              <a href={item.href} className="text-sm text-gold font-semibold hover:underline">
                {item.linkLabel} →
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────── */}
      <section className="section-dark py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-teal">How It Works</p>
            <h2 className="text-4xl font-black text-cloud">Licensed per company, not per person</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: "🏢",
                title: "IT subscribes once",
                desc: "An admin signs in with a Microsoft work account and picks a plan sized to the company. No per-seat invites to send, no App Store purchases to manage.",
              },
              {
                step: "02",
                icon: "🔑",
                title: "Employees just sign in",
                desc: "Anyone signing in with an email on that company's domain gets access automatically, via Microsoft Entra ID single sign-on — the same login they already use for Microsoft 365.",
              },
              {
                step: "03",
                icon: "🧹",
                title: "Clean up with Graph API",
                desc: "MailBroom connects to Microsoft Graph — the same official API Outlook itself uses — to scan, sweep, and organise. No IMAP passwords, no third-party mail servers.",
              },
            ].map((item) => (
              <div key={item.step} className="card-glass rounded-2xl p-8">
                <div className="text-xs font-black text-gold mb-4 tracking-widest">{item.step}</div>
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-lg font-bold text-cloud mb-3">{item.title}</h3>
                <p className="text-sm text-mist leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────── */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-24 space-y-24">

        {/* Smart Sweep */}
        <div className="grid md:grid-cols-2 gap-14 items-center">
          <div>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-2xl mb-6 bg-cyan-500/10 text-cyan-400">
              🔍
            </div>
            <h2 className="text-3xl font-black text-cloud mb-4">Smart Sweep</h2>
            <p className="text-mist leading-relaxed mb-6">
              Ranks senders by volume and lets employees bulk-delete, unsubscribe, or keep
              newsletters and notifications in a few clicks — the same guided workflow as the
              MailBroom iOS app, now running against a full Microsoft 365 mailbox from any browser.
            </p>
            <ul className="space-y-3">
              {[
                "Senders grouped and ranked by email volume",
                "One-click delete, unsubscribe, or keep per sender",
                "Live progress bar while the mailbox is scanned",
                "Works on mailboxes with tens of thousands of emails",
              ].map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm text-mist">
                  <span className="mt-0.5 flex-shrink-0 text-cyan-400">✓</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute -inset-10 rounded-full blur-3xl opacity-20 bg-cyan-500" />
              <div className="card-glass rounded-3xl p-8 max-w-sm w-full text-center">
                <div className="text-5xl mb-4">🔍</div>
                <div className="text-cloud font-bold">1,240 emails ready to sweep</div>
                <div className="text-mist text-sm mt-1">across 38 senders</div>
              </div>
            </div>
          </div>
        </div>

        {/* Storage Cleanup */}
        <div className="grid md:grid-cols-2 gap-14 items-center">
          <div className="md:order-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-2xl mb-6 bg-orange-500/10 text-orange-400">
              💾
            </div>
            <h2 className="text-3xl font-black text-cloud mb-4">Storage Cleanup</h2>
            <p className="text-mist leading-relaxed mb-6">
              Free up mailbox space by clearing old, large emails in bulk — grouped by sender,
              age, or domain — so employees stop hitting Exchange Online storage limits.
            </p>
            <ul className="space-y-3">
              {[
                "Browse by age bracket or by sender domain",
                "See exactly how much storage each sender uses",
                "Bulk delete, unsubscribe, or keep per sender or domain",
                "Fast bulk actions via Microsoft Graph batch requests",
              ].map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm text-mist">
                  <span className="mt-0.5 flex-shrink-0 text-orange-400">✓</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-center md:order-1">
            <div className="relative">
              <div className="absolute -inset-10 rounded-full blur-3xl opacity-20 bg-orange-500" />
              <div className="card-glass rounded-3xl p-8 max-w-sm w-full text-center">
                <div className="text-5xl mb-4">💾</div>
                <div className="text-cloud font-bold">4.2 GB reclaimable</div>
                <div className="text-mist text-sm mt-1">from emails older than 3 years</div>
              </div>
            </div>
          </div>
        </div>

        {/* Power Search */}
        <div className="grid md:grid-cols-2 gap-14 items-center">
          <div>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-2xl mb-6 bg-purple-500/10 text-purple-400">
              🔎
            </div>
            <h2 className="text-3xl font-black text-cloud mb-4">Power Search</h2>
            <p className="text-mist leading-relaxed mb-6">
              Search the whole mailbox by sender, keyword, date range, or folder, then bulk-act
              on the results — useful for offboarding, compliance sweeps, or clearing out a
              specific project&apos;s emails after it wraps up.
            </p>
            <ul className="space-y-3">
              {[
                "Search across every folder, not just the inbox",
                "Filter by sender, keyword, date range, or read status",
                "Bulk-select results and delete, move, or unsubscribe",
                "See match counts before committing to an action",
              ].map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm text-mist">
                  <span className="mt-0.5 flex-shrink-0 text-purple-400">✓</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute -inset-10 rounded-full blur-3xl opacity-20 bg-purple-500" />
              <div className="card-glass rounded-3xl p-8 max-w-sm w-full text-center">
                <div className="text-5xl mb-4">🔎</div>
                <div className="text-cloud font-bold">849 matches</div>
                <div className="text-mist text-sm mt-1">across every folder</div>
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* ── SECURITY / TRUST ───────────────────────────── */}
      <section className="section-dark py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="card-teal-accent rounded-3xl p-10 md:p-14 glow-teal text-center max-w-3xl mx-auto">
            <div className="text-5xl mb-6">🔐</div>
            <h2 className="text-3xl font-black text-cloud mb-4">Nothing to install. Nothing to trust blindly.</h2>
            <p className="text-mist leading-relaxed mb-6 text-lg">
              MailBroom for Business is a hosted web app — there&apos;s no plugin, no browser
              extension, no server for IT to stand up or maintain. Employees just open a browser
              and click <strong className="text-cloud">Sign in with Microsoft</strong>, using the exact same
              Entra ID login they already use for Outlook and Teams.
            </p>
            <p className="text-mist leading-relaxed mb-8 text-lg">
              Because it runs on Microsoft&apos;s own sign-in and the official Graph API, MailBroom
              never sees or stores a password — it only ever receives a scoped, revocable access
              token. If your tenant requires it, an Azure AD admin approves the app <strong className="text-cloud">once</strong>,
              the same way you&apos;d approve any other verified Microsoft 365 add-on — after that,
              access follows your company domain automatically, with no per-person invite list for IT to run.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              {[
                { icon: "🌐", label: "100% browser-based — no install" },
                { icon: "🔑", label: "Microsoft Entra ID sign-in" },
                { icon: "📧", label: "Official Microsoft Graph API" },
                { icon: "🚫", label: "No passwords stored" },
                { icon: "✅", label: "One-time admin consent, if required" },
                { icon: "🏢", label: "Domain-scoped access" },
              ].map((item) => (
                <div key={item.label} className="stat-teal rounded-xl p-4">
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <div className="text-teal font-semibold text-xs">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          {impact && (impact.gb > 0 || impact.co2Kg > 0) && (
            <div className="text-center mt-14">
              <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-gold">Impact so far</p>
              <div className="flex flex-wrap justify-center gap-10">
                <div>
                  <div className="text-4xl font-black gold-text">{impact.gb.toFixed(1)} GB</div>
                  <div className="text-sm text-mist mt-1">of mailbox storage freed</div>
                </div>
                <div>
                  <div className="text-4xl font-black gold-text">{impact.co2Kg.toFixed(1)} kg</div>
                  <div className="text-sm text-mist mt-1">of CO₂ saved</div>
                </div>
              </div>
              <p className="text-xs text-mist mt-4">Across all MailBroom for Business customers</p>
            </div>
          )}
        </div>
      </section>

      {/* ── PRICING ────────────────────────────────────── */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-gold">Pricing</p>
          <h2 className="text-4xl font-black text-cloud">One licence. One domain. Everyone included.</h2>
          <p className="text-mist mt-4 max-w-2xl mx-auto leading-relaxed">
            Pick the band that fits your headcount — every employee on your company&apos;s email
            domain gets access, with no extra invite step. Upgrade any time as your team grows.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-8">
          {bands.map((band) => (
            <div key={band.seats} className="card-glass rounded-2xl p-6 text-center">
              <div className="text-cloud font-bold mb-2">{band.seats}</div>
              <div className="text-3xl font-black gold-text">{band.price}</div>
              <div className="text-mist text-xs">{band.period}</div>
            </div>
          ))}
          <div className="card-glass rounded-2xl p-6 text-center border-2 border-gold/25">
            <div className="text-cloud font-bold mb-2">101+ seats</div>
            <div className="text-xl font-black gold-text">Contact Sales</div>
            <div className="text-mist text-xs">Custom invoicing available</div>
          </div>
        </div>

        <div className="text-center">
          <a
            href="https://app.mailbroom.app"
            className="btn-gold px-8 py-4 rounded-full text-base inline-flex items-center gap-2"
          >
            <span>🏢</span> Start with a plan
          </a>
          <p className="mt-4 text-xs text-mist">
            Managed by Stripe · Cancel anytime · Upgrade or downgrade your plan whenever headcount changes
          </p>
        </div>
      </section>

      {/* ── COMPATIBILITY ──────────────────────────────── */}
      <section className="section-dark py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-teal">Compatibility</p>
            <h2 className="text-4xl font-black text-cloud">Who can use this</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[
              { icon: "📮", name: "Microsoft 365", note: "Business & Enterprise plans" },
              { icon: "☁️", name: "Exchange Online", note: "Mailbox must be cloud-hosted" },
              { icon: "🔑", name: "Entra ID SSO", note: "Sign in with your work account" },
            ].map((item) => (
              <div key={item.name} className="card-glass rounded-2xl p-5 text-center">
                <div className="text-3xl mb-3">{item.icon}</div>
                <div className="font-bold text-cloud text-sm mb-1">{item.name}</div>
                <div className="text-xs text-mist">{item.note}</div>
              </div>
            ))}
          </div>

          <div className="max-w-2xl mx-auto mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-left">
            <p className="text-sm font-semibold text-cloud mb-2">⚠️ Requires Exchange Online — not on-premises Exchange</p>
            <p className="text-sm text-mist leading-relaxed">
              MailBroom for Business connects entirely through Microsoft Graph, which only reaches
              mailboxes actually hosted in the Microsoft 365 cloud. If your mailbox still lives on an
              on-premises Exchange Server (2013, 2016, 2019, or older) and hasn&apos;t been migrated to
              Exchange Online, MailBroom can&apos;t connect to it — there&apos;s no on-prem or IMAP fallback
              on the web app. In a hybrid environment, this applies per mailbox: anyone already
              migrated to the cloud side is covered; anyone still on-prem isn&apos;t, until they move.
            </p>
          </div>

          <p className="text-center text-xs text-mist mt-8">
            Still on-prem, or on Gmail, iCloud, or another IMAP provider? Try{" "}
            <a href="/mailbroom" className="text-gold hover:underline">MailBroom for iOS</a> instead — it connects over IMAP to almost any mail server.
          </p>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────── */}
      <section id="faq" className="max-w-3xl mx-auto px-6 py-24">
        <h3 className="text-xl font-bold text-cloud mb-8 text-center">Frequently asked questions</h3>
        <div className="space-y-4">
          {[
            {
              q: "Does this work with our on-premises Exchange server?",
              a: "No. MailBroom for Business connects through Microsoft Graph, which only reaches mailboxes hosted in Exchange Online (the Microsoft 365 cloud) — not mailboxes still on an on-premises Exchange server. In a hybrid setup this applies per mailbox: anyone already migrated to the cloud side works fine, anyone still on-prem doesn't. If you're not on Exchange Online yet, MailBroom for iOS connects over IMAP to almost any mail server instead.",
            },
            {
              q: "Do we need to install anything on our website or network?",
              a: "No. MailBroom for Business is entirely hosted — there's nothing to install on your website, servers, or network, and no browser extension. Employees sign in at app.mailbroom.app with their existing Microsoft work account, the same way they'd sign in to any other Microsoft 365-connected web app.",
            },
            {
              q: "Do employees need to be invited individually?",
              a: "No. Once your company has an active plan, anyone signing in with a matching company email domain gets access automatically. There's nothing for IT to maintain per person.",
            },
            {
              q: "Who can manage billing and seats?",
              a: "Any account your organisation designates as an admin — you can have more than one, and admin access is reassignable at any time from the Billing page.",
            },
            {
              q: "What if we outgrow our current plan?",
              a: "An admin can move up a band at any time from the Billing page — the change takes effect immediately, prorated by Stripe. For 101+ seats, contact sales for custom pricing and invoicing.",
            },
            {
              q: "Does MailBroom store our passwords?",
              a: "No. Sign-in goes through Microsoft Entra ID — the same secure sign-in your company already uses for Microsoft 365. MailBroom only receives a Microsoft Graph access token, never a password.",
            },
            {
              q: "Can personal Gmail or Outlook.com accounts sign up for a company plan?",
              a: "No — company plans are scoped to a verified business email domain, so personal email providers can't accidentally join someone else's organisation.",
            },
          ].map((faq, i) => (
            <details key={i} className="card-glass rounded-xl p-6 group cursor-pointer">
              <summary className="font-semibold text-cloud text-sm flex items-center justify-between">
                {faq.q}
                <span className="text-gold group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="text-mist text-sm mt-3">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <h2 className="text-4xl md:text-5xl font-black text-cloud mb-6">
          Ready to clean up<br />
          <span className="gold-text">your company&apos;s inboxes?</span>
        </h2>
        <p className="text-lg text-mist mb-10 max-w-xl mx-auto">
          Start with a free 30-day IT assessment — no card, no commitment — or sign in directly if your company already has a plan.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/mailbroom/webapp/trial"
            className="btn-gold px-10 py-5 rounded-full text-lg inline-flex items-center gap-3 justify-center"
          >
            <span>🧪</span> Start Your Free IT Assessment
          </a>
          <a
            href="https://app.mailbroom.app"
            className="btn-outline px-10 py-5 rounded-full text-lg inline-flex items-center gap-3 justify-center"
          >
            <span>🏢</span> Sign in with Microsoft
          </a>
        </div>
        <p className="mt-4 text-sm text-mist">Microsoft 365 &amp; Exchange Online · No install · Licensed per company domain</p>
      </section>

      {/* ── FOOTER ─────────────────────────────────────── */}
      <footer className="footer-wrap">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="nav-logo-icon w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs">
                AI
              </div>
              <div>
                <div className="font-bold text-cloud">AIERT Ltd</div>
                <div className="text-xs text-mist">Registered in England &amp; Wales · No. 16253779</div>
              </div>
            </div>
            <div className="flex gap-6 text-sm text-mist flex-wrap justify-center">
              <a href="/mailbroom/webapp/roi" className="hover:text-white transition-colors">Business Case</a>
              <a href="/mailbroom/webapp/storage-costs" className="hover:text-white transition-colors">Storage Costs</a>
              <a href="/mailbroom/webapp/trial" className="hover:text-white transition-colors">Free IT Assessment</a>
              <a href="/mailbroom" className="hover:text-white transition-colors">MailBroom for iOS</a>
              <a href="/mailbroom/leaderboard" className="hover:text-white transition-colors">Leaderboard</a>
              <a href="/" className="hover:text-white transition-colors">AIERT Home</a>
              <a href="/#contact" className="hover:text-white transition-colors">Contact</a>
              <a href="/mailbroom/webapp/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="/mailbroom/webapp/terms" className="hover:text-white transition-colors">Terms of Use</a>
            </div>
          </div>
          <div className="footer-divider mt-8 pt-8 text-center text-xs text-mist">
            © {new Date().getFullYear()} AIERT Ltd. MailBroom is a product of AIERT Ltd.
          </div>
        </div>
      </footer>

    </div>
  );
}
