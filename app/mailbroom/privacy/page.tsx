import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy – MailBroom | AIERT Ltd",
  description: "MailBroom privacy policy. Your emails never leave your device. No tracking, no analytics, no external servers.",
  metadataBase: new URL("https://aiert.co.uk"),
};

const sections = [
  {
    icon: "📋",
    title: "Overview",
    body: "MailBroom is designed with privacy as a first principle. Your emails are processed entirely on your device and are never transmitted to any server operated by AIERT Ltd or any third party. There is no MailBroom backend.",
  },
  {
    icon: "🚫",
    title: "Data We Do Not Collect",
    list: [
      "Email content, subject lines or sender addresses",
      "Your IMAP credentials (stored only in the iOS Keychain on your device)",
      "Usage analytics or behavioural data",
      "Advertising identifiers or tracking data",
      "Device identifiers beyond what Apple provides to the App Store",
    ],
  },
  {
    icon: "⚙️",
    title: "How MailBroom Works",
    list: [
      "IMAP connection — MailBroom connects directly from your device to your own mail server (Gmail, Outlook, iCloud, or any IMAP server) over an encrypted TLS connection. No email data passes through our servers.",
      "AI classification — Email classification uses a 5-layer on-device pipeline: (1) sender memory for instant recognition, (2) a Naive Bayes model, (3) local rules based on sender address and subject patterns, (4) a personalised on-device model trained on your own inbox using Apple's CreateML framework (iOS 16+), and (5) Apple Intelligence (iOS 26+) for ambiguous cases. Every layer runs entirely on your device. Training data and model weights are stored locally and never uploaded or shared.",
      "Personalised learning — The CreateML model continuously improves from your corrections. When you reclassify an email, the example is added to your on-device training set and the model retrains silently in the background. No labelled data leaves your device.",
      "Credentials — Your email password and OAuth tokens are stored exclusively in the iOS Keychain using Apple's secure storage APIs, protected by hardware encryption and inaccessible while the device is locked. They are never stored in plain text or transmitted to any party other than your own mail server.",
      "Unsubscribe requests — When you use Smart Unsubscribe, MailBroom sends an opt-out request directly from your device to the mailing list's unsubscribe URL (as specified in the email's List-Unsubscribe header) over HTTPS only. No data passes through our servers.",
      "Unsubscribe log — A record of each unsubscribe attempt (sender address, method used, and outcome) is stored locally on your device with full file-system encryption. It is never transmitted anywhere and can be cleared at any time from Settings → Unsubscribe Log.",
    ],
  },
  {
    icon: "🧠",
    title: "On-Device AI",
    body: "MailBroom includes an on-device AI model that learns from your inbox over time. It trains entirely on your device using your own email data — no email content, training data, or model weights are ever sent to any server. The model is stored in your app's private local storage and is permanently deleted if you reset scan history or uninstall the app.",
  },
  {
    icon: "💳",
    title: "Subscriptions & Billing",
    body: "MailBroom Pro is an auto-renewable subscription managed entirely by Apple through the App Store. AIERT Ltd does not receive or store any payment card details. All billing queries should be directed to Apple Support.",
  },
  {
    icon: "🔔",
    title: "Notifications",
    body: "MailBroom may send local notifications (scan complete summary, daily digest at 9am). These are generated on your device and do not involve any external service.",
  },
  {
    icon: "👶",
    title: "Children",
    body: "MailBroom is rated 4+ on the App Store. We do not knowingly collect any data from any user, including children under 13.",
  },
  {
    icon: "📝",
    title: "Changes to This Policy",
    body: "If we make material changes to this policy we will update the date at the top of this page and, where appropriate, notify users via an in-app notice.",
  },
  {
    icon: "✉️",
    title: "Contact",
    body: null,
    contact: true,
  },
];

export default function MailBroomPrivacyPage() {
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
        <div className="text-5xl mb-6">🔒</div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-cloud mb-4">
          Privacy Policy
        </h1>
        <p className="text-mist text-base">
          Last updated: 30 April 2026 &nbsp;·&nbsp; AIERT Ltd
        </p>
        <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal/10 border border-teal/20 text-teal text-sm font-medium">
          <span>📵</span> Your emails never leave your device
        </div>
      </section>

      {/* ── PRIVACY HIGHLIGHTS ──────────────────────────── */}
      <section className="section-dark py-12">
        <div className="max-w-3xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {[
              { icon: "📵", label: "No external servers" },
              { icon: "🚫", label: "No data harvesting" },
              { icon: "📱", label: "On-device AI" },
              { icon: "🔑", label: "Keychain storage" },
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
                <a href="mailto:aiert@btinternet.com" className="text-gold underline hover:text-gold/80 transition-colors">
                  aiert@btinternet.com
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
