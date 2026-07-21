import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use – MailBroom for Business | AIERT Ltd",
  description: "Terms of Use for MailBroom for Business, the Microsoft 365 web app — licensing per company domain, Stripe billing, seat bands, and admin responsibilities.",
  metadataBase: new URL("https://aiert.co.uk"),
};

const sections = [
  {
    icon: "📋",
    title: "Acceptance of Terms",
    body: "By signing in to or using MailBroom for Business (\"the Service\", at app.mailbroom.app) you agree to these Terms of Use on behalf of yourself and, where applicable, your organisation. If you do not agree, do not use the Service. These terms are separate from and do not apply to MailBroom for iOS, which has its own terms.",
  },
  {
    icon: "🏢",
    title: "Licence & Domain-Based Access",
    list: [
      "AIERT Ltd grants your organisation a non-exclusive, non-transferable, revocable licence to use the Service, scoped to the number of seats purchased under your organisation's plan.",
      "Access is granted automatically to any individual signing in with an email address on your organisation's verified company domain — your organisation is responsible for the conduct of anyone who signs in this way while employed or engaged by your organisation.",
      "Your organisation's designated admin(s) are responsible for managing seat count, billing, and admin assignments via the Billing page.",
    ],
  },
  {
    icon: "🔑",
    title: "Sign-In & Your Responsibility for Actions",
    list: [
      "The Service connects to Microsoft 365/Exchange Online via the Microsoft Graph API, using your own Microsoft sign-in — you are responsible for the security of your Microsoft account.",
      "The Service performs actions you request (deletion, moving, unsubscribing) directly against your mailbox. You are solely responsible for reviewing and confirming any bulk action before it is applied.",
      "Deleted or moved emails may be permanently affected depending on your organisation's Microsoft 365 retention settings. AIERT Ltd accepts no liability for emails deleted or moved through use of the Service.",
      "You must have lawful authorisation to access any mailbox you use the Service with.",
    ],
  },
  {
    icon: "💳",
    title: "Billing & Subscriptions",
    list: [
      "Plans are billed monthly via Stripe, based on the seat band your organisation selects (or a bespoke arrangement for 101+ seats, agreed directly with AIERT Ltd).",
      "Your organisation's admin(s) can change plan band, view invoices, and manage payment methods via the Stripe-hosted billing portal, accessible from the Billing page.",
      "Subscriptions renew automatically each billing period until cancelled. Cancelling takes effect at the end of the current billing period.",
      "AIERT Ltd does not store your organisation's payment card details — these are held by Stripe.",
      "Prices are as displayed on the Service at the time of purchase and may change with notice for future billing periods.",
    ],
  },
  {
    icon: "🔐",
    title: "Data Handling",
    body: "See our dedicated Privacy Policy for MailBroom for Business for full detail on what is stored, how sign-in works, and the internal need-to-know boundary on employee data. In summary: AIERT staff can see your organisation's plan and aggregate usage, and your designated admins' contact details, but not individual employees' email addresses or usage.",
  },
  {
    icon: "🚫",
    title: "Prohibited Use",
    list: [
      "You may not use the Service to access mailboxes you are not authorised to access.",
      "You may not attempt to reverse-engineer, decompile, or extract the source code of the Service.",
      "You may not use the Service for any unlawful purpose or in violation of applicable law, or your organisation's own Microsoft 365 terms with Microsoft.",
      "You may not attempt to circumvent domain-based access controls or seat limits.",
    ],
  },
  {
    icon: "🔄",
    title: "Updates & Changes",
    body: "AIERT Ltd may update the Service from time to time; updates may change or remove features. We may modify these terms at any time — continued use of the Service after changes constitutes acceptance of the new terms.",
  },
  {
    icon: "⚖️",
    title: "Disclaimer of Warranties",
    body: "The Service is provided 'as is' without warranties of any kind, express or implied. AIERT Ltd does not warrant that the Service will be error-free, uninterrupted, or compatible with every Microsoft 365/Exchange Online configuration (including on-premises-only mailboxes, which are not supported). Use of the Service is at your own risk.",
  },
  {
    icon: "🛡️",
    title: "Limitation of Liability",
    body: "To the maximum extent permitted by law, AIERT Ltd shall not be liable for any indirect, incidental, special, or consequential damages arising from use of the Service, including but not limited to loss of emails or data.",
  },
  {
    icon: "🌍",
    title: "Governing Law",
    body: "These terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.",
  },
  {
    icon: "✉️",
    title: "Contact",
    body: null,
    contact: true,
  },
];

export default function MailBroomBusinessTermsPage() {
  return (
    <div className="min-h-screen hero-gradient grid-bg">

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
            <a href="/mailbroom" className="hover:text-white transition-colors font-medium">MailBroom for iOS</a>
            <a href="/#contact" className="hover:text-white transition-colors font-medium">Contact</a>
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
        <div className="text-5xl mb-6">📄</div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-cloud mb-4">
          Terms of Use
        </h1>
        <p className="text-cloud text-base">
          MailBroom for Business &nbsp;·&nbsp; Last updated: 4 July 2026 &nbsp;·&nbsp; AIERT Ltd
        </p>
        <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal/10 border border-teal/20 text-teal text-sm font-medium">
          <span>⚖️</span> Per-company licensing, fair terms
        </div>
      </section>

      {/* ── HIGHLIGHTS ──────────────────────────────────── */}
      <section className="section-dark py-12">
        <div className="max-w-3xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {[
              { icon: "🏢", label: "Per-domain licence" },
              { icon: "💳", label: "Stripe billing" },
              { icon: "⚠️", label: "You control actions" },
              { icon: "🌍", label: "English law" },
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
              <p className="text-cloud leading-relaxed">{s.body}</p>
            )}
            {s.list && (
              <ul className="space-y-3 mt-2">
                {s.list.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-cloud">
                    <span className="mt-0.5 flex-shrink-0 text-teal">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
            {s.contact && (
              <p className="text-cloud leading-relaxed">
                For questions about these terms, contact AIERT Ltd at{" "}
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
                <div className="text-xs text-cloud">Registered in England &amp; Wales · No. 16587000</div>
              </div>
            </div>
            <div className="flex gap-6 text-sm text-cloud flex-wrap justify-center">
              <a href="/mailbroom/webapp" className="hover:text-white transition-colors">MailBroom for Business</a>
              <a href="/mailbroom" className="hover:text-white transition-colors">MailBroom for iOS</a>
              <a href="/mailbroom/webapp/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="/#contact" className="hover:text-white transition-colors">Contact</a>
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
