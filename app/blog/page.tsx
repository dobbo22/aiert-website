import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog – AIERT Ltd",
  description: "Thoughts on email, AI, privacy, and the environment from the team behind MailBroom.",
  metadataBase: new URL("https://aiert.co.uk"),
};

const posts = [
  {
    slug: "your-emails-are-costing-the-planet",
    date: "June 2026",
    readTime: "6 min read",
    icon: "🌍",
    tag: "Environment",
    tagColor: "text-teal",
    tagBg: "bg-teal/10 border-teal/20",
    title: "Your 50,000 Emails Are Costing the Planet. Here's the Cleaner That Fixes Both.",
    excerpt:
      "Every email you store has a measurable carbon footprint. We looked at the numbers — and built something that cleans your inbox without making things worse.",
    author: "Martin Dobson",
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen hero-gradient grid-bg">

      {/* ── NAV ─────────────────────────────────────────── */}
      <nav className="nav-glass sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between">
          <a href="/" className="flex items-center gap-4">
            <div className="nav-logo-icon w-11 h-11 rounded-lg flex items-center justify-center font-black text-base">
              AI
            </div>
            <span className="font-bold text-2xl tracking-tight text-cloud">
              AIERT<span className="text-sm font-normal ml-1 text-mist">Ltd</span>
            </span>
          </a>
          <div className="hidden md:flex items-center gap-10 text-base text-mist">
            <a href="/" className="hover:text-white transition-colors font-medium">Home</a>
            <a href="/mailbroom" className="hover:text-white transition-colors font-medium">MailBroom</a>
            <a href="/blog" className="text-white font-medium">Blog</a>
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

      {/* ── HEADER ──────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 pt-20 pb-12 text-center">
        <div className="text-5xl mb-6">✍️</div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-cloud mb-4">
          Blog
        </h1>
        <p className="text-mist text-lg leading-relaxed">
          Thoughts on email, AI, privacy, and the environment from the team behind MailBroom.
        </p>
      </section>

      {/* ── POSTS ───────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 pb-24 space-y-6">
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
            <h2 className="text-xl font-bold text-cloud mb-3 group-hover:text-teal transition-colors leading-snug">
              {post.title}
            </h2>
            <p className="text-mist text-sm leading-relaxed mb-4">{post.excerpt}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-mist">By {post.author}</span>
              <span className="text-teal text-sm font-semibold">Read more →</span>
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
              <a href="/" className="hover:text-white transition-colors">AIERT Home</a>
              <a href="/mailbroom" className="hover:text-white transition-colors">MailBroom</a>
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
