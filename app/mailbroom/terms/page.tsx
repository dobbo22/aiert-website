import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use – MailBroom | AIERT Ltd",
  description: "MailBroom terms of use. Simple, fair terms for a privacy-first email cleaning app.",
  metadataBase: new URL("https://aiert.co.uk"),
};

const sections = [
  {
    icon: "📋",
    title: "Acceptance of Terms",
    body: "By downloading or using MailBroom you agree to these Terms of Use. If you do not agree, do not use the app. These terms apply to all versions of MailBroom distributed via the Apple App Store.",
  },
  {
    icon: "📱",
    title: "Licence",
    body: "AIERT Ltd grants you a personal, non-exclusive, non-transferable, revocable licence to use MailBroom on Apple devices you own or control, subject to these terms and the Apple App Store Terms of Service.",
  },
  {
    icon: "⚠️",
    title: "Your Responsibility for Email Actions",
    list: [
      "MailBroom connects directly to your email account and performs actions (deletion, moving, unsubscribing) on your behalf. You are solely responsible for reviewing and confirming any actions before they are applied.",
      "Deleted emails may be permanently removed from your mail server depending on your provider's settings. AIERT Ltd accepts no liability for emails deleted through use of the app.",
      "Unsubscribe requests are sent directly from your device to mailing list servers. AIERT Ltd does not control whether those requests are honoured.",
      "You must have lawful access to any email account you connect to MailBroom.",
    ],
  },
  {
    icon: "🔑",
    title: "Credentials & Security",
    body: "Your email credentials (passwords and OAuth tokens) are stored exclusively in the iOS Keychain on your device. AIERT Ltd never has access to your credentials. You are responsible for maintaining the security of your device and Apple ID.",
  },
  {
    icon: "💳",
    title: "Subscriptions",
    list: [
      "MailBroom Pro is available as an auto-renewable subscription managed by Apple through the App Store.",
      "Subscription prices are displayed before purchase and may vary by region.",
      "Subscriptions automatically renew unless cancelled at least 24 hours before the end of the current period.",
      "You can manage or cancel your subscription in your Apple ID settings.",
      "AIERT Ltd does not process payments directly and does not store payment information.",
      "Refunds are handled by Apple in accordance with their App Store refund policy.",
    ],
  },
  {
    icon: "🚫",
    title: "Prohibited Use",
    list: [
      "You may not use MailBroom to access email accounts you are not authorised to access.",
      "You may not reverse-engineer, decompile, or attempt to extract the source code of MailBroom.",
      "You may not use MailBroom for any unlawful purpose or in violation of any applicable laws.",
    ],
  },
  {
    icon: "🔄",
    title: "Updates & Changes",
    body: "AIERT Ltd may update MailBroom from time to time. Updates may change or remove features. We reserve the right to modify these terms at any time. Continued use of the app after changes constitutes acceptance of the new terms.",
  },
  {
    icon: "⚖️",
    title: "Disclaimer of Warranties",
    body: "MailBroom is provided 'as is' without warranties of any kind, express or implied. AIERT Ltd does not warrant that the app will be error-free, uninterrupted, or compatible with all mail servers. Use of the app is at your own risk.",
  },
  {
    icon: "🛡️",
    title: "Limitation of Liability",
    body: "To the maximum extent permitted by law, AIERT Ltd shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of MailBroom, including but not limited to loss of emails or data.",
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

export default function MailBroomTermsPage() {
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
            <a href="/" className="hover:text-white transition-colors font-medium">Home</a>
            <a href="/mailbroom" className="hover:text-white transition-colors font-medium">MailBroom</a>
            <a href="/#contact" className="hover:text-white transition-colors font-medium">Contact</a>
          </div>
          <a
            href="https://sharequest.co.uk"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-gold px-6 py-3 rounded-full text-base hidden md:block"
          >
            Visit ShareQuest
          </a>
        </div>
      </nav>

      {/* ── HEADER ──────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 pt-20 pb-12 text-center">
        <div className="text-5xl mb-6">📄</div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-cloud mb-4">
          Terms of Use
        </h1>
        <p className="text-mist text-base">
          Last updated: 22 April 2026 &nbsp;·&nbsp; AIERT Ltd
        </p>
        <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal/10 border border-teal/20 text-teal text-sm font-medium">
          <span>⚖️</span> Simple, fair terms
        </div>
      </section>

      {/* ── HIGHLIGHTS ──────────────────────────────────── */}
      <section className="section-dark py-12">
        <div className="max-w-3xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {[
              { icon: "📱", label: "Personal licence" },
              { icon: "💳", label: "Apple billing" },
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
                <div className="text-xs text-mist">Registered in England &amp; Wales · No. 16253779</div>
              </div>
            </div>
            <div className="flex gap-6 text-sm text-mist flex-wrap justify-center">
              <a href="/" className="hover:text-white transition-colors">AIERT Home</a>
              <a href="/mailbroom" className="hover:text-white transition-colors">MailBroom</a>
              <a href="/mailbroom/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="https://sharequest.co.uk" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">ShareQuest</a>
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
