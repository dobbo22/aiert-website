import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gmail Storage Full? Clean It Up Without a Sketchy App | MailBroom",
  description:
    "Hit Gmail's storage limit? Here's what's actually filling it up, how to find the emails worth deleting, and how to do it without handing your inbox to a cloud-based cleaner.",
  keywords: ["Gmail storage full", "Gmail storage limit", "free up Gmail space", "delete large emails Gmail", "Gmail 15GB full", "clean up Gmail storage"],
  metadataBase: new URL("https://ios.mailbroom.app"),
  alternates: { canonical: "/blog/gmail-storage-full" },
  openGraph: {
    title: "Gmail Storage Full? Clean It Up Without a Sketchy App",
    description: "What's actually filling up your Gmail storage, and how to clear it without handing your inbox to a cloud-based cleaner.",
    url: "https://ios.mailbroom.app/blog/gmail-storage-full",
    siteName: "AIERT Ltd",
    locale: "en_GB",
    type: "article",
    publishedTime: "2026-09-21",
    authors: ["Martin Dobson"],
  },
};

const faqs = [
  {
    q: "What's using up my Gmail storage?",
    a: "Google's free storage is shared across Gmail, Google Drive, and Google Photos — so it's rarely just email filling it up on its own, but email is often the least-managed part of it. Within Gmail specifically, attachments are the biggest single factor: a handful of years' worth of PDF invoices, boarding passes, and photos sent as attachments can add up to gigabytes without ever feeling like \"a lot of emails.\"",
  },
  {
    q: "Does deleting emails from Gmail actually free up space immediately?",
    a: "Deleted emails sit in Trash for 30 days before being permanently removed and the space reclaimed — so if you need space back quickly, empty Trash after a bulk delete rather than assuming deletion alone did it.",
  },
  {
    q: "Is it safe to let an app delete emails in bulk automatically?",
    a: "It's safe if the app shows you what it's about to do before it does it — a preview of which senders and how many emails, with a manual confirm step — rather than deleting silently in the background. Anything that acts without a visible confirmation step is worth being cautious of, regardless of how it handles privacy otherwise.",
  },
];

const techArticleJsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: "Gmail Storage Full? Clean It Up Without a Sketchy App",
  description: "What's actually filling up your Gmail storage, and how to clear it without handing your inbox to a cloud-based cleaner.",
  url: "https://ios.mailbroom.app/blog/gmail-storage-full",
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
          <span className="text-mist text-xs">September 2026 · 6 min read</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-cloud leading-snug mb-6">
          Gmail Storage Full? Clean It Up Without a Sketchy App
        </h1>
        <p className="text-mist text-sm">By <span className="text-cloud font-semibold">Martin Dobson</span>, AIERT Ltd</p>
      </section>

      {/* ── ARTICLE BODY ────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pb-16 space-y-8">

        <div className="card-glass rounded-2xl p-8 space-y-5 text-mist leading-relaxed">
          <p>
            That &ldquo;Storage full&rdquo; warning from Google usually arrives with no explanation of what&apos;s actually taking up the space, or how to fix it without downloading the first random app that promises to help. Here&apos;s what&apos;s really going on, and how to clear it properly.
          </p>
        </div>

        {/* Section 1 */}
        <div className="card-glass rounded-2xl p-8 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">📦</span>
            <h2 className="text-xl font-bold text-cloud">What's Actually Filling It Up</h2>
          </div>
          <p className="text-mist leading-relaxed">
            Google&apos;s free storage is shared across Gmail, Drive, and Photos — so the warning rarely means &ldquo;you have too many emails,&rdquo; it means your combined usage crossed a limit, and email is often the part nobody&apos;s ever cleaned. Within Gmail itself, the biggest culprit is almost always <strong className="text-cloud">attachments</strong>: years of PDF invoices, boarding passes, and photos sent as attachments, each a few hundred KB to several MB, adding up quietly in the background.
          </p>
          <p className="text-mist leading-relaxed">
            The fix isn&apos;t deleting emails at random — it&apos;s finding the specific senders and date ranges responsible for the most space, and clearing those first.
          </p>
        </div>

        {/* Section 2 */}
        <div className="card-glass rounded-2xl p-8 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🔎</span>
            <h2 className="text-xl font-bold text-cloud">Find the Real Space-Users First</h2>
          </div>
          <p className="text-mist leading-relaxed">
            Gmail&apos;s own search supports a <code className="text-cloud bg-white/5 px-1.5 py-0.5 rounded text-sm">larger:10MB</code> style filter, which surfaces individual large emails — useful, but slow for finding patterns across thousands of messages, since it doesn&apos;t group by sender or show you which years are heaviest.
          </p>
          <p className="text-mist leading-relaxed">
            MailBroom&apos;s Storage Cleanup does this automatically: it analyses your inbox and breaks it down by age bracket (10+ years, 5–10 years, and so on) and by sender domain, so you can see instantly whether it&apos;s a decade of old newsletters, a specific retailer&apos;s receipts, or a handful of huge attachment-heavy threads eating the space — and clear the worst offenders in a couple of taps, without a full manual search.
          </p>
        </div>

        {/* Section 3 */}
        <div className="card-glass rounded-2xl p-8 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🗑️</span>
            <h2 className="text-xl font-bold text-cloud">Empty the Trash — It Doesn't Free Space Automatically</h2>
          </div>
          <p className="text-mist leading-relaxed">
            Deleted email sits in Trash for 30 days before Google permanently removes it and reclaims the space. If your storage warning is urgent, delete first, then empty Trash manually rather than waiting a month for it to clear on its own.
          </p>
        </div>

        {/* Section 4 */}
        <div className="card-glass rounded-2xl p-8 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🔒</span>
            <h2 className="text-xl font-bold text-cloud">Do It Without Handing Your Inbox to a Stranger</h2>
          </div>
          <p className="text-mist leading-relaxed">
            A quick search for &ldquo;clean up Gmail storage&rdquo; surfaces plenty of apps happy to connect to your account — but connecting means granting read access to everything inside it, and not every one of those tools processes that data on your device. Before installing anything, check its App Store privacy label and whether it shows you a preview of what it&apos;s about to delete before doing it, rather than acting silently.
          </p>
          <p className="text-mist leading-relaxed">
            MailBroom connects over IMAP directly from your iPhone to your mail server, analyses everything on-device, and always shows a preview — sender, email count, and space that would be freed — before anything is deleted.
          </p>
        </div>

        {/* Section 5 */}
        <div className="card-glass rounded-2xl p-8 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">💷</span>
            <h2 className="text-xl font-bold text-cloud">Try It Free</h2>
          </div>
          <p className="text-mist leading-relaxed">
            MailBroom includes a permanent free tier — 5 Smart Sweeps and 5 Storage Cleanups, no credit card required — enough to clear the biggest offenders in most inboxes.
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
