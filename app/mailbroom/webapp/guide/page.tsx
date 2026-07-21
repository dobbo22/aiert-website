import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "User Guide – MailBroom for Business | AIERT Ltd",
  description: "A complete reference guide to MailBroom for Business — sign-in, Dashboard, Smart Sweep, Storage Cleanup, Power Search, plans & billing, Admin, and privacy.",
  metadataBase: new URL("https://aiert.co.uk"),
  openGraph: {
    title: "MailBroom for Business — User Guide",
    description: "A complete reference guide to every feature.",
    url: "https://aiert.co.uk/mailbroom/webapp/guide",
    siteName: "AIERT Ltd",
    locale: "en_GB",
    type: "website",
  },
};

const techArticleJsonLd = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "MailBroom for Business — User Guide",
  description: "A complete reference guide to MailBroom for Business — sign-in, Dashboard, Smart Sweep, Storage Cleanup, Power Search, plans & billing, Admin, and privacy.",
  url: "https://aiert.co.uk/mailbroom/webapp/guide",
  publisher: { "@type": "Organization", name: "AIERT Ltd", url: "https://aiert.co.uk" },
};

const ACTIONS = [
  { letter: "D", label: "Delete", color: "#dc2626" },
  { letter: "U", label: "Unsubscribe", color: "#ea580c" },
  { letter: "K", label: "Keep", color: "#15803d" },
  { letter: "O", label: "Organise", color: "#7c3aed" },
];

const AGE_BRACKETS = [
  { name: "10+ Years", desc: "The oldest mail in the account — almost always safe to clear" },
  { name: "5–10 Years", desc: "Still very old, rarely needed" },
  { name: "3–5 Years", desc: "Worth a glance before clearing in bulk" },
  { name: "1–3 Years", desc: "Recent enough that individual review pays off" },
  { name: "Under 1 Year", desc: "Current — review carefully" },
];

const BANDS = [
  { seats: "1–5", price: "£25/mo" },
  { seats: "6–10", price: "£45/mo" },
  { seats: "11–25", price: "£105/mo" },
  { seats: "26–50", price: "£200/mo" },
  { seats: "51–100", price: "£350/mo" },
  { seats: "101+", price: "Contact sales" },
];

const TOC = [
  { href: "#start", label: "Getting started" },
  { href: "#dashboard", label: "Dashboard" },
  { href: "#sweep", label: "Smart Sweep" },
  { href: "#storage", label: "Storage Cleanup" },
  { href: "#search", label: "Power Search" },
  { href: "#billing", label: "Plans & billing" },
  { href: "#admin", label: "Admin" },
  { href: "#privacy", label: "Privacy & data" },
];

export default function MailBroomGuidePage() {
  return (
    <div className="min-h-screen hero-gradient grid-bg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(techArticleJsonLd) }}
      />

      {/* ── NAV ─────────────────────────────────────────── */}
      <nav className="nav-glass sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between">
          <a href="/mailbroom/webapp" className="flex items-center gap-4">
            <img src="/mailbroom-icon.png" alt="MailBroom" width={44} height={44} className="w-11 h-11 rounded-lg" />
            <span className="font-bold text-2xl tracking-tight text-cloud">
              MailBroom
            </span>
          </a>
          <div className="hidden md:flex items-center gap-10 text-base text-cloud">
            <a href="/mailbroom/webapp" className="hover:text-white transition-colors font-medium">MailBroom for Business</a>
            <a href="/mailbroom/webapp/support" className="hover:text-white transition-colors font-medium">Support</a>
          </div>
          <a
            href="https://app.mailbroom.app/sign-in"
            className="btn-gold px-6 py-3 rounded-full text-base hidden md:block"
          >
            Sign in
          </a>
        </div>
      </nav>

      {/* ── HEADER ──────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 pt-20 pb-12 text-center">
        <div className="badge-live inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium mb-6">
          <span className="w-2 h-2 rounded-full bg-gold animate-pulse inline-block" />
          Reference Guide
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-cloud mb-4">
          Everything MailBroom <span className="gold-text">for Business does.</span>
        </h1>
        <p className="text-cloud text-base leading-relaxed max-w-xl mx-auto">
          A complete walk-through of every feature, for anyone at your company using
          <span className="font-mono"> app.mailbroom.app</span>.
        </p>
      </section>

      {/* ── TABLE OF CONTENTS ─────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 pb-16">
        <div className="card-glass rounded-2xl p-6 flex flex-wrap gap-x-6 gap-y-3 justify-center">
          {TOC.map((t) => (
            <a key={t.href} href={t.href} className="text-sm font-semibold text-cloud hover:text-gold transition-colors">
              {t.label}
            </a>
          ))}
        </div>
      </section>

      {/* ── GETTING STARTED ───────────────────────────────── */}
      <section id="start" className="section-dark py-20 scroll-mt-20">
        <div className="max-w-3xl mx-auto px-6">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-teal">Getting started</p>
          <h2 className="text-3xl font-black text-cloud mb-4">Signing in</h2>
          <p className="text-cloud mb-8 max-w-2xl">
            MailBroom is licensed per company domain, not per person — there&apos;s nothing to invite.
          </p>
          <div className="space-y-4">
            <div className="card-glass rounded-2xl p-6">
              <h3 className="font-bold text-cloud mb-1">1. An admin picks a plan</h3>
              <p className="text-sm text-cloud">Sized to headcount, billed monthly via Stripe — see the plans table below.</p>
            </div>
            <div className="card-glass rounded-2xl p-6">
              <h3 className="font-bold text-cloud mb-1">2. Anyone signs in with Microsoft</h3>
              <p className="text-sm text-cloud">Using the same work account they already use for Outlook and Teams. Once your company&apos;s plan is active, anyone with a matching email domain joins automatically the first time they sign in.</p>
            </div>
            <div className="card-glass rounded-2xl p-6">
              <h3 className="font-bold text-cloud mb-1">3. MailBroom never sees your password</h3>
              <p className="text-sm text-cloud">Sign-in goes through Microsoft Entra ID directly. MailBroom only ever receives a scoped, revocable Graph access token — revoke it any time from your Microsoft admin settings.</p>
            </div>
          </div>
          <div className="mt-6 rounded-2xl border border-gold/20 bg-gold/5 p-5 text-sm text-cloud">
            <strong className="text-cloud">Personal accounts:</strong> free providers like Gmail or Outlook.com are excluded from domain auto-join, so a personal inbox can only ever be on the smallest (1–5 seat) plan under its own login — it can&apos;t inherit a company&apos;s licence.
          </div>
        </div>
      </section>

      {/* ── DASHBOARD ──────────────────────────────────────── */}
      <section id="dashboard" className="max-w-3xl mx-auto px-6 py-20 scroll-mt-20">
        <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-teal">Overview</p>
        <h2 className="text-3xl font-black text-cloud mb-4">Dashboard</h2>
        <p className="text-cloud mb-8 max-w-2xl">Your inbox at a glance, and the entry point to the three cleanup tools.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="card-glass rounded-2xl p-6">
            <h3 className="font-bold text-cloud mb-2">Current Inbox</h3>
            <p className="text-sm text-cloud">Total emails, storage used, and how many are ready to sweep from your last scan. Tap Re-scan any time — MailBroom also quietly checks for new mail in the background.</p>
          </div>
          <div className="card-glass rounded-2xl p-6">
            <h3 className="font-bold text-cloud mb-2">Your Impact</h3>
            <p className="text-sm text-cloud">Storage freed, emails deleted, unsubscribed, organised, time saved, a Potential Speed score, live Sync Status, and CO₂ saved with award tiers from Seedling up to Earth Hero — all real, lifetime totals tied to your account.</p>
          </div>
        </div>
      </section>

      {/* ── SMART SWEEP ────────────────────────────────────── */}
      <section id="sweep" className="section-dark py-20 scroll-mt-20">
        <div className="max-w-3xl mx-auto px-6">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-teal">Tool</p>
          <h2 className="text-3xl font-black text-cloud mb-4">Smart Sweep</h2>
          <p className="text-cloud mb-6 max-w-2xl">
            Bulk-clear newsletters, notifications, and anything else worth clearing — one sender at a time, or in bulk.
          </p>
          <div className="flex flex-wrap gap-3 mb-8">
            {ACTIONS.map((a) => (
              <div key={a.letter} className="flex items-center gap-2 card-glass rounded-full pl-2 pr-4 py-2">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white"
                  style={{ background: a.color }}
                >
                  {a.letter}
                </span>
                <span className="text-sm font-semibold text-cloud">{a.label}</span>
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="card-glass rounded-2xl p-6">
              <h3 className="font-bold text-cloud mb-1">Individual mode</h3>
              <p className="text-sm text-cloud">One sender at a time, largest first — swipe through and decide.</p>
            </div>
            <div className="card-glass rounded-2xl p-6">
              <h3 className="font-bold text-cloud mb-1">Bulk mode</h3>
              <p className="text-sm text-cloud">Select any number of senders and apply one action to all of them at once.</p>
            </div>
          </div>
          <div className="mt-6 rounded-2xl border border-gold/20 bg-gold/5 p-5 text-sm text-cloud">
            <strong className="text-cloud">Keep</strong> isn&apos;t all-or-nothing — choose to keep everything, just the most recent N emails, or everything since a chosen date, and MailBroom clears the rest.
          </div>
        </div>
      </section>

      {/* ── STORAGE CLEANUP ────────────────────────────────── */}
      <section id="storage" className="max-w-3xl mx-auto px-6 py-20 scroll-mt-20">
        <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-teal">Tool</p>
        <h2 className="text-3xl font-black text-cloud mb-4">Storage Cleanup</h2>
        <p className="text-cloud mb-6 max-w-2xl">Find what&apos;s actually taking up space — two ways to look at the same mailbox.</p>
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <div className="card-glass rounded-2xl p-6">
            <h3 className="font-bold text-cloud mb-1">By Age</h3>
            <p className="text-sm text-cloud">Senders bucketed by how old their emails are, with a High/Medium/Low confidence read on how safe each is to clear.</p>
          </div>
          <div className="card-glass rounded-2xl p-6">
            <h3 className="font-bold text-cloud mb-1">By Domain</h3>
            <p className="text-sm text-cloud">Senders grouped by company — with D/U/K/O actions at the domain level, so one click clears an entire domain&apos;s worth of senders at once.</p>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/5">
              <tr>
                <th className="text-left px-5 py-3 text-cloud font-semibold">Bracket</th>
                <th className="text-left px-5 py-3 text-cloud font-semibold">What it usually holds</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {AGE_BRACKETS.map((b) => (
                <tr key={b.name}>
                  <td className="px-5 py-3 text-cloud font-medium whitespace-nowrap">{b.name}</td>
                  <td className="px-5 py-3 text-cloud">{b.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── POWER SEARCH ───────────────────────────────────── */}
      <section id="search" className="section-dark py-20 scroll-mt-20">
        <div className="max-w-3xl mx-auto px-6">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-teal">Tool</p>
          <h2 className="text-3xl font-black text-cloud mb-4">Power Search</h2>
          <p className="text-cloud mb-6 max-w-2xl">Find a specific email fast, then act on the results in bulk.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="card-glass rounded-2xl p-6">
              <h3 className="font-bold text-cloud mb-1">Filters</h3>
              <p className="text-sm text-cloud">Sender, subject, keywords, has attachment, date range, read/unread, flagged — combine as many as needed.</p>
            </div>
            <div className="card-glass rounded-2xl p-6">
              <h3 className="font-bold text-cloud mb-1">Bulk actions on results</h3>
              <p className="text-sm text-cloud">Select matching emails across senders and delete or move them to a folder in one action.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PLANS & BILLING ────────────────────────────────── */}
      <section id="billing" className="max-w-3xl mx-auto px-6 py-20 scroll-mt-20">
        <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-teal">Plans</p>
        <h2 className="text-3xl font-black text-cloud mb-4">Plans &amp; billing</h2>
        <p className="text-cloud mb-6 max-w-2xl">One flat monthly fee per company domain, banded by seat count — not billed per person.</p>
        <div className="rounded-2xl border border-white/10 overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead className="bg-white/5">
              <tr>
                <th className="text-left px-5 py-3 text-cloud font-semibold">Seats</th>
                <th className="text-right px-5 py-3 text-cloud font-semibold">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {BANDS.map((b) => (
                <tr key={b.seats}>
                  <td className="px-5 py-3 text-cloud font-medium">{b.seats}</td>
                  <td className="px-5 py-3 text-cloud text-right">{b.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-2xl border border-gold/20 bg-gold/5 p-5 text-sm text-cloud">
          Prices auto-detect in GBP, USD, or EUR based on where you&apos;re signing in from. Billing, invoices, and plan changes are all managed via Stripe&apos;s own self-service portal, linked from the Admin page.
        </div>
      </section>

      {/* ── ADMIN & PRIVACY ────────────────────────────────── */}
      <section id="admin" className="section-dark py-20 scroll-mt-20">
        <div className="max-w-3xl mx-auto px-6">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-teal">For admins</p>
          <h2 className="text-3xl font-black text-cloud mb-4">Admin</h2>
          <p className="text-cloud mb-6 max-w-2xl">Visible only to your organisation&apos;s designated admins.</p>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="card-glass rounded-2xl p-6">
              <h3 className="font-bold text-cloud mb-1">Plan &amp; Billing</h3>
              <p className="text-sm text-cloud">Upgrade, downgrade, or manage payment via Stripe.</p>
            </div>
            <div className="card-glass rounded-2xl p-6">
              <h3 className="font-bold text-cloud mb-1">Members</h3>
              <p className="text-sm text-cloud">See your team, grant or revoke admin role.</p>
            </div>
            <div className="card-glass rounded-2xl p-6">
              <h3 className="font-bold text-cloud mb-1">Company Profile</h3>
              <p className="text-sm text-cloud">Set a display name and opt in to the public leaderboard.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="privacy" className="max-w-3xl mx-auto px-6 py-20 scroll-mt-20">
        <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-teal">Data</p>
        <h2 className="text-3xl font-black text-cloud mb-4">Privacy &amp; data</h2>
        <p className="text-cloud mb-6 max-w-2xl">What&apos;s stored, and — just as importantly — what isn&apos;t.</p>
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <div className="card-glass rounded-2xl p-6">
            <h3 className="font-bold text-cloud mb-1">Stored</h3>
            <p className="text-sm text-cloud">Your email and name, your company&apos;s licence status, and aggregate usage counters (emails cleaned, storage freed, CO₂ saved).</p>
          </div>
          <div className="card-glass rounded-2xl p-6">
            <h3 className="font-bold text-cloud mb-1">Never stored</h3>
            <p className="text-sm text-cloud">Email content is fetched live from Graph, never written to a database. Also never stored: your Microsoft password, or payment card details.</p>
          </div>
        </div>
        <div className="rounded-2xl border border-gold/20 bg-gold/5 p-5 text-sm text-cloud mb-8">
          Internal access is need-to-know: support staff can see your plan and aggregate totals — never a list of individual employees or their usage.
        </div>
        <a href="/mailbroom/webapp/privacy" className="text-gold underline hover:text-gold/80 transition-colors text-sm font-semibold">
          Read the full Privacy Policy →
        </a>
      </section>

      {/* ── CTA ────────────────────────────────────────── */}
      <section className="section-dark py-20 text-center">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl font-black text-cloud mb-4">Ready to get started?</h2>
          <p className="text-cloud mb-6">Sign in with the Microsoft work account your company already uses.</p>
          <a
            href="https://app.mailbroom.app/sign-in"
            className="btn-gold px-8 py-4 rounded-full text-base inline-block"
          >
            Sign in with Microsoft
          </a>
        </div>
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
                <div className="text-xs text-cloud">Registered in England &amp; Wales · No. 16587000</div>
              </div>
            </div>
            <div className="flex gap-6 text-sm text-cloud flex-wrap justify-center">
              <a href="/mailbroom/webapp" className="hover:text-white transition-colors">MailBroom for Business</a>
              <a href="/mailbroom/webapp/support" className="hover:text-white transition-colors">Support</a>
              <a href="/mailbroom/webapp/privacy" className="hover:text-white transition-colors">Privacy</a>
              <a href="/mailbroom/webapp/terms" className="hover:text-white transition-colors">Terms of Use</a>
            </div>
          </div>
          <div className="footer-divider mt-8 pt-8 text-center text-xs text-cloud">
            © {new Date().getFullYear()} AIERT Ltd. MailBroom is a product of AIERT Ltd.
          </div>
        </div>
      </footer>

    </div>
  );
}
