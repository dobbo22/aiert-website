import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Does Deleting Email Actually Reduce CO₂? | AIERT Ltd",
  description:
    "How MailBroom estimates the CO₂ impact of freeing mailbox storage, the award tiers that track it per account, and the embeddable badge that shows it on your own site.",
  keywords: [
    "email storage carbon footprint",
    "does deleting emails reduce CO2",
    "mailbox cleanup carbon savings",
    "email CO2 emissions",
    "M365 storage energy use",
    "sustainable IT email",
  ],
  metadataBase: new URL("https://business.mailbroom.app"),
  alternates: { canonical: "/carbon-savings" },
  openGraph: {
    images: [{ url: "https://business.mailbroom.app/mailbroom-business-og.png", width: 1200, height: 628, alt: "MailBroom for Business — inbox cleanup for the whole company" }],
    title: "Does Deleting Email Actually Reduce CO₂?",
    description: "How MailBroom estimates the CO₂ impact of mailbox cleanup, and the account-level tracking that comes with it.",
    url: "https://business.mailbroom.app/carbon-savings",
    siteName: "AIERT Ltd",
    locale: "en_GB",
    type: "website",
  },
};

const faqs = [
  {
    q: "Does deleting old emails actually reduce CO₂ emissions?",
    a: "Freeing mailbox storage reduces the ongoing energy cost of storing and backing up that data on Microsoft's servers — less data held means less storage capacity and associated power draw attributable to it. MailBroom estimates this at 0.233 kg CO₂ per GB of storage freed, the same factor used in the account dashboard's live CO₂ counter and the ROI calculator, treated as a reasonable estimate rather than a certified measurement of any individual customer's actual server footprint.",
  },
  {
    q: "How does MailBroom calculate CO₂ savings?",
    a: "Storage freed (in GB, from Smart Sweep deletions and unsubscribes) is multiplied by a fixed 0.233 kg CO₂/GB factor. This is the same calculation shown live on a MailBroom account's dashboard and used in the ROI calculator on this site — one consistent figure across the product, not a different number per page.",
  },
  {
    q: "What are the award tiers I see in my MailBroom account?",
    a: "Every account tracks lifetime CO₂ saved and moves through award tiers as that total grows, from Seedling up to Earth Hero — a running total tied to the account, alongside storage freed, emails deleted, and time saved.",
  },
  {
    q: "Can I show my company's CO₂ savings on our own website?",
    a: "Yes — MailBroom for Business includes an embeddable badge showing your organisation's aggregate CO₂ and storage savings, updated automatically as the totals grow. It's opt-in (an admin has to explicitly enable it) and only ever shows your organisation's aggregate totals, never individual employee data.",
  },
];

const techArticleJsonLd = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "Does Deleting Email Actually Reduce CO₂?",
  description: "How MailBroom estimates the CO₂ impact of mailbox cleanup, and the account-level tracking and embeddable badge that come with it.",
  url: "https://business.mailbroom.app/carbon-savings",
  dateModified: "2026-07-21",
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

export default function CarbonSavingsPage() {
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
            <a href="/roi" className="hover:text-white transition-colors font-medium">Business Case</a>
            <a href="/storage-costs" className="hover:text-white transition-colors font-medium">Storage Costs</a>
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
        <p className="text-xs text-mist mb-4">Last updated: 21 July 2026</p>
        <div className="badge-live inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium mb-6">
          <span className="w-2 h-2 rounded-full bg-gold animate-pulse inline-block" />
          Sustainability · Microsoft 365
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight mb-6 text-cloud">
          Storage cleanup has a <span className="gold-text">carbon story too.</span>
        </h1>
        <p className="text-lg text-cloud leading-relaxed max-w-2xl mx-auto">
          How MailBroom estimates the CO₂ impact of freeing mailbox storage, tracked as a running
          total on every account and available as a badge for your own site.
        </p>
      </section>

      {/* ── THE METHOD ──────────────────────────────────── */}
      <section className="section-dark py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-teal">The estimate</p>
            <h2 className="text-4xl font-black text-cloud">One factor, used consistently</h2>
          </div>
          <div className="card-glass rounded-2xl p-8">
            <h3 className="font-bold text-cloud text-lg mb-2">0.233 kg CO₂ per GB freed</h3>
            <p className="text-sm text-cloud leading-relaxed">
              Stored data has an ongoing energy cost — the servers and cooling that keep it
              available. MailBroom applies a fixed 0.233 kg CO₂ per GB of storage freed to estimate
              that impact, the same figure used live in a MailBroom account&apos;s CO₂ counter and in
              the <a href="/roi" className="text-gold underline hover:text-gold/80 transition-colors">ROI calculator</a> on this site.
              Treat it as a reasonable, consistently-applied estimate — not a certified measurement
              of any specific customer&apos;s actual server footprint, which depends on factors
              (data centre efficiency, redundancy, backup retention) MailBroom has no visibility into.
            </p>
          </div>
        </div>
      </section>

      {/* ── WHAT IT LOOKS LIKE IN PRODUCT ───────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-gold">In your account</p>
          <h2 className="text-4xl font-black text-cloud">Tracked automatically, shown two ways</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="card-glass rounded-2xl p-8">
            <h3 className="font-bold text-cloud text-lg mb-2">Award tiers</h3>
            <p className="text-sm text-cloud leading-relaxed">
              Every account tracks lifetime CO₂ saved alongside storage freed, emails deleted, and
              time saved — moving through award tiers as the total grows, from Seedling up to
              Earth Hero.
            </p>
          </div>
          <div className="card-glass rounded-2xl p-8">
            <h3 className="font-bold text-cloud text-lg mb-2">Embeddable company badge</h3>
            <p className="text-sm text-cloud leading-relaxed">
              An admin can opt in to a badge showing the organisation&apos;s aggregate CO₂ and
              storage savings, embeddable on your own site and updated automatically — off by
              default, and never exposes individual employee data.
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
          See your own <span className="gold-text">CO₂ and storage numbers.</span>
        </h2>
        <p className="text-cloud mb-8 max-w-xl mx-auto">
          A 30-day IT assessment costs nothing and needs no card — just your own Microsoft 365 tenant.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/trial"
            className="btn-gold px-10 py-5 rounded-full text-lg inline-flex items-center gap-3 justify-center"
          >
            <span>🧪</span> Start Your Free IT Assessment
          </a>
          <a
            href="/roi"
            className="btn-outline px-10 py-5 rounded-full text-lg inline-flex items-center gap-3 justify-center"
          >
            See the Full Business Case
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
              <a href="/roi" className="hover:text-white transition-colors">Business Case</a>
              <a href="/storage-costs" className="hover:text-white transition-colors">Storage Costs</a>
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
