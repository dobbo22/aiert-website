import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Security & Access Control – MailBroom for Business | AIERT Ltd",
  description: "How MailBroom for Business controls access to customer data, and how secrets and credentials are managed and rotated.",
  metadataBase: new URL("https://business.mailbroom.app"),
  alternates: { canonical: "/security" },
  openGraph: {
    title: "Security & Access Control – MailBroom for Business",
    description: "How MailBroom for Business controls access to customer data, and how secrets and credentials are managed and rotated.",
    url: "https://business.mailbroom.app/security",
    siteName: "AIERT Ltd",
    locale: "en_GB",
    type: "website",
    images: [{ url: "https://business.mailbroom.app/mailbroom-business-og.png", width: 1200, height: 628, alt: "MailBroom for Business — inbox cleanup for the whole company" }],
  },
};

const sections = [
  {
    icon: "🔐",
    title: "Customer data access",
    body: "Access to customer data is controlled at the application layer, not left to ambient trust. Every request runs through session-based authentication (Microsoft Entra ID sign-in); within an organisation, access is role-based — only designated admins can manage billing or members. AIERT's own internal staff tools are deliberately need-to-know: staff can see an organisation's plan, seat usage, and aggregate totals, and the contact details of its designated admins — never a full employee roster or individual usage.",
    link: { href: "/mailbroom/webapp/privacy", label: "See the full Privacy Policy →" },
  },
  {
    icon: "🗝️",
    title: "Secrets & credentials",
    list: [
      "All application secrets (payment processor keys, identity provider credentials, database credentials, internal service tokens) are stored as encrypted environment variables in our hosting platform (Vercel) — never committed to source control, never stored in plaintext files.",
      "Access to these secrets is limited to authorised engineering personnel with access to the hosting account.",
      "Secrets are rotated immediately if compromise is ever suspected, and reviewed periodically as part of ordinary engineering hygiene.",
      "Database credentials are scoped to a dedicated managed PostgreSQL provider (Neon), connected over TLS, with credentials held only as environment variables — not embedded in application code.",
      "Data at rest in that database is encrypted by the provider (AES-256), independently of anything MailBroom's own application code does — Neon is SOC 2 Type II compliant and manages encryption keys via AWS KMS/Azure Key Vault with restricted, logged access.",
    ],
  },
  {
    icon: "🔄",
    title: "Rotation & incident response",
    body: "If a secret is ever suspected to be exposed — through a leaked log, a compromised device, or any other route — it is rotated immediately and the affected credential is invalidated at the source (Stripe, Microsoft Entra ID, or the database provider, as applicable). This isn't a scheduled quarterly process; it's an immediate response triggered by suspicion, not calendar dates.",
  },
  {
    icon: "✉️",
    title: "Questions",
    body: "For security or access-control questions relating to MailBroom for Business, contact AIERT Ltd directly.",
    contact: true,
  },
];

export default function MailBroomSecurityPage() {
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
            <a href="/mailbroom/webapp/sso" className="hover:text-white transition-colors font-medium">SSO &amp; Permissions</a>
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
        <div className="text-5xl mb-6">🔐</div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-cloud mb-4">
          Security &amp; Access Control
        </h1>
        <p className="text-cloud text-base">
          MailBroom for Business &nbsp;·&nbsp; Last updated: 8 July 2026 &nbsp;·&nbsp; AIERT Ltd
        </p>
      </section>

      {/* ── HIGHLIGHTS ──────────────────────────────────── */}
      <section className="section-dark py-12">
        <div className="max-w-3xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {[
              { icon: "🔑", label: "Session-based, role-controlled access" },
              { icon: "🗝️", label: "Encrypted secrets at rest" },
              { icon: "🔄", label: "Immediate rotation on suspected exposure" },
              { icon: "🔐", label: "Need-to-know internal access" },
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
            {s.link && (
              <a href={s.link.href} className="inline-block mt-4 text-gold font-semibold hover:underline">
                {s.link.label}
              </a>
            )}
            {s.contact && (
              <p className="text-cloud leading-relaxed">
                Email AIERT Ltd at{" "}
                <a href="mailto:support@aiert.co.uk" className="text-gold underline hover:text-gold/80 transition-colors">
                  support@aiert.co.uk
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
              <a href="/mailbroom/webapp/sso" className="hover:text-white transition-colors">SSO &amp; Permissions</a>
              <a href="/mailbroom/webapp/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="/mailbroom/webapp/support" className="hover:text-white transition-colors">Support</a>
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
