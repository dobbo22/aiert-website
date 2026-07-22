import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your 50,000 Emails Are Costing the Planet – MailBroom Blog",
  description:
    "Every email you store has a measurable carbon footprint. We looked at the numbers — and built something that cleans your inbox without making things worse.",
  metadataBase: new URL("https://ios.mailbroom.app"),
  alternates: { canonical: "/blog/your-emails-are-costing-the-planet" },
  openGraph: {
    title: "Your 50,000 Emails Are Costing the Planet. Here's the Cleaner That Fixes Both.",
    description:
      "Every email you store has a measurable carbon footprint. We looked at the numbers — and built something that cleans your inbox without making things worse.",
    url: "https://ios.mailbroom.app/blog/your-emails-are-costing-the-planet",
    siteName: "AIERT Ltd",
    locale: "en_GB",
    type: "article",
    publishedTime: "2026-06-01",
    authors: ["Martin Dobson"],
  },
};

export default function ArticlePage() {
  return (
    <div className="min-h-screen hero-gradient grid-bg">

      {/* ── NAV ─────────────────────────────────────────── */}
      <nav className="nav-glass sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between">
          <a href="/" className="flex items-center gap-4">
            <img src="/mailbroom-icon.png" alt="MailBroom" width={44} height={44} className="w-11 h-11 rounded-lg" />
            <span className="font-bold text-2xl tracking-tight text-cloud">
              MailBroom
            </span>
          </a>
          <div className="hidden md:flex items-center gap-10 text-base text-mist">
            <a href="/" className="hover:text-white transition-colors font-medium">Home</a>
            <a href="https://business.mailbroom.app" className="hover:text-white transition-colors font-medium">For Business</a>
            <a href="/blog" className="hover:text-white transition-colors font-medium">Blog</a>
            <a href="/#contact" className="hover:text-white transition-colors font-medium">Contact</a>
          </div>
          <a
            href="https://sharequest.co.uk"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-gold px-6 py-3 rounded-full text-base hidden md:block"
          >
            Visit ShareQuest
          </a>
        </div>
      </nav>

      {/* ── ARTICLE HEADER ──────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-10">
        <a href="/blog" className="inline-flex items-center gap-2 text-teal text-sm font-medium mb-8 hover:opacity-80 transition-opacity">
          ← Back to Blog
        </a>
        <div className="flex items-center gap-3 mb-6">
          <span className="inline-flex items-center px-3 py-1 rounded-full border bg-teal/10 border-teal/20 text-teal text-xs font-semibold">
            Environment
          </span>
          <span className="text-mist text-xs">June 2026 · 6 min read</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-cloud leading-snug mb-6">
          Your 50,000 Emails Are Costing the Planet. Here&apos;s the Cleaner That Fixes Both.
        </h1>
        <p className="text-mist text-sm">By <span className="text-cloud font-semibold">Martin Dobson</span>, AIERT Ltd</p>
      </section>

      {/* ── ARTICLE BODY ────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pb-24 space-y-8">

        <div className="card-glass rounded-2xl p-8 space-y-5 text-mist leading-relaxed">
          <p>
            I had 50,000 emails in my inbox. Not because I&apos;m disorganised — I&apos;d just never really thought about deleting them. They were just <em>there</em>, sitting quietly on a server somewhere, not hurting anyone.
          </p>
          <p>
            Except they were. Every email we send, receive, and — crucially — <strong className="text-cloud">store</strong> has a real, measurable carbon footprint. I only started thinking about this properly when I added it up.
          </p>
        </div>

        {/* Section 1 */}
        <div className="card-glass rounded-2xl p-8 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">📊</span>
            <h2 className="text-xl font-bold text-cloud">The Real Cost of "Just Storing" Emails</h2>
          </div>
          <p className="text-mist leading-relaxed">
            A standard email generates around <strong className="text-cloud">4 grams of CO₂e</strong>. One with an attachment? Up to <strong className="text-cloud">50 grams</strong>. To put that in perspective: sending a 1MB photo to ten people is roughly equivalent to driving 500 metres by car.
          </p>
          <p className="text-mist leading-relaxed">
            Scale that up globally. In 2018, 281 billion emails were sent daily — generating roughly <strong className="text-cloud">410 million tonnes of CO₂e annually</strong>, comparable to half of commercial aviation&apos;s total emissions. By 2025, that figure had risen to 376 billion emails per day.
          </p>
          <p className="text-mist leading-relaxed">
            The storage problem compounds it further. A 1,000-employee company sending 40 internal emails a day generates approximately <strong className="text-cloud">58 metric tonnes of CO₂ per year</strong> — equivalent to 13 cars on the road annually. And that&apos;s just from internal email traffic.
          </p>
          <div className="grid grid-cols-3 gap-4 mt-4">
            {[
              { value: "4g", label: "CO₂e per standard email" },
              { value: "50g", label: "CO₂e per email with attachment" },
              { value: "376bn", label: "emails sent daily in 2025" },
            ].map((stat) => (
              <div key={stat.label} className="stat-teal rounded-xl p-4 text-center">
                <div className="text-teal font-black text-xl">{stat.value}</div>
                <div className="text-mist text-xs mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2 */}
        <div className="card-glass rounded-2xl p-8 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">⚠️</span>
            <h2 className="text-xl font-bold text-cloud">Cloud-Based Cleaners Are Part of the Problem</h2>
          </div>
          <p className="text-mist leading-relaxed">
            The obvious solution is an email cleaner. But most of them — the ones that work in the cloud, syncing your inbox to their servers for processing — <strong className="text-cloud">paradoxically make things worse</strong>.
          </p>
          <p className="text-mist leading-relaxed">
            Research from UC Riverside and Qualcomm found that on-device AI processing reduces emissions by <strong className="text-cloud">75–95% compared to cloud alternatives</strong>. When a cleaner uploads your email data to process it remotely, it&apos;s burning server energy on top of the energy your emails already consume.
          </p>
          <p className="text-mist leading-relaxed">
            Data centres currently account for around <strong className="text-cloud">0.3% of global emissions</strong> — and that share is growing. Traditional email cleaners address clutter while ignoring their own carbon impact.
          </p>
        </div>

        {/* Section 3 */}
        <div className="card-glass rounded-2xl p-8 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">📱</span>
            <h2 className="text-xl font-bold text-cloud">Most &apos;Green&apos; Cleaners Miss the Point</h2>
          </div>
          <p className="text-mist leading-relaxed">
            I looked at what was available. Most email management apps fall into one of two camps: they&apos;re either cloud-based (and therefore energy-hungry by design), or they&apos;re basic tools that just help you manually sort things. Neither solves the problem properly.
          </p>
          <p className="text-mist leading-relaxed">
            What I wanted was something that could intelligently identify what to delete — newsletters, promotions, duplicates, old receipts — and actually execute the cleanup at scale, all without ever sending my email data to a third-party server.
          </p>
          <p className="text-mist leading-relaxed">
            That&apos;s why we built MailBroom.
          </p>
        </div>

        {/* Section 4 */}
        <div className="card-glass rounded-2xl p-8 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🧹</span>
            <h2 className="text-xl font-bold text-cloud">MailBroom: On-Device AI, Real Results</h2>
          </div>
          <p className="text-mist leading-relaxed">
            MailBroom connects directly from your iPhone or iPad to your mail server — Gmail, Outlook, iCloud, BT, or any IMAP provider — over an encrypted connection. Your emails are classified entirely on your device using a five-layer AI pipeline. Nothing is sent to our servers. Nothing is processed in the cloud.
          </p>
          <ul className="space-y-3 mt-2">
            {[
              "Smart Sweep — groups similar senders (newsletters, retail, notifications) and lets you delete them in bulk with a single tap",
              "Smart Unsubscribe — sends RFC 8058-compliant opt-out requests directly from your device to mailing list servers",
              "Smart Organise — creates folders on your mail server and files emails automatically using on-device rules",
              "Storage Cleanup — surfaces the emails consuming the most space, sorted by age and domain",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-mist">
                <span className="mt-0.5 flex-shrink-0 text-teal">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-mist leading-relaxed mt-2">
            One full cleanup of a 50,000-email inbox saves approximately <strong className="text-cloud">200kg of CO₂</strong> over the lifetime of those emails in cloud storage. That&apos;s the equivalent of not driving for two weeks.
          </p>
        </div>

        {/* Section 5 */}
        <div className="card-glass rounded-2xl p-8 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">💷</span>
            <h2 className="text-xl font-bold text-cloud">Try It Free — No Credit Card Required</h2>
          </div>
          <p className="text-mist leading-relaxed">
            MailBroom includes a permanent free tier: 5 Smart Sweeps and 5 Storage Cleanups, no credit card, no time limit. That&apos;s enough to make a meaningful dent in most inboxes.
          </p>
          <p className="text-mist leading-relaxed">
            For unlimited access, MailBroom Pro is available at an introductory price of <strong className="text-cloud">£0.99/month</strong>, rising to £1.99/month after the introductory period. No lock-in — cancel any time through your Apple account.
          </p>
          <div className="mt-4 flex flex-col sm:flex-row gap-4">
            <a
              href="https://apps.apple.com/app/mailbroom/id6744036741"
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
              <div className="nav-logo-icon w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs">
                AI
              </div>
              <div>
                <div className="font-bold text-cloud">AIERT Ltd</div>
                <div className="text-xs text-mist">Registered in England &amp; Wales · No. 16587000</div>
              </div>
            </div>
            <div className="flex gap-6 text-sm text-mist flex-wrap justify-center">
              <a href="https://aiert.co.uk" className="hover:text-white transition-colors">AIERT Home</a>
              <a href="/" className="hover:text-white transition-colors">MailBroom</a>
              <a href="/blog" className="hover:text-white transition-colors">Blog</a>
              <a href="https://sharequest.co.uk" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">ShareQuest</a>
              <a href="/#contact" className="hover:text-white transition-colors">Contact</a>
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
