import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How MSPs Bill for M365 Storage Cleanup | AIERT Ltd",
  description:
    "How MSPs turn Microsoft 365 mailbox storage overage into a billable service — one-off remediation projects vs a recurring managed-service line item, and what tooling makes it worth offering.",
  keywords: [
    "MSP bill mailbox storage cleanup",
    "M365 storage overage MSP",
    "managed service storage remediation",
    "MSP recurring revenue Microsoft 365",
    "IT support storage cleanup pricing",
    "MSP value added service email",
  ],
  metadataBase: new URL("https://business.mailbroom.app"),
  alternates: { canonical: "/msp-storage-billing" },
  openGraph: {
    images: [{ url: "https://business.mailbroom.app/mailbroom-business-og.png", width: 1200, height: 628, alt: "MailBroom for Business — inbox cleanup for the whole company" }],
    title: "How MSPs Bill for M365 Storage Cleanup",
    description: "Turning mailbox storage overage into a billable, recurring service line — not just a one-off fix.",
    url: "https://business.mailbroom.app/msp-storage-billing",
    siteName: "AIERT Ltd",
    locale: "en_GB",
    type: "website",
  },
};

const faqs = [
  {
    q: "How do MSPs typically bill clients for M365 storage overage remediation?",
    a: "Two common models: a one-off project fee for a single cleanup engagement (scoped by mailbox count or total data volume), or folding it into an existing managed-service retainer as a recurring line item — e.g. \"mailbox health & storage management\" billed monthly per seat alongside patching and backup. The recurring model earns more over the client relationship and turns a reactive support ticket into a standing service the client already expects to pay for.",
  },
  {
    q: "Is storage cleanup worth offering as its own line item, or just a support-ticket freebie?",
    a: "As a line item. \"Mailbox full\" is one of the most common recurring helpdesk tickets in any M365 estate — if it's being handled ad hoc under a support retainer, the MSP is doing unbilled, repeat manual work every time it recurs. Packaging it as a proactive, scheduled service (or client self-serve tooling the MSP configures once) converts recurring unbilled labour into either a one-off project fee or predictable recurring revenue.",
  },
  {
    q: "What should an MSP charge for a mailbox cleanup project?",
    a: "Pricing varies by market, but the anchor most MSPs use is the client's own avoided cost: what they'd otherwise pay Microsoft for additional storage, or what an in-place tenant migration would cost if mailboxes stayed bloated (see how mailbox size drives migration cost). A project fee positioned against a documented storage-cost or migration-cost saving is easier to justify than a flat hourly rate.",
  },
  {
    q: "Does an MSP need per-mailbox access to deliver this, or can the client self-serve?",
    a: "Both models exist. An MSP can run cleanup directly with admin access to a client's tenant, or deploy self-serve tooling (like MailBroom for Business, which signs in via Microsoft SSO and gives every employee on the domain their own cleanup access) and bill for the setup, licensing pass-through, and ongoing oversight rather than per-mailbox labour. Self-serve tooling scales to larger client headcounts without the MSP's own technician time scaling alongside it.",
  },
  {
    q: "Can this work across every client tenant an MSP manages?",
    a: "Yes, but it's set up per client tenant, not once across an MSP's whole book of clients. MailBroom for Business is licensed per organisation — an MSP would configure Microsoft SSO sign-in separately for each client tenant it wants to offer the service to, which also means it can be introduced client by client rather than requiring a single all-or-nothing rollout.",
  },
];

const techArticleJsonLd = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "How MSPs Bill for M365 Storage Cleanup",
  description:
    "How MSPs turn Microsoft 365 mailbox storage overage into a billable service, and what makes it worth offering as a recurring line item.",
  url: "https://business.mailbroom.app/msp-storage-billing",
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

export default function MspStorageBillingPage() {
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
            <a href="/tenant-migration" className="hover:text-white transition-colors font-medium">Tenant Migration</a>
            <a href="/roi" className="hover:text-white transition-colors font-medium">Business Case</a>
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
          Storage cleanup: <span className="gold-text">unbilled ticket, or service line?</span>
        </h1>
        <p className="text-lg text-cloud leading-relaxed max-w-2xl mx-auto">
          "Mailbox full" is one of the most common recurring tickets in any M365 estate. Here's how
          MSPs turn it from repeat unbilled labour into a project fee or a recurring line item clients
          already expect to pay for.
        </p>
      </section>

      {/* ── TWO MODELS ──────────────────────────────────── */}
      <section className="section-dark py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-teal">Two billing models</p>
            <h2 className="text-4xl font-black text-cloud">Project fee, or recurring line item</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="card-glass rounded-2xl p-8">
              <h3 className="font-bold text-cloud text-lg mb-2">One-off project</h3>
              <p className="text-sm text-cloud leading-relaxed">
                A scoped cleanup engagement, priced by mailbox count or total data volume — a clean
                fit for a client who's hit a storage crisis or is heading into a tenant migration
                and needs mailboxes shrunk first.
              </p>
            </div>
            <div className="card-glass rounded-2xl p-8">
              <h3 className="font-bold text-cloud text-lg mb-2">Recurring line item</h3>
              <p className="text-sm text-cloud leading-relaxed">
                "Mailbox health & storage management" billed monthly per seat alongside patching and
                backup — earns more over the life of the client relationship, and converts a
                recurring support ticket into a standing, expected charge.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY IT'S WORTH OFFERING ─────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-gold">The case for packaging it</p>
          <h2 className="text-4xl font-black text-cloud">Unbilled work doesn&apos;t stop recurring</h2>
        </div>
        <div className="space-y-6">
          <div className="card-glass rounded-2xl p-8">
            <h3 className="font-bold text-cloud text-lg mb-2">It's already happening under the retainer</h3>
            <p className="text-sm text-cloud leading-relaxed">
              If storage tickets are handled ad hoc under a flat support retainer, that's unbilled,
              repeat manual work every time a mailbox fills up again — the ticket doesn't go away
              just because it isn't itemised.
            </p>
          </div>
          <div className="card-glass rounded-2xl p-8">
            <h3 className="font-bold text-cloud text-lg mb-2">Price against the client's own avoided cost</h3>
            <p className="text-sm text-cloud leading-relaxed">
              Anchor a project fee to what the client would otherwise pay Microsoft for additional
              storage, or what a slower, more expensive tenant migration would cost with bloated
              mailboxes — a documented saving is easier to justify than a flat hourly rate.
            </p>
          </div>
          <div className="card-glass rounded-2xl p-8">
            <h3 className="font-bold text-cloud text-lg mb-2">Self-serve tooling scales without scaling technician time</h3>
            <p className="text-sm text-cloud leading-relaxed">
              Running cleanup by hand, mailbox by mailbox, caps how many clients an MSP can service
              profitably. Deploying self-serve tooling — the MSP bills for setup, licensing
              pass-through, and oversight, not per-mailbox labour — lets headcount grow on the
              client side without technician time growing to match.
            </p>
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
          Turn a support ticket into <span className="gold-text">a service line.</span>
        </h2>
        <p className="text-cloud mb-8 max-w-xl mx-auto">
          Deploy MailBroom for Business under a client's own tenant, then bill for the setup and
          oversight — not the per-mailbox labour.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/trial"
            className="btn-gold px-10 py-5 rounded-full text-lg inline-flex items-center gap-3 justify-center"
          >
            <span>🧪</span> Start Your Free IT Assessment
          </a>
          <a
            href="/tenant-migration"
            className="btn-outline px-10 py-5 rounded-full text-lg inline-flex items-center gap-3 justify-center"
          >
            Read About Tenant Migrations
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
              <a href="/storage-costs" className="hover:text-white transition-colors">Storage Costs</a>
              <a href="/tenant-migration" className="hover:text-white transition-colors">Tenant Migration</a>
              <a href="/msp-onboarding" className="hover:text-white transition-colors">MSP Onboarding</a>
              <a href="/employee-offboarding" className="hover:text-white transition-colors">Leaver Mailboxes</a>
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
