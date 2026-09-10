import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy – AIERT Ltd",
  description: "AIERT Ltd's privacy policy, covering aiert.co.uk and the company's general data practices. For product-specific policies (MailBroom, PowerSearch), see the links below.",
  metadataBase: new URL("https://www.aiert.co.uk"),
};

const sections = [
  {
    icon: "📋",
    title: "Overview",
    body: "This policy covers aiert.co.uk, the corporate website of AIERT Ltd, a company registered in England & Wales (No. 16587000). It explains what data we collect when you visit this website and how to reach us with privacy questions. Our individual products — including MailBroom and PowerSearch — have their own, more detailed privacy policies, linked below, which take precedence for anything specific to using those products.",
  },
  {
    icon: "🌐",
    title: "Data We Collect on This Website",
    list: [
      "Analytics — we use Vercel Analytics, a privacy-focused, cookieless analytics service. It reports aggregate metrics such as page views and referrers, and does not use tracking cookies or collect personally identifiable information.",
      "Contact form / email enquiries — if you email us (e.g. enquiries@aiert.co.uk or admin@aiert.co.uk), we retain that correspondence to respond to you and for our business records. We do not add you to any marketing list without your consent.",
      "Server logs — our hosting provider (Vercel) may log standard technical data such as IP address and request metadata for security and operational purposes, in line with their own privacy policy.",
    ],
  },
  {
    icon: "🚫",
    title: "What We Don't Do",
    list: [
      "No advertising trackers or third-party ad networks on this site",
      "No sale of personal data to any third party",
      "No tracking cookies or cross-site tracking identifiers",
    ],
  },
  {
    icon: "🔗",
    title: "Product-Specific Policies",
    body: null,
    links: [
      { label: "MailBroom (iOS app)", href: "/mailbroom/privacy" },
      { label: "MailBroom for Business (web app)", href: "/mailbroom/webapp/privacy" },
    ],
  },
  {
    icon: "⚖️",
    title: "Your Rights",
    body: "Under UK GDPR, you have the right to access, correct, or request deletion of any personal data we hold about you (such as email correspondence). To exercise these rights, contact us using the details below.",
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

export default function PrivacyPage() {
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
            <a href="mailto:enquiries@aiert.co.uk" className="hover:text-white transition-colors font-medium">Contact</a>
          </div>
        </div>
      </nav>

      {/* ── HEADER ──────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 pt-20 pb-12 text-center">
        <div className="text-5xl mb-6">🔒</div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-cloud mb-4">
          Privacy Policy
        </h1>
        <p className="text-mist text-base">
          Last updated: 10 September 2026 &nbsp;·&nbsp; AIERT Ltd
        </p>
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
            {s.links && (
              <ul className="space-y-3 mt-2">
                {s.links.map((l) => (
                  <li key={l.href}>
                    <a href={l.href} className="text-gold underline hover:text-gold/80 transition-colors">
                      {l.label}
                    </a>
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
              <a href="/" className="hover:text-white transition-colors">AIERT Home</a>
              <a href="/mailbroom" className="hover:text-white transition-colors">MailBroom</a>
              <a href="mailto:enquiries@aiert.co.uk" className="hover:text-white transition-colors">Contact</a>
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
