import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support – MailBroom for Business | AIERT Ltd",
  description: "Help and support for MailBroom for Business — a quick guide to every feature, plus how to reach AIERT Ltd directly.",
  metadataBase: new URL("https://aiert.co.uk"),
};

const topics = [
  {
    icon: "🚀",
    title: "Getting started",
    body: "Sign in with your Microsoft work account, then head to Dashboard and click Scan Inbox. MailBroom reads your mailbox via Microsoft Graph and groups senders so you can see what's worth cleaning up.",
  },
  {
    icon: "🔍",
    title: "Smart Sweep",
    body: "Ranks senders by volume so you can bulk-delete, unsubscribe, or keep newsletters and notifications in a few clicks. Best for clearing out recurring low-value senders fast.",
  },
  {
    icon: "💾",
    title: "Storage Cleanup",
    body: "Browse senders by age or domain to free up mailbox space — useful when you're hitting Exchange Online storage limits. Shows exactly how much storage each sender is using.",
  },
  {
    icon: "🔎",
    title: "Power Search",
    body: "Search your entire mailbox by sender, keyword, date range, or read status, then bulk-act on the results — handy for offboarding, compliance sweeps, or clearing out a finished project's emails.",
  },
  {
    icon: "🌱",
    title: "Leaderboard",
    body: "Shows your company's CO₂/storage savings and how you and your colleagues rank, each with an award badge. Visible to everyone in your organisation, not just admins.",
  },
  {
    icon: "💳",
    title: "Billing",
    body: "Admins get an Admin page with three tabs: Plan & Billing (upgrade/downgrade, manage payment via Stripe), Members (see your team, grant/revoke admin), and Company Profile (public leaderboard opt-in). Anyone signing in with your company's email domain gets access automatically once your organisation has an active plan — there's nothing to invite per person.",
  },
  {
    icon: "🔐",
    title: "Security & privacy",
    body: "Sign-in goes through Microsoft Entra ID — MailBroom never sees or stores your password, only a scoped Graph access token. Email content is fetched live to power these features and is never stored in our database.",
    link: { href: "/mailbroom/webapp/privacy", label: "Read the full Privacy Policy →" },
  },
];

export default function MailBroomSupportPage() {
  return (
    <div className="min-h-screen hero-gradient grid-bg">

      {/* ── NAV ─────────────────────────────────────────── */}
      <nav className="nav-glass sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between">
          <a href="/mailbroom/webapp" className="flex items-center gap-4">
            <div className="nav-logo-icon w-11 h-11 rounded-lg flex items-center justify-center font-black text-base">
              AI
            </div>
            <span className="font-bold text-2xl tracking-tight text-cloud">
              AIERT<span className="text-sm font-normal ml-1 text-cloud">Ltd</span>
            </span>
          </a>
          <div className="hidden md:flex items-center gap-10 text-base text-cloud">
            <a href="/mailbroom/webapp" className="hover:text-white transition-colors font-medium">MailBroom for Business</a>
            <a href="/mailbroom/webapp/privacy" className="hover:text-white transition-colors font-medium">Privacy</a>
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
        <div className="text-5xl mb-6">💬</div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-cloud mb-4">
          Support
        </h1>
        <p className="text-cloud text-base max-w-xl mx-auto">
          A quick guide to every feature in MailBroom for Business, and how to reach us directly if it doesn't answer your question.
        </p>
      </section>

      {/* ── TOPICS ──────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {topics.map((t) => (
            <div key={t.title} className="card-glass rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{t.icon}</span>
                <h2 className="font-bold text-cloud">{t.title}</h2>
              </div>
              <p className="text-sm text-cloud leading-relaxed">{t.body}</p>
              {t.link && (
                <a href={t.link.href} className="inline-block mt-3 text-sm text-gold font-semibold hover:underline">
                  {t.link.label}
                </a>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── CONTACT ─────────────────────────────────────── */}
      <section className="section-dark py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="card-teal-accent rounded-3xl p-10 glow-teal">
            <div className="text-4xl mb-4">✉️</div>
            <h2 className="text-2xl font-bold text-cloud mb-3">Still need help?</h2>
            <p className="text-cloud leading-relaxed mb-6">
              Email AIERT Ltd directly and we'll get back to you.
            </p>
            <a
              href="mailto:support@aiert.co.uk"
              className="btn-gold px-8 py-4 rounded-full text-base inline-block"
            >
              support@aiert.co.uk
            </a>
          </div>
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
              <a href="/mailbroom/webapp/sso" className="hover:text-white transition-colors">SSO &amp; Permissions</a>
              <a href="/mailbroom/webapp/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="/mailbroom/webapp/security" className="hover:text-white transition-colors">Security &amp; Access</a>
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
