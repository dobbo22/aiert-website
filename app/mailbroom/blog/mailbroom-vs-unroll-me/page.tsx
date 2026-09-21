import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MailBroom vs Unroll.me: Privacy Comparison | MailBroom Blog",
  description:
    "Unroll.me is free because your inbox data is the product. MailBroom charges a small subscription because it isn't. Here's the real difference in how each one works.",
  keywords: ["MailBroom vs Unroll.me", "Unroll.me alternative", "Unroll.me privacy", "on-device email cleaner", "is Unroll.me safe", "private inbox cleaner"],
  metadataBase: new URL("https://ios.mailbroom.app"),
  alternates: { canonical: "/blog/mailbroom-vs-unroll-me" },
  openGraph: {
    title: "MailBroom vs Unroll.me: Privacy Comparison",
    description: "Unroll.me is free because your inbox data is the product. Here's the real difference in how each one works.",
    url: "https://ios.mailbroom.app/blog/mailbroom-vs-unroll-me",
    siteName: "AIERT Ltd",
    locale: "en_GB",
    type: "article",
    publishedTime: "2026-09-21",
    authors: ["Martin Dobson"],
  },
};

const faqs = [
  {
    q: "Is Unroll.me safe to use?",
    a: "Unroll.me itself doesn't compromise your account security — it authenticates over OAuth like any legitimate service. The concern isn't a security flaw, it's the business model: Unroll.me is owned by NielsenIQ, a publicly traded consumer-intelligence company, and its free tool is funded by parsing your receipts and order confirmations for purchase data — what you bought, where, when, and at what price — which is anonymized, aggregated, and sold to brands and market researchers. That's disclosed in its privacy policy, not hidden, but it's a real trade-off worth knowing before you connect a full inbox.",
  },
  {
    q: "Can I use Unroll.me without my purchase data being shared?",
    a: "No. As of Unroll.me's current privacy notice, there's no setting that lets you keep the inbox-cleanup tool while opting out of data extraction — agreeing to the data-sharing terms is a condition of using the free service at all. If that trade-off isn't one you want to make, the alternative is a tool that doesn't need your data to fund itself.",
  },
  {
    q: "Does MailBroom read my emails the same way Unroll.me does?",
    a: "No — the underlying mechanics are different, not just the business model. Unroll.me connects your inbox to its own cloud servers, where scanning and classification happen remotely. MailBroom connects directly from your iPhone to your mail server over IMAP, and every classification decision — what's a newsletter, what's junk, what's worth keeping — runs entirely on-device using Apple's on-device AI. Your email content is never uploaded to a MailBroom server, because MailBroom doesn't have one in that data path at all.",
  },
  {
    q: "Why does MailBroom cost money if Unroll.me is free?",
    a: "Because MailBroom's business model is the subscription, not your data. There's a permanent free tier (5 Smart Sweeps and 5 Storage Cleanups, no credit card required), and Pro unlocks unlimited use for a small monthly fee. That's the actual cost of running a service that doesn't monetize what's in your inbox.",
  },
];

const techArticleJsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: "MailBroom vs Unroll.me: Privacy Comparison",
  description: "Unroll.me is free because your inbox data is the product. MailBroom charges a small subscription because it isn't.",
  url: "https://ios.mailbroom.app/blog/mailbroom-vs-unroll-me",
  datePublished: "2026-09-21",
  dateModified: "2026-09-21",
  author: { "@type": "Person", name: "Martin Dobson" },
  publisher: { "@type": "Organization", name: "AIERT Ltd", url: "https://www.aiert.co.uk" },
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

export default function MailBroomVsUnrollMePage() {
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
          <div className="hidden md:flex items-center gap-10 text-base text-mist">
            <a href="/" className="hover:text-white transition-colors font-medium">Home</a>
            <a href="https://business.mailbroom.app" className="hover:text-white transition-colors font-medium">For Business</a>
            <a href="/blog" className="hover:text-white transition-colors font-medium">Blog</a>
            <a href="mailto:enquiries@aiert.co.uk" className="hover:text-white transition-colors font-medium">Contact</a>
          </div>
          <a href="/" className="btn-gold px-6 py-3 rounded-full text-base hidden md:block">Get MailBroom</a>
        </div>
      </nav>

      {/* ── ARTICLE HEADER ──────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-10">
        <a href="/blog" className="inline-flex items-center gap-2 text-teal text-sm font-medium mb-8 hover:opacity-80 transition-opacity">
          ← Back to Blog
        </a>
        <div className="flex items-center gap-3 mb-6">
          <span className="inline-flex items-center px-3 py-1 rounded-full border bg-teal/10 border-teal/20 text-teal text-xs font-semibold">
            Comparison
          </span>
          <span className="text-mist text-xs">September 2026 · 6 min read</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-cloud leading-snug mb-6">
          MailBroom vs <span className="gold-text">Unroll.me:</span> Privacy Comparison
        </h1>
        <p className="text-mist text-sm">By <span className="text-cloud font-semibold">Martin Dobson</span>, AIERT Ltd</p>
      </section>

      {/* ── ARTICLE BODY ────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pb-16 space-y-8">

        <div className="card-glass rounded-2xl p-8 space-y-5 text-mist leading-relaxed">
          <p>
            Unroll.me is one of the best-known names in inbox cleanup — free, simple, and it&apos;s been around long enough that most people have heard of it. It&apos;s also a useful case study in what &ldquo;free&rdquo; actually costs when the product is your email.
          </p>
          <p>
            <strong className="text-cloud">Unroll.me is owned by NielsenIQ</strong>, a publicly traded consumer-intelligence company. The free tool is funded by parsing the receipts, order confirmations, and shipping notifications that pass through your inbox — what you bought, where, when, and at what price — which is anonymized, aggregated across its user panel, and sold to brands and market researchers. This isn&apos;t a secret; it&apos;s in the privacy policy. It&apos;s just not what most people picture when they grant an app &ldquo;full access to my inbox to help me unsubscribe from newsletters.&rdquo;
          </p>
        </div>

        {/* Section 1 */}
        <div className="card-glass rounded-2xl p-8 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">☁️</span>
            <h2 className="text-xl font-bold text-cloud">Where the Scanning Actually Happens</h2>
          </div>
          <p className="text-mist leading-relaxed">
            Unroll.me works by connecting your inbox to its own cloud servers over OAuth, where your emails are scanned and processed remotely to build your &ldquo;Rollup&rdquo; digest and detect subscriptions. That remote processing is what makes the receipt-parsing business model possible in the first place — your email content has to pass through Unroll.me&apos;s servers for it to extract purchase data from it.
          </p>
          <p className="text-mist leading-relaxed">
            MailBroom connects directly from your iPhone to your mail server over IMAP. Classification — what&apos;s a newsletter, what&apos;s junk, what&apos;s worth keeping — runs entirely on-device using Apple&apos;s on-device AI. There is no MailBroom server sitting in that data path to scan, store, or monetize what&apos;s in your inbox, because the architecture doesn&apos;t route your email through one at all.
          </p>
        </div>

        {/* Section 2 — comparison table */}
        <div className="card-glass rounded-2xl p-8 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🔍</span>
            <h2 className="text-xl font-bold text-cloud">Side by Side</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-3 pr-4 text-mist font-semibold">&nbsp;</th>
                  <th className="py-3 pr-4 text-cloud font-semibold">MailBroom</th>
                  <th className="py-3 text-cloud font-semibold">Unroll.me</th>
                </tr>
              </thead>
              <tbody className="text-mist">
                <tr className="border-b border-white/5">
                  <td className="py-3 pr-4 font-medium text-cloud">Where scanning happens</td>
                  <td className="py-3 pr-4">On your device</td>
                  <td className="py-3">On Unroll.me&apos;s servers</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-3 pr-4 font-medium text-cloud">Business model</td>
                  <td className="py-3 pr-4">Subscription (Pro tier)</td>
                  <td className="py-3">Free — funded by selling anonymized purchase data</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-3 pr-4 font-medium text-cloud">Can you opt out of data sharing?</td>
                  <td className="py-3 pr-4">N/A — there&apos;s nothing to opt out of</td>
                  <td className="py-3">No, per current privacy notice — required to use the free service</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-3 pr-4 font-medium text-cloud">App Store privacy label</td>
                  <td className="py-3 pr-4">&ldquo;Data Not Collected&rdquo;</td>
                  <td className="py-3">See Unroll.me&apos;s own App Store listing for its current label</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium text-cloud">Bulk delete / unsubscribe</td>
                  <td className="py-3 pr-4">✓</td>
                  <td className="py-3">✓ (unsubscribe/rollup focus)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3 */}
        <div className="card-glass rounded-2xl p-8 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">✅</span>
            <h2 className="text-xl font-bold text-cloud">When to Choose Which</h2>
          </div>
          <ul className="space-y-3 mt-2">
            {[
              "Choose Unroll.me if a free rollup digest of newsletters is all you need, and you're comfortable with your purchase data being anonymized and sold to fund it.",
              "Choose MailBroom if you'd rather pay a small subscription than have your inbox be the product — and if you want full bulk-delete and storage cleanup, not just an unsubscribe digest.",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-mist">
                <span className="mt-0.5 flex-shrink-0 text-teal">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* FAQ */}
        <div className="card-glass rounded-2xl p-8 space-y-4">
          <h2 className="text-xl font-bold text-cloud mb-2">Frequently Asked Questions</h2>
          {faqs.map((faq) => (
            <details key={faq.q} className="group border-b border-white/10 pb-4 last:border-0">
              <summary className="cursor-pointer list-none flex items-center justify-between text-cloud font-semibold py-2">
                {faq.q}
                <span className="text-teal ml-4 group-open:rotate-45 transition-transform">+</span>
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
            <div className="text-xs text-mist">Founder, AIERT Ltd — builds MailBroom for iOS.</div>
          </div>
        </div>

        {/* Back link */}
        <div className="pt-2">
          <a href="/blog" className="inline-flex items-center gap-2 text-teal text-sm font-medium hover:opacity-80 transition-opacity">
            ← Back to Blog
          </a>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────── */}
      <section className="section-dark py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-black text-cloud mb-4">
            Clean your inbox <span className="gold-text">without selling it.</span>
          </h2>
          <p className="text-mist mb-8">Free to try — 5 Smart Sweeps and 5 Storage Cleanups, no credit card required.</p>
          <a
            href="https://apps.apple.com/gb/app/mailbroom/id6766489663"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-gold px-8 py-4 rounded-full font-bold inline-block"
          >
            Download MailBroom — Free
          </a>
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
              <a href="https://www.aiert.co.uk" className="hover:text-white transition-colors">AIERT Home</a>
              <a href="/" className="hover:text-white transition-colors">MailBroom</a>
              <a href="/blog" className="hover:text-white transition-colors">Blog</a>
              <a href="https://business.mailbroom.app" className="hover:text-white transition-colors">For Business</a>
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
