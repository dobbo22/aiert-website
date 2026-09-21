import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Clean Up 10,000 Promotional Emails Without a Third Party Reading Your Gmail",
  description:
    "A practical, step-by-step way to bulk-delete thousands of promotional emails from Gmail, Outlook, or iCloud — without handing a cloud service access to what's inside them.",
  keywords: ["clean up promotional emails", "bulk delete Gmail", "email cleaner privacy", "unsubscribe from newsletters", "on-device email cleanup", "Gmail declutter"],
  metadataBase: new URL("https://ios.mailbroom.app"),
  alternates: { canonical: "/blog/clean-up-promotional-emails-without-third-party-access" },
  openGraph: {
    title: "Clean Up 10,000 Promotional Emails Without a Third Party Reading Your Gmail",
    description: "A practical, step-by-step way to bulk-delete thousands of promotional emails — without a cloud service reading what's inside them.",
    url: "https://ios.mailbroom.app/blog/clean-up-promotional-emails-without-third-party-access",
    siteName: "AIERT Ltd",
    locale: "en_GB",
    type: "article",
    publishedTime: "2026-09-21",
    authors: ["Martin Dobson"],
  },
};

const faqs = [
  {
    q: "Doesn't connecting any email cleaner require giving it access to my inbox?",
    a: "Yes, in the sense that any app needs OAuth permission to read your mail via IMAP — that step is unavoidable and standard, and it's scoped and revocable at any time from your Google/Microsoft/Apple account settings. The real question isn't whether an app asks for access, it's what happens after it gets it: does your email content get uploaded to that company's servers for processing, or does it stay on your device the whole time? That's the actual privacy line, and it's worth checking before you connect anything.",
  },
  {
    q: "How do I check whether an email cleaner processes data on-device or in the cloud?",
    a: "Check its App Store privacy label first — \"Data Not Collected\" is a strong signal (and one Apple audits, not just marketing copy). Then check the app's own privacy policy for where scanning happens. If an app works instantly across every device you own without re-scanning, or offers browser-based access alongside the app, that's usually a sign processing happens on a server, not your device.",
  },
  {
    q: "What's the fastest way to identify which senders are worth bulk-deleting?",
    a: "Volume is the single best signal — the senders responsible for the most emails in your inbox are almost always the ones worth acting on first, since deleting or unsubscribing from just the top 10–20 senders by count typically clears the majority of promotional clutter. Look for a List-Unsubscribe header (a formal signal a sender is a legitimate mailing list, not spam) as a secondary confirmation before bulk-deleting.",
  },
];

const techArticleJsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: "Clean Up 10,000 Promotional Emails Without a Third Party Reading Your Gmail",
  description: "A practical, step-by-step way to bulk-delete thousands of promotional emails — without a cloud service reading what's inside them.",
  url: "https://ios.mailbroom.app/blog/clean-up-promotional-emails-without-third-party-access",
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

export default function ArticlePage() {
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
            How-To
          </span>
          <span className="text-mist text-xs">September 2026 · 7 min read</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-cloud leading-snug mb-6">
          How to Clean Up 10,000 Promotional Emails Without Giving a Third Party Access to Your Gmail
        </h1>
        <p className="text-mist text-sm">By <span className="text-cloud font-semibold">Martin Dobson</span>, AIERT Ltd</p>
      </section>

      {/* ── ARTICLE BODY ────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pb-16 space-y-8">

        <div className="card-glass rounded-2xl p-8 space-y-5 text-mist leading-relaxed">
          <p>
            If your Gmail has quietly filled up with ten years of promotions, order confirmations, and newsletters you never unsubscribed from, the instinct is to search for &ldquo;email cleaner app&rdquo; and install the first thing that looks capable. Before you do — it&apos;s worth understanding what you&apos;re actually agreeing to, because most of these tools work by scanning your inbox on <em>their</em> servers, not yours.
          </p>
          <p>
            You can clean up thousands of promotional emails just as fast without that trade-off. Here&apos;s how.
          </p>
        </div>

        {/* Section 1 */}
        <div className="card-glass rounded-2xl p-8 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🔐</span>
            <h2 className="text-xl font-bold text-cloud">Step 1: Understand What &ldquo;Access&rdquo; Actually Means</h2>
          </div>
          <p className="text-mist leading-relaxed">
            Every legitimate email cleaner needs your permission to read your inbox — that&apos;s unavoidable, and it happens the same way for every app: a scoped, revocable OAuth grant through Google, Microsoft, or Apple, not a password handed over directly. So &ldquo;does it ask for access&rdquo; is the wrong question.
          </p>
          <p className="text-mist leading-relaxed">
            The right question is: once it has that access, where does the scanning happen? Many popular cleaners — the free, browser-connected ones especially — pull your email data onto their own cloud servers to classify it, because that&apos;s what lets them offer instant cross-device sync, and in some cases, fund a free tier by monetizing what they find in your inbox. Others run the entire classification on your device and never transmit your email content anywhere.
          </p>
        </div>

        {/* Section 2 */}
        <div className="card-glass rounded-2xl p-8 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🔍</span>
            <h2 className="text-xl font-bold text-cloud">Step 2: Check Before You Connect Anything</h2>
          </div>
          <p className="text-mist leading-relaxed">
            Two checks take less than a minute and tell you almost everything:
          </p>
          <ul className="space-y-3 mt-2">
            {[
              <>Look at the app&apos;s <strong className="text-cloud">App Store privacy label</strong> — &ldquo;Data Not Collected&rdquo; is Apple-audited, not marketing copy, and it&apos;s the single strongest signal available before you install anything.</>,
              <>Read one line of the privacy policy: search it for &ldquo;sell,&rdquo; &ldquo;share,&rdquo; or &ldquo;third party.&rdquo; If your data funds a free tier by being sold to advertisers or market researchers, the policy is usually required to say so.</>,
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-mist">
                <span className="mt-0.5 flex-shrink-0 text-teal">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Section 3 */}
        <div className="card-glass rounded-2xl p-8 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🧹</span>
            <h2 className="text-xl font-bold text-cloud">Step 3: Sort by Sender Volume, Not One Email at a Time</h2>
          </div>
          <p className="text-mist leading-relaxed">
            Nobody clears 10,000 emails by deleting them individually. The fastest path is grouping by sender and acting in bulk — the ten or twenty senders responsible for the most volume in your inbox (retailers, mailing lists, notification services) are almost always where the bulk of the clutter lives.
          </p>
          <p className="text-mist leading-relaxed">
            MailBroom&apos;s Sweep Mode does exactly this: it groups your inbox by sender, ranks them by volume, and classifies each as Junk, Lists, or Keep — entirely on-device. You confirm or override each suggestion with a tap, and clear thousands of emails from the biggest senders in minutes, without your email content ever leaving your phone.
          </p>
        </div>

        {/* Section 4 */}
        <div className="card-glass rounded-2xl p-8 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🚫</span>
            <h2 className="text-xl font-bold text-cloud">Step 4: Unsubscribe Properly, Not Just Delete</h2>
          </div>
          <p className="text-mist leading-relaxed">
            Deleting without unsubscribing just means the same promotional emails pile back up next month. Look for a tool that sends a proper <strong className="text-cloud">List-Unsubscribe</strong> request (RFC 8058) directly to the mailing list&apos;s own server — not a fake &ldquo;unsubscribe&rdquo; button that just archives the email locally, or worse, confirms to a spammer that your address is active.
          </p>
        </div>

        {/* Section 5 */}
        <div className="card-glass rounded-2xl p-8 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">💷</span>
            <h2 className="text-xl font-bold text-cloud">Try It Free</h2>
          </div>
          <p className="text-mist leading-relaxed">
            MailBroom includes a permanent free tier — 5 Smart Sweeps and 5 Storage Cleanups, no credit card required — enough to make a real dent in most inboxes before deciding whether Pro is worth it.
          </p>
          <div className="mt-4 flex flex-col sm:flex-row gap-4">
            <a
              href="https://apps.apple.com/gb/app/mailbroom/id6766489663"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-gold px-6 py-3 rounded-full text-sm font-bold text-center"
            >
              Download MailBroom — Free
            </a>
            <a
              href="/"
              className="px-6 py-3 rounded-full text-sm font-semibold text-center border border-teal/30 text-teal hover:bg-teal/10 transition-colors"
            >
              Learn more →
            </a>
          </div>
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

        {/* Back link */}
        <div className="pt-4">
          <a href="/blog" className="inline-flex items-center gap-2 text-teal text-sm font-medium hover:opacity-80 transition-opacity">
            ← Back to Blog
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
