import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mailbox Cleanup Tool Cost Comparison: MailBroom vs the Alternatives | AIERT Ltd",
  description: "How MailBroom for Business's per-organization pricing compares to Clean Email, SaneBox, and BitRecover's per-account or unpublished pricing — what each actually costs to deploy company-wide.",
  keywords: ["mailbox cleanup tool pricing comparison", "MailBroom pricing", "Clean Email pricing", "SaneBox pricing", "M365 cleanup tool cost", "company-wide email cleanup cost"],
  metadataBase: new URL("https://business.mailbroom.app"),
  alternates: { canonical: "/blog/mailbox-cleanup-tool-cost-comparison" },
  openGraph: {
    title: "Mailbox Cleanup Tool Cost Comparison: MailBroom vs the Alternatives",
    description: "What each tool actually costs to deploy company-wide — per-organization vs per-account vs unpublished pricing.",
    url: "https://business.mailbroom.app/blog/mailbox-cleanup-tool-cost-comparison",
    siteName: "AIERT Ltd",
    locale: "en_GB",
    type: "article",
    images: [{ url: "https://business.mailbroom.app/mailbroom-business-og.png", width: 1200, height: 628, alt: "MailBroom for Business — inbox cleanup for the whole company" }],
  },
};

const faqs = [
  {
    q: "Why doesn't this comparison show exact competitor prices?",
    a: "Because most of them don't publish exact prices for company-wide use. Clean Email sells personal account bundles (1/5/10 accounts) and directs organizations to 'contact us for a quote.' SaneBox publishes individual-tier pricing (named Snack/Lunch/Business plans) but no per-organization rate. BitRecover doesn't publish pricing on its own site at all. MailBroom is the only one with a full published price list by seat band — that transparency is itself part of the comparison.",
  },
  {
    q: "What does 'per-organization' pricing actually save an IT admin?",
    a: "Time and predictability. With per-account or per-seat tools, someone has to track who has a license, provision new starters, and de-provision leavers. With MailBroom's per-organization licensing, one subscription covers every employee on the company's Microsoft domain automatically via SSO — there's no seat count to manage as headcount changes within a seat band.",
  },
  {
    q: "Is the cheapest tool always the best value?",
    a: "Not if it doesn't do the job you need. A personal-account tool priced for individuals looks cheap per account, but doesn't scale to company-wide deployment, shared mailbox cleanup, or centralized IT administration — the actual costs of that gap (helpdesk tickets, manual per-person setup) don't show up on the pricing page.",
  },
];

const techArticleJsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: "Mailbox Cleanup Tool Cost Comparison: MailBroom vs the Alternatives",
  description: "What each tool actually costs to deploy company-wide — per-organization vs per-account vs unpublished pricing.",
  url: "https://business.mailbroom.app/blog/mailbox-cleanup-tool-cost-comparison",
  datePublished: "2026-07-22",
  dateModified: "2026-07-22",
  author: { "@type": "Person", name: "Martin Dobson" },
  publisher: { "@type": "Organization", name: "AIERT Ltd", url: "https://aiert.co.uk" },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

const rows = [
  {
    name: "MailBroom for Business",
    model: "Per organization, by seat band",
    published: "Yes — flat monthly price, 5 published bands (1–5 through 51–100 seats), custom quote above 100",
    headcountHandling: "Automatic — one SSO sign-in covers the whole domain; no per-person provisioning",
    link: "/trial",
    linkLabel: "See current pricing →",
    highlight: true,
  },
  {
    name: "Clean Email",
    model: "Per-account bundles (1 / 5 / 10 accounts)",
    published: "~€11.99–35.99/mo per account bundle (per TheBusinessDive); organizational pricing is quote-only",
    headcountHandling: "Manual — buy and share individual account access; scored 1/5 for team fit by TheBusinessDive",
    link: "/blog/mailbroom-vs-clean-email",
    linkLabel: "Full comparison →",
  },
  {
    name: "SaneBox",
    model: "Named individual plans (Snack / Lunch / Business)",
    published: "~$4.92/user/month (per TheBusinessDive), no free plan; no per-organization rate published",
    headcountHandling: "Manual — per-account subscriptions; TheBusinessDive lists teams as \"not ideal for\"",
    link: "/blog/mailbroom-vs-sanebox",
    linkLabel: "Full comparison →",
  },
  {
    name: "BitRecover Office 365 Eraser",
    model: "Not published on-site",
    published: "No — pricing not disclosed on the vendor's own pages",
    headcountHandling: "Unclear — access is via direct account/admin credential login, not seat-based SSO",
    link: "/blog/mailbroom-vs-bitrecover",
    linkLabel: "Full comparison →",
  },
];

export default function CostComparisonPage() {
  return (
    <div className="min-h-screen hero-gradient grid-bg">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(techArticleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      {/* ── NAV ─────────────────────────────────────────── */}
      <nav className="nav-glass sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between">
          <a href="/" className="flex items-center gap-4">
            <img src="/mailbroom-icon.png" alt="MailBroom" width={44} height={44} className="w-11 h-11 rounded-lg" />
            <span className="font-bold text-2xl tracking-tight text-cloud">MailBroom</span>
          </a>
          <div className="hidden md:flex items-center gap-10 text-base text-cloud">
            <a href="/blog" className="hover:text-white transition-colors font-medium">Blog</a>
            <a href="/trial" className="hover:text-white transition-colors font-medium">Pricing</a>
          </div>
          <a href="/trial" className="btn-gold px-6 py-3 rounded-full text-base hidden md:block">Start a Trial</a>
        </div>
      </nav>

      {/* ── ARTICLE HEADER ──────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 pt-20 pb-10">
        <a href="/blog" className="inline-flex items-center gap-2 text-gold text-sm font-medium mb-8 hover:opacity-80 transition-opacity">
          ← Back to Blog
        </a>
        <div className="flex items-center gap-3 mb-6">
          <span className="inline-flex items-center px-3 py-1 rounded-full border bg-gold/10 border-gold/20 text-gold text-xs font-semibold">
            Pricing
          </span>
          <span className="text-mist text-xs">22 July 2026 · 5 min read</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-cloud leading-snug mb-6">
          Mailbox Cleanup Tool <span className="gold-text">Cost Comparison</span>
        </h1>
        <p className="text-mist text-sm">By <span className="text-cloud font-semibold">Martin Dobson</span>, AIERT Ltd</p>
      </section>

      {/* ── ARTICLE BODY ────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 pb-16 space-y-8">

        <div className="card-glass rounded-2xl p-8 space-y-5 text-mist leading-relaxed">
          <p>
            Comparing prices across mailbox cleanup tools is harder than it should be — because most of them don&apos;t publish company-wide pricing at all. This isn&apos;t a like-for-like price table so much as an honest map of <strong className="text-cloud">what pricing model each tool actually uses</strong>, since that determines the real cost of rolling it out to a whole organization far more than any single published number does.
          </p>
        </div>

        {/* Comparison table */}
        <div className="card-glass rounded-2xl p-8 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">💷</span>
            <h2 className="text-xl font-bold text-cloud">Pricing Model, Side by Side</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-3 pr-4 text-cloud font-semibold">Tool</th>
                  <th className="py-3 pr-4 text-cloud font-semibold">Pricing model</th>
                  <th className="py-3 pr-4 text-cloud font-semibold">Company-wide pricing published?</th>
                  <th className="py-3 text-cloud font-semibold">Handling headcount changes</th>
                </tr>
              </thead>
              <tbody className="text-mist">
                {rows.map((row) => (
                  <tr key={row.name} className={`border-b border-white/5 ${row.highlight ? "bg-gold/5" : ""}`}>
                    <td className={`py-3 pr-4 font-semibold ${row.highlight ? "text-gold" : "text-cloud"}`}>{row.name}</td>
                    <td className="py-3 pr-4">{row.model}</td>
                    <td className="py-3 pr-4">{row.published}</td>
                    <td className="py-3">{row.headcountHandling}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-mist text-sm leading-relaxed mt-2">
            MailBroom is the only one in this comparison with a fully public price list — see the exact monthly rates by seat band on our <a href="/trial" className="text-gold font-semibold hover:opacity-80 transition-opacity">pricing page</a>.
          </p>
        </div>

        {/* Section: real cost */}
        <div className="card-glass rounded-2xl p-8 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🧮</span>
            <h2 className="text-xl font-bold text-cloud">The Cost That Doesn&apos;t Show on a Pricing Page</h2>
          </div>
          <p className="text-mist leading-relaxed">
            A per-account tool priced for individuals can look cheaper per seat than an organization-wide license — until you account for the admin time spent tracking who has access, provisioning new starters, and de-provisioning leavers by hand. MailBroom&apos;s per-organization model removes that entirely: one Microsoft SSO sign-in, and every employee on the company domain gets access automatically, with no seat list to maintain as headcount shifts within a band.
          </p>
          <p className="text-mist leading-relaxed">
            Read the full breakdown of IT-time savings, storage-cost reduction, and leaver-mailbox risk in our <a href="/roi" className="text-gold font-semibold hover:opacity-80 transition-opacity">business case / ROI page</a>.
          </p>
        </div>

        {/* FAQ */}
        <div className="card-glass rounded-2xl p-8 space-y-4">
          <h2 className="text-xl font-bold text-cloud mb-2">Frequently Asked Questions</h2>
          {faqs.map((faq) => (
            <details key={faq.q} className="group border-b border-white/10 pb-4 last:border-0">
              <summary className="cursor-pointer list-none flex items-center justify-between text-cloud font-semibold py-2">
                {faq.q}
                <span className="text-gold ml-4 group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="text-mist text-sm leading-relaxed mt-2">{faq.a}</p>
            </details>
          ))}
        </div>

        {/* Author bio */}
        <div className="card-glass rounded-2xl p-6 flex items-center gap-4">
          <div className="nav-logo-icon w-12 h-12 rounded-lg flex items-center justify-center font-black text-sm flex-shrink-0">MD</div>
          <div>
            <div className="font-bold text-cloud">Martin Dobson</div>
            <div className="text-xs text-mist">Founder, AIERT Ltd — builds MailBroom for Business and MailBroom for iOS.</div>
          </div>
        </div>

        {/* Back link */}
        <div className="pt-2">
          <a href="/blog" className="inline-flex items-center gap-2 text-gold text-sm font-medium hover:opacity-80 transition-opacity">
            ← Back to Blog
          </a>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────── */}
      <section className="section-dark py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-black text-cloud mb-4">
            See the exact price <span className="gold-text">for your seat band.</span>
          </h2>
          <p className="text-mist mb-8">A 30-day evaluation, no payment details required.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/trial" className="btn-gold px-8 py-4 rounded-full font-bold text-center">See Pricing &amp; Start a Trial</a>
            <a href="/roi" className="btn-outline px-8 py-4 rounded-full font-semibold text-center">Read the Business Case</a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────── */}
      <footer className="footer-wrap">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="nav-logo-icon w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs">AI</div>
              <div>
                <div className="font-bold text-cloud">AIERT Ltd</div>
                <div className="text-xs text-mist">Registered in England &amp; Wales · No. 16587000</div>
              </div>
            </div>
            <div className="flex gap-6 text-sm text-mist flex-wrap justify-center">
              <a href="https://aiert.co.uk" className="hover:text-white transition-colors">AIERT Home</a>
              <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="/terms" className="hover:text-white transition-colors">Terms of Use</a>
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
