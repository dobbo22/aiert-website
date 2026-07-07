import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy – MailBroom for Business | AIERT Ltd",
  description: "Privacy policy for MailBroom for Business, the Microsoft 365 web app — what's stored, how sign-in works, and exactly what AIERT staff can and cannot see about your organisation.",
  metadataBase: new URL("https://aiert.co.uk"),
};

const sections = [
  {
    icon: "📋",
    title: "Overview",
    body: "This policy covers MailBroom for Business only — the web app for Microsoft 365 and Exchange Online at app.mailbroom.app. It is a different product from MailBroom for iOS, which runs entirely on-device with no backend at all; MailBroom for Business necessarily has a backend, since it connects to your mailbox via the Microsoft Graph API. See MailBroom for iOS's own privacy policy if that's the product you're looking for.",
  },
  {
    icon: "🔑",
    title: "Sign-in & Credentials",
    body: "You sign in with your existing Microsoft work account via Microsoft Entra ID — the same login your company already uses for Microsoft 365. MailBroom never sees or stores your password. We only ever receive a scoped, revocable Microsoft Graph access token, used to read and act on your mailbox on your behalf. You (or your IT admin) can revoke that access at any time via your organisation's Microsoft admin settings.",
  },
  {
    icon: "🗄️",
    title: "What We Store",
    list: [
      "Your email address and display name — used for sign-in and to identify you within your organisation.",
      "Your company's licence and billing status — plan, seat count, subscription status.",
      "Aggregate usage counters — e.g. total emails cleaned, storage freed, CO₂ saved. These are numeric totals only.",
      "Microsoft Graph access tokens — used to make Graph API calls on your behalf; these can be revoked at any time via Microsoft.",
    ],
  },
  {
    icon: "🚫",
    title: "What We Never Store",
    list: [
      "Email content — subjects, bodies, attachments. These are fetched live from Microsoft Graph to power features like Smart Sweep and Storage Cleanup, processed for that one request, and never written to our database.",
      "Your Microsoft password — sign-in happens entirely through Microsoft's own login flow.",
      "Payment card details — billing is handled entirely by Stripe (see below).",
    ],
  },
  {
    icon: "🔐",
    title: "Internal Access Is Need-to-Know",
    body: "AIERT staff supporting your account can see your organisation's plan, seat usage, and aggregate usage totals — never a list of individual employees' email addresses or their individual usage. The only individual contact details AIERT staff can see are the email addresses of your organisation's own designated admins (the people your organisation has chosen to manage billing) — people you control and can reassign at any time from the app's Billing page. Your organisation's own admins can see their full team's member list from within the app; AIERT's internal tools deliberately cannot.",
  },
  {
    icon: "🏢",
    title: "Domain-Based Access",
    body: "Your company's licence is tied to your email domain (e.g. yourcompany.com) rather than individual invitations — anyone signing in with a matching company email address gets access automatically once your organisation has an active plan. Public email providers (Gmail, Outlook.com, Yahoo, etc.) are explicitly excluded from this automatic domain-matching, so one person's personal account can never grant access to unrelated strangers on the same free email provider.",
  },
  {
    icon: "💳",
    title: "Billing",
    body: "Subscriptions are billed via Stripe, a PCI-compliant payment processor. AIERT Ltd does not receive or store your card details — Stripe handles payment collection, invoicing, and the self-service billing portal directly.",
  },
  {
    icon: "🌱",
    title: "Public Leaderboard (Opt-In Only)",
    body: "Your organisation's admin can optionally opt in to a public leaderboard on this site showing your company name and icon (fetched from a public favicon service using your company domain) alongside your aggregate CO₂/storage savings. This is off by default, requires an explicit admin action to enable, and never exposes individual employee data — only your organisation's own name, icon, and aggregate totals, and only if you choose to turn it on.",
  },
  {
    icon: "👶",
    title: "Children",
    body: "MailBroom for Business is intended for use by employees of business organisations and is not directed at children.",
  },
  {
    icon: "📝",
    title: "Changes to This Policy",
    body: "If we make material changes to this policy we will update the date at the top of this page.",
  },
  {
    icon: "✉️",
    title: "Contact",
    body: null,
    contact: true,
  },
];

export default function MailBroomBusinessPrivacyPage() {
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
            <a href="/mailbroom/webapp" className="hover:text-white transition-colors font-medium">MailBroom for Business</a>
            <a href="/mailbroom" className="hover:text-white transition-colors font-medium">MailBroom for iOS</a>
            <a href="/#contact" className="hover:text-white transition-colors font-medium">Contact</a>
          </div>
          <a
            href="https://app.mailbroom.app"
            className="btn-gold px-6 py-3 rounded-full text-base hidden md:block"
          >
            Sign in
          </a>
        </div>
      </nav>

      {/* ── HEADER ──────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 pt-20 pb-12 text-center">
        <div className="text-5xl mb-6">🔒</div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-cloud mb-4">
          Privacy Policy
        </h1>
        <p className="text-mist text-base">
          MailBroom for Business &nbsp;·&nbsp; Last updated: 4 July 2026 &nbsp;·&nbsp; AIERT Ltd
        </p>
        <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal/10 border border-teal/20 text-teal text-sm font-medium">
          <span>🔐</span> Need-to-know internal access only
        </div>
      </section>

      {/* ── HIGHLIGHTS ──────────────────────────────────── */}
      <section className="section-dark py-12">
        <div className="max-w-3xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {[
              { icon: "🔑", label: "Microsoft Entra ID sign-in" },
              { icon: "🚫", label: "No passwords stored" },
              { icon: "🔐", label: "No individual employee data for AIERT staff" },
              { icon: "💳", label: "Stripe billing" },
            ].map((item) => (
              <div key={item.label} className="stat-teal rounded-xl p-4 text-center">
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="text-teal font-semibold text-xs">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTIONS ────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-16 space-y-6">
        {sections.map((s) => (
          <div key={s.title} className="card-glass rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{s.icon}</span>
              <h2 className="text-xl font-bold text-cloud">{s.title}</h2>
            </div>
            {s.body && (
              <p className="text-mist leading-relaxed">{s.body}</p>
            )}
            {s.list && (
              <ul className="space-y-3 mt-2">
                {s.list.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-mist">
                    <span className="mt-0.5 flex-shrink-0 text-teal">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
            {s.contact && (
              <p className="text-mist leading-relaxed">
                For privacy-related questions, contact AIERT Ltd at{" "}
                <a href="mailto:enquiries@aiert.co.uk" className="text-gold underline hover:text-gold/80 transition-colors">
                  enquiries@aiert.co.uk
                </a>
              </p>
            )}
          </div>
        ))}
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
                <div className="text-xs text-mist">Registered in England &amp; Wales · No. 16587000</div>
              </div>
            </div>
            <div className="flex gap-6 text-sm text-mist flex-wrap justify-center">
              <a href="/mailbroom/webapp" className="hover:text-white transition-colors">MailBroom for Business</a>
              <a href="/mailbroom" className="hover:text-white transition-colors">MailBroom for iOS</a>
              <a href="/mailbroom/webapp/sso" className="hover:text-white transition-colors">SSO &amp; Permissions</a>
              <a href="/mailbroom/webapp/security" className="hover:text-white transition-colors">Security &amp; Access</a>
              <a href="/mailbroom/webapp/support" className="hover:text-white transition-colors">Support</a>
              <a href="/mailbroom/webapp/terms" className="hover:text-white transition-colors">Terms of Use</a>
              <a href="/#contact" className="hover:text-white transition-colors">Contact</a>
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
