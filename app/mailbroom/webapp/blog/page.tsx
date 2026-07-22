import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog – MailBroom for Business | AIERT Ltd",
  description: "Comparisons, guidance, and honest positioning for IT admins and MSPs evaluating mailbox cleanup tools for Microsoft 365 and Exchange Online.",
  metadataBase: new URL("https://business.mailbroom.app"),
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "MailBroom for Business Blog",
    description: "Comparisons, guidance, and honest positioning for IT admins and MSPs evaluating mailbox cleanup tools for Microsoft 365.",
    url: "https://business.mailbroom.app/blog",
    siteName: "AIERT Ltd",
    locale: "en_GB",
    type: "website",
    images: [{ url: "https://business.mailbroom.app/mailbroom-business-og.png", width: 1200, height: 628, alt: "MailBroom for Business — inbox cleanup for the whole company" }],
  },
};

const posts = [
  {
    slug: "hidden-drain-on-your-business",
    date: "22 July 2026",
    readTime: "8 min read",
    icon: "🕵️",
    tag: "Business Case",
    tagColor: "text-teal",
    tagBg: "bg-teal/10 border-teal/20",
    title: "The Hidden Drain on Your Business",
    excerpt: "Email clutter costs time, storage budget, and carbon footprint. How MailBroom turns your inbox from a cost centre into an efficiency engine — and what a real ROI case actually looks like.",
    author: "Martin Dobson",
  },
  {
    slug: "mailbroom-vs-clean-email",
    date: "22 July 2026",
    readTime: "7 min read",
    icon: "⚖️",
    tag: "Comparison",
    tagColor: "text-gold",
    tagBg: "bg-gold/10 border-gold/20",
    title: "MailBroom vs Clean Email: Which Is Right for Your M365 Tenant?",
    excerpt: "Clean Email is a genuine competitor — but built for individuals sharing an account, not IT admins licensing a whole company. Here's the actual difference.",
    author: "Martin Dobson",
  },
  {
    slug: "mailbroom-vs-sanebox",
    date: "22 July 2026",
    readTime: "6 min read",
    icon: "🔀",
    tag: "Comparison",
    tagColor: "text-gold",
    tagBg: "bg-gold/10 border-gold/20",
    title: "MailBroom vs SaneBox: Solving Different Problems in the Inbox",
    excerpt: "SaneBox prioritises the email arriving today. MailBroom cleans up what already piled up. An honest look at when you need one, the other, or both.",
    author: "Martin Dobson",
  },
  {
    slug: "mailbroom-vs-bitrecover",
    date: "22 July 2026",
    readTime: "6 min read",
    icon: "🔑",
    tag: "Comparison",
    tagColor: "text-gold",
    tagBg: "bg-gold/10 border-gold/20",
    title: "MailBroom vs BitRecover Office 365 Email Eraser",
    excerpt: "A genuine bulk-delete competitor for M365 — but it logs in with the account's actual email and password, not Microsoft SSO. Here's why that matters.",
    author: "Martin Dobson",
  },
  {
    slug: "mailbox-cleanup-tool-cost-comparison",
    date: "22 July 2026",
    readTime: "5 min read",
    icon: "💷",
    tag: "Pricing",
    tagColor: "text-gold",
    tagBg: "bg-gold/10 border-gold/20",
    title: "Mailbox Cleanup Tool Cost Comparison",
    excerpt: "How MailBroom's per-organisation pricing compares to Clean Email, SaneBox, and BitRecover's per-account or unpublished pricing.",
    author: "Martin Dobson",
  },
  {
    slug: "how-mailbroom-is-different",
    date: "22 July 2026",
    readTime: "5 min read",
    icon: "🧭",
    tag: "Positioning",
    tagColor: "text-teal",
    tagBg: "bg-teal/10 border-teal/20",
    title: "How MailBroom Is Different (and Who It's Not For)",
    excerpt: "Not every email tool solves the same problem. A clear, honest map of what MailBroom does — and where a team inbox, CRM, or personal email client is the better fit instead.",
    author: "Martin Dobson",
  },
];

export default function BusinessBlogPage() {
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
          <div className="hidden md:flex items-center gap-10 text-base text-cloud">
            <a href="/" className="hover:text-white transition-colors font-medium">MailBroom for Business</a>
            <a href="/roi" className="hover:text-white transition-colors font-medium">Business Case</a>
            <a href="/blog" className="text-white font-medium">Blog</a>
          </div>
          <a
            href="/trial"
            className="btn-gold px-6 py-3 rounded-full text-base hidden md:block"
          >
            Start a Trial
          </a>
        </div>
      </nav>

      {/* ── HEADER ──────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-12 text-center">
        <div className="badge-live inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium mb-6">
          <span className="w-2 h-2 rounded-full bg-gold animate-pulse inline-block" />
          MailBroom for Business
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight mb-4 text-cloud">
          The <span className="gold-text">Blog</span>
        </h1>
        <p className="text-mist text-lg leading-relaxed">
          Honest comparisons and clear positioning for IT admins and MSPs evaluating mailbox cleanup tools for Microsoft 365 and Exchange Online.
        </p>
      </section>

      {/* ── POSTS ───────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pb-24 space-y-6">
        {posts.map((post) => (
          <a
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="block card-glass rounded-2xl p-8 hover:opacity-90 transition-opacity group"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{post.icon}</span>
              <span className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-semibold ${post.tagBg} ${post.tagColor}`}>
                {post.tag}
              </span>
              <span className="text-mist text-xs ml-auto">{post.date} · {post.readTime}</span>
            </div>
            <h2 className="text-xl font-bold text-cloud mb-3 group-hover:text-gold transition-colors leading-snug">
              {post.title}
            </h2>
            <p className="text-mist text-sm leading-relaxed mb-4">{post.excerpt}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-mist">By {post.author}</span>
              <span className="text-gold text-sm font-semibold">Read more →</span>
            </div>
          </a>
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
