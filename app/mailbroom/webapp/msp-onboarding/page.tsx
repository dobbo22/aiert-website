import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Deploying MailBroom Across Multiple Client Tenants | AIERT Ltd",
  description:
    "How an MSP sets up MailBroom for Business for a client's Microsoft 365 tenant, and why it's configured per client rather than through one MSP-wide login.",
  keywords: [
    "MSP deploy MailBroom client tenants",
    "MSP onboarding Microsoft 365 tool",
    "multi-tenant mailbox cleanup MSP",
    "MSP client Microsoft 365 setup",
    "IT service provider mailbox tool rollout",
  ],
  metadataBase: new URL("https://business.mailbroom.app"),
  openGraph: {
    title: "Deploying MailBroom Across Multiple Client Tenants",
    description: "How an MSP sets up MailBroom for a client's M365 tenant, client by client.",
    url: "https://business.mailbroom.app/msp-onboarding",
    siteName: "AIERT Ltd",
    locale: "en_GB",
    type: "website",
  },
};

const faqs = [
  {
    q: "How does an MSP set up MailBroom for a client's Microsoft 365 tenant?",
    a: "An admin (the MSP, or the client's own IT contact) signs in with Microsoft SSO against that specific client's tenant — the same Entra ID login already used for Microsoft 365. Once that's done, every employee on the client's domain gets access automatically, with no per-user invites to send.",
  },
  {
    q: "Is there a single dashboard to manage MailBroom across every client tenant an MSP looks after?",
    a: "No — MailBroom for Business is licensed and configured per organisation (per Microsoft 365 tenant), so an MSP sets it up separately for each client tenant rather than through one unified, MSP-wide login across all of them. In practice this means it's introduced client by client, not as a single all-or-nothing rollout.",
  },
  {
    q: "Does onboarding a new client tenant take significant IT time?",
    a: "The setup itself is a single Microsoft SSO sign-in per tenant, typically actioned within a business day — see the trial page for the exact process. The ongoing time saved is the point: once set up, employees clear their own mailboxes rather than raising tickets an MSP technician has to work by hand.",
  },
  {
    q: "Can an MSP roll this out to some clients and not others?",
    a: "Yes — since setup is per client tenant, an MSP can introduce it to one client at a time (e.g. starting with a client already hitting storage overage) rather than needing to commit across its whole client base upfront.",
  },
];

const techArticleJsonLd = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "Deploying MailBroom Across Multiple Client Tenants",
  description: "How an MSP sets up MailBroom for Business for a client's Microsoft 365 tenant, configured per client rather than through one MSP-wide login.",
  url: "https://business.mailbroom.app/msp-onboarding",
  publisher: { "@type": "Organization", name: "AIERT Ltd", url: "https://aiert.co.uk" },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.q,
    acceptedAnswer: { "@type": "Answer", text: faq.a },
  })),
};

export default function MspOnboardingPage() {
  return (
    <div className="min-h-screen hero-gradient grid-bg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(techArticleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* ── NAV ─────────────────────────────────────────── */}
      <nav className="nav-glass sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between">
          <a href="/" className="flex items-center gap-4">
            <img src="/mailbroom-icon.png" alt="MailBroom" width={44} height={44} className="w-11 h-11 rounded-lg" />
            <span className="font-bold text-2xl tracking-tight text-cloud">
              MailBroom
            </span>
          </a>
          <div className="hidden md:flex items-center gap-10 text-base text-cloud">
            <a href="/" className="hover:text-white transition-colors font-medium">MailBroom for Business</a>
            <a href="/msp-storage-billing" className="hover:text-white transition-colors font-medium">MSP Billing</a>
            <a href="/tenant-migration" className="hover:text-white transition-colors font-medium">Tenant Migration</a>
          </div>
          <a
            href="/trial"
            className="btn-gold px-6 py-3 rounded-full text-base hidden md:block"
          >
            Start a Trial
          </a>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="badge-live inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium mb-6">
          <span className="w-2 h-2 rounded-full bg-gold animate-pulse inline-block" />
          For MSPs · Microsoft 365
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight mb-6 text-cloud">
          One client tenant <span className="gold-text">at a time.</span>
        </h1>
        <p className="text-lg text-cloud leading-relaxed max-w-2xl mx-auto">
          How MSPs actually set up MailBroom for a client's Microsoft 365 tenant — a single SSO
          sign-in per client, not a unified dashboard across every client at once.
        </p>
      </section>

      {/* ── HOW SETUP WORKS ──────────────────────────────── */}
      <section className="section-dark py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-teal">Per-tenant setup</p>
            <h2 className="text-4xl font-black text-cloud">Configured client by client</h2>
          </div>
          <div className="space-y-6">
            <div className="card-glass rounded-2xl p-8">
              <h3 className="font-bold text-cloud text-lg mb-2">Sign in against that client's tenant</h3>
              <p className="text-sm text-cloud leading-relaxed">
                An admin signs in with Microsoft SSO against the specific client tenant being
                onboarded — the same Entra ID login already used for that client's Microsoft 365.
              </p>
            </div>
            <div className="card-glass rounded-2xl p-8">
              <h3 className="font-bold text-cloud text-lg mb-2">Every employee gets access automatically</h3>
              <p className="text-sm text-cloud leading-relaxed">
                Once that sign-in is done, any employee on the client's domain gets MailBroom access
                automatically — no per-user invites to send, no individual App Store installs to
                manage.
              </p>
            </div>
            <div className="card-glass rounded-2xl p-8">
              <h3 className="font-bold text-cloud text-lg mb-2">No cross-client dashboard, by design</h3>
              <p className="text-sm text-cloud leading-relaxed">
                MailBroom for Business is licensed per organisation, so there's no single login that
                spans every client tenant an MSP manages — each client is set up on its own. In
                practice that means an MSP can roll it out to one client at a time rather than
                committing to every client at once.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-24">
        <h3 className="text-xl font-bold text-cloud mb-8 text-center">Frequently asked questions</h3>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <details key={i} className="card-glass rounded-xl p-6 group cursor-pointer">
              <summary className="font-semibold text-cloud text-sm flex items-center justify-between">
                {faq.q}
                <span className="text-gold group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="text-cloud text-sm mt-3">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <h2 className="text-3xl md:text-4xl font-black text-cloud mb-6">
          Start with <span className="gold-text">one client tenant.</span>
        </h2>
        <p className="text-cloud mb-8 max-w-xl mx-auto">
          A 30-day IT assessment costs nothing and needs no card — just that client's own
          Microsoft 365 tenant.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/trial"
            className="btn-gold px-10 py-5 rounded-full text-lg inline-flex items-center gap-3 justify-center"
          >
            <span>🧪</span> Start Your Free IT Assessment
          </a>
          <a
            href="/msp-storage-billing"
            className="btn-outline px-10 py-5 rounded-full text-lg inline-flex items-center gap-3 justify-center"
          >
            How to Bill For It
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
              <a href="/" className="hover:text-white transition-colors">MailBroom for Business</a>
              <a href="/msp-storage-billing" className="hover:text-white transition-colors">MSP Billing</a>
              <a href="/tenant-migration" className="hover:text-white transition-colors">Tenant Migration</a>
              <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="/terms" className="hover:text-white transition-colors">Terms of Use</a>
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
