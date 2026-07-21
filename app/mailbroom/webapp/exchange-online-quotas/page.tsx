import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Exchange Online Storage Quotas by Plan, Explained | AIERT Ltd",
  description:
    "How much mailbox storage each Microsoft 365 / Exchange Online plan includes, what changed on 1 July 2026, and what happens once a mailbox is over its plan's limit.",
  keywords: [
    "Exchange Online storage limits",
    "Microsoft 365 mailbox size by plan",
    "Exchange Online Plan 1 vs Plan 2 storage",
    "M365 mailbox quota GB",
    "how much storage does Microsoft 365 give",
  ],
  metadataBase: new URL("https://business.mailbroom.app"),
  alternates: { canonical: "/exchange-online-quotas" },
  openGraph: {
    images: [{ url: "https://business.mailbroom.app/mailbroom-business-og.png", width: 1200, height: 628, alt: "MailBroom for Business — inbox cleanup for the whole company" }],
    title: "Exchange Online Storage Quotas by Plan, Explained",
    description: "How much mailbox storage each M365 plan includes, and what happens once a mailbox is over the limit.",
    url: "https://business.mailbroom.app/exchange-online-quotas",
    siteName: "AIERT Ltd",
    locale: "en_GB",
    type: "website",
  },
};

const faqs = [
  {
    q: "How much mailbox storage does Microsoft 365 actually include?",
    a: "It depends on the plan, and it changed recently: Microsoft increased the standard per-mailbox quota from 50GB to 100GB across Microsoft 365 Business plans, effective 1 July 2026. Enterprise plans (E3/E5) have historically included larger baseline quotas than Business plans — always check the current admin centre for your specific tenant's exact figure, since Microsoft has changed these limits before and can again.",
  },
  {
    q: "What happens once a mailbox goes over its plan's included storage?",
    a: "Microsoft sells extra storage as a paid add-on, commonly listed around $0.20/GB/month, though the exact rate isn't fixed globally and varies by region, currency, and agreement type. For larger overflow, Exchange Online Archiving offers an auto-expanding archive up to 1.5TB (a flat add-on fee, included on some higher plans), with anything beyond that billed per-GB as a consumption feature.",
  },
  {
    q: "Does a mailbox need to be near its storage limit to feel slow?",
    a: "No — Microsoft's own documentation describes Outlook performance pauses appearing once a local data file (OST) passes around 10GB, increasing in frequency from 25GB, independent of the mailbox's actual storage quota. A mailbox well within its plan's limit can still be the one generating \"Outlook is slow\" tickets.",
  },
  {
    q: "Is it cheaper to buy more storage or clean up the mailbox?",
    a: "Buying more storage is a recurring monthly cost that compounds across every mailbox that needs it; cleaning up a mailbox is a one-off action with no ongoing charge. For a mailbox with years of unread newsletters and old attachments, cleanup usually resolves the immediate quota pressure without needing the add-on at all — see the full cost breakdown on the storage costs page.",
  },
];

const techArticleJsonLd = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "Exchange Online Storage Quotas by Plan, Explained",
  description: "How much mailbox storage each Microsoft 365 plan includes, what changed on 1 July 2026, and what happens once a mailbox is over the limit.",
  url: "https://business.mailbroom.app/exchange-online-quotas",
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

export default function ExchangeOnlineQuotasPage() {
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
            <a href="/mailbox-full" className="hover:text-white transition-colors font-medium">Mailbox Full</a>
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
        <div className="badge-live inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium mb-6">
          <span className="w-2 h-2 rounded-full bg-gold animate-pulse inline-block" />
          Microsoft 365 · Exchange Online
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight mb-6 text-cloud">
          How much storage <span className="gold-text">do you actually get?</span>
        </h1>
        <p className="text-lg text-cloud leading-relaxed max-w-2xl mx-auto">
          Mailbox quotas by plan, what changed in mid-2026, and what it costs once a mailbox goes
          over the limit.
        </p>
      </section>

      {/* ── THE QUOTAS ──────────────────────────────────── */}
      <section className="section-dark py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-teal">What changed</p>
            <h2 className="text-4xl font-black text-cloud">50GB → 100GB, from 1 July 2026</h2>
          </div>
          <div className="card-glass rounded-2xl p-8">
            <p className="text-sm text-cloud leading-relaxed">
              Microsoft increased the standard per-mailbox storage quota from 50GB to 100GB across
              Microsoft 365 Business plans, effective 1 July 2026. Enterprise plans have historically
              carried different baseline quotas than Business plans. Since Microsoft has changed
              these numbers before, always confirm the current figure for your specific tenant in
              the Microsoft 365 admin centre rather than relying on a fixed number from any one page.
            </p>
          </div>
        </div>
      </section>

      {/* ── OVER THE LIMIT ──────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-gold">Over the limit</p>
          <h2 className="text-4xl font-black text-cloud">Two ways to deal with it</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="card-glass rounded-2xl p-6">
            <h3 className="font-bold text-cloud text-sm mb-1">Pay for more storage</h3>
            <p className="text-xs text-cloud leading-relaxed">
              A recurring monthly add-on, commonly around $0.20/GB/month, plus an auto-expanding
              archive option (up to 1.5TB) for larger overflow — a cost that compounds across every
              mailbox that needs it.
            </p>
          </div>
          <div className="card-glass rounded-2xl p-6">
            <h3 className="font-bold text-cloud text-sm mb-1">Clean the mailbox up</h3>
            <p className="text-xs text-cloud leading-relaxed">
              A one-off action with no recurring charge — for a mailbox with years of unread
              newsletters and old attachments, this usually resolves quota pressure without ever
              needing the paid add-on.
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
          Stay under quota <span className="gold-text">without paying for more.</span>
        </h2>
        <p className="text-cloud mb-8 max-w-xl mx-auto">
          Smart Sweep and Storage Cleanup let every employee clear their own mailbox — no per-mailbox
          IT time, no storage add-on invoice.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/trial"
            className="btn-gold px-10 py-5 rounded-full text-lg inline-flex items-center gap-3 justify-center"
          >
            <span>🧪</span> Start Your Free IT Assessment
          </a>
          <a
            href="/storage-costs"
            className="btn-outline px-10 py-5 rounded-full text-lg inline-flex items-center gap-3 justify-center"
          >
            See Storage Cost Breakdown
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
              <a href="/mailbox-full" className="hover:text-white transition-colors">Mailbox Full</a>
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
