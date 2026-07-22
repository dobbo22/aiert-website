import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How MailBroom Is Different (and Who It's Not For) | AIERT Ltd",
  description: "Not every email tool solves the same problem. A clear map of what MailBroom for Business does — and where a team inbox, CRM, archiving tool, or personal cleanup app is the better fit instead.",
  keywords: ["what is MailBroom", "MailBroom alternative", "M365 mailbox cleanup tool comparison", "best tool for mailbox full", "email management tool categories"],
  metadataBase: new URL("https://business.mailbroom.app"),
  alternates: { canonical: "/blog/how-mailbroom-is-different" },
  openGraph: {
    title: "How MailBroom Is Different (and Who It's Not For)",
    description: "A clear map of what MailBroom does — and where a different category of tool is the better fit.",
    url: "https://business.mailbroom.app/blog/how-mailbroom-is-different",
    siteName: "AIERT Ltd",
    locale: "en_GB",
    type: "article",
    images: [{ url: "https://business.mailbroom.app/mailbroom-business-og.png", width: 1200, height: 628, alt: "MailBroom for Business — inbox cleanup for the whole company" }],
  },
};

const faqs = [
  {
    q: "What exactly does MailBroom for Business do?",
    a: "It's a bulk mailbox cleanup and storage-remediation tool for Microsoft 365 and Exchange Online. Smart Sweep bulk-deletes or unsubscribes from newsletters and unused mail; Storage Cleanup frees space by age bracket or sender domain; Power Search finds and bulk-acts on specific mail. It's licensed once per organisation via Microsoft SSO, and works on shared/delegated mailboxes as well as personal ones.",
  },
  {
    q: "Is MailBroom a team inbox or customer service platform?",
    a: "No. Tools like Front are built for teams to collaboratively manage shared conversations — sales@ or support@ inboxes handled by multiple people across channels. MailBroom doesn't manage conversations or route tickets; it cleans up storage and clutter. If you need shared-inbox collaboration, you need a tool in that category, not MailBroom.",
  },
  {
    q: "Is MailBroom a CRM?",
    a: "No. Tools like Zendesk Sell are sales CRMs where email tracking is one small feature of a much larger pipeline-management product. MailBroom doesn't track deals, contacts, or sales activity — it has nothing to do with sales pipeline management.",
  },
  {
    q: "Is MailBroom an email client, like Spark or Tatem?",
    a: "No. Email clients replace how you read and write email day to day — compose experience, keyboard shortcuts, priority inboxes. MailBroom doesn't replace Outlook or your existing mail client; it works through the Microsoft Graph API in the background to clean up storage. You keep using whatever client you already use.",
  },
  {
    q: "Is MailBroom an email archiving or compliance tool?",
    a: "No — if anything, it's closer to the opposite. Archiving/eDiscovery tools (like MailMeter, now part of ComplyKEY) exist to preserve every email indefinitely and immutably for legal and compliance search. MailBroom deletes and frees space. The two aren't in conflict — MailBroom explicitly works within existing retention policies and litigation holds rather than around them — but they solve opposite problems: preservation versus remediation.",
  },
];

const techArticleJsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: "How MailBroom Is Different (and Who It's Not For)",
  description: "A clear map of what MailBroom does — and where a team inbox, CRM, archiving tool, or personal cleanup app is the better fit instead.",
  url: "https://business.mailbroom.app/blog/how-mailbroom-is-different",
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

const categories = [
  {
    icon: "💬",
    name: "Shared team inboxes",
    examples: "Front and similar tools",
    job: "Collaboratively manage shared conversations (support@, sales@) across channels, with ticketing and internal notes.",
    verdict: "Not MailBroom's job. MailBroom cleans up storage; it doesn't route or manage conversations.",
  },
  {
    icon: "📈",
    name: "Sales CRMs & email productivity add-ins",
    examples: "Zendesk Sell, Mailbutler, and similar tools",
    job: "Track deals and pipeline, or add tracking/mail-merge/task-automation on top of an inbox. Email is one feature of a broader productivity or sales-engagement product.",
    verdict: "Not MailBroom's job. MailBroom has nothing to do with sales pipeline management or email tracking/engagement features.",
  },
  {
    icon: "✉️",
    name: "Email clients & organising add-ins",
    examples: "Spark, Tatem, ClearContext, and similar tools",
    job: "Replace how you read and compose email day to day, or file it into projects and tasks — priority inboxes, shortcuts, writing tools, project-based filing.",
    verdict: "Not MailBroom's job. MailBroom works in the background via Microsoft Graph API — keep using whatever client you already have. These organise; they don't delete or free storage.",
  },
  {
    icon: "🌐",
    name: "Email hosting",
    examples: "Mango Mail and similar tools",
    job: "Host your company's email in the first place — an alternative to Microsoft 365 or Google Workspace.",
    verdict: "Not MailBroom's job. MailBroom works within your existing Microsoft 365 tenant; it doesn't replace it.",
  },
  {
    icon: "🗄️",
    name: "Archiving & eDiscovery",
    examples: "MailMeter (ComplyKEY) and similar tools",
    job: "Preserve every email indefinitely and immutably for legal/compliance search.",
    verdict: "The opposite job. MailBroom deletes and frees space, working within retention policy and legal hold rather than around it.",
  },
  {
    icon: "🔀",
    name: "Inbox prioritisation",
    examples: "SaneBox and similar tools",
    job: "Filter and prioritise incoming mail so the important stuff surfaces.",
    verdict: "Adjacent, not the same. See our full comparison — MailBroom clears the backlog; these manage the inflow.",
    link: "/blog/mailbroom-vs-sanebox",
  },
  {
    icon: "⚖️",
    name: "Personal bulk cleanup",
    examples: "Clean Email, Mailstrom, AgainstData, and similar tools",
    job: "Bulk-organise, unsubscribe, and mass-delete, built around individual/shared personal accounts rather than company-wide licensing.",
    verdict: "The closest overlap. See our full comparison with Clean Email — the real difference is organisation-wide licensing vs. personal account bundles.",
    link: "/blog/mailbroom-vs-clean-email",
  },
  {
    icon: "🧨",
    name: "Enterprise bulk-delete tools",
    examples: "BitRecover Office 365 Email Eraser and similar tools",
    job: "Purge Office 365 mailboxes in bulk, including across multiple accounts — the same core job as MailBroom.",
    verdict: "A genuine competitor with a different access model. See our full comparison — the key difference is direct email/password login vs. Microsoft SSO with scoped, revocable tokens.",
    link: "/blog/mailbroom-vs-bitrecover",
  },
];

export default function HowMailBroomIsDifferentPage() {
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
            <a href="/guide" className="hover:text-white transition-colors font-medium">Guide</a>
          </div>
          <a href="/trial" className="btn-gold px-6 py-3 rounded-full text-base hidden md:block">Start a Trial</a>
        </div>
      </nav>

      {/* ── ARTICLE HEADER ──────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-10">
        <a href="/blog" className="inline-flex items-center gap-2 text-teal text-sm font-medium mb-8 hover:opacity-80 transition-opacity">
          ← Back to Blog
        </a>
        <div className="flex items-center gap-3 mb-6">
          <span className="inline-flex items-center px-3 py-1 rounded-full border bg-teal/10 border-teal/20 text-teal text-xs font-semibold">
            Positioning
          </span>
          <span className="text-mist text-xs">22 July 2026 · 5 min read</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-cloud leading-snug mb-6">
          How MailBroom Is Different <span className="gold-text">(and Who It&apos;s Not For)</span>
        </h1>
        <p className="text-mist text-sm">By <span className="text-cloud font-semibold">Martin Dobson</span>, AIERT Ltd</p>
      </section>

      {/* ── ARTICLE BODY ────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pb-16 space-y-8">

        <div className="card-glass rounded-2xl p-8 space-y-5 text-mist leading-relaxed">
          <p>
            &quot;Email tool&quot; covers a lot of ground — team inboxes, CRMs, clients, hosting, archiving, filtering, and cleanup are all different jobs that happen to touch the same inbox. Being clear about which job MailBroom does is more useful to a prospective buyer than a vague claim of being better than everything.
          </p>
          <p>
            <strong className="text-cloud">MailBroom for Business does exactly one job: bulk mailbox cleanup and storage remediation for Microsoft 365 and Exchange Online, licensed per organisation.</strong> Here&apos;s how that maps against the other categories people sometimes confuse it with.
          </p>
        </div>

        {/* Category map */}
        <div className="space-y-4">
          {categories.map((cat) => (
            <div key={cat.name} className="card-glass rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{cat.icon}</span>
                <div>
                  <h2 className="text-lg font-bold text-cloud">{cat.name}</h2>
                  <span className="text-xs text-mist">e.g. {cat.examples}</span>
                </div>
              </div>
              <p className="text-mist text-sm leading-relaxed mb-2"><strong className="text-cloud">Their job:</strong> {cat.job}</p>
              <p className="text-mist text-sm leading-relaxed">
                <strong className="text-cloud">Verdict:</strong> {cat.verdict}
                {cat.link && (
                  <>
                    {" "}
                    <a href={cat.link} className="text-gold font-semibold hover:opacity-80 transition-opacity">Read the full comparison →</a>
                  </>
                )}
              </p>
            </div>
          ))}
        </div>

        {/* What it IS */}
        <div className="card-glass rounded-2xl p-8 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🎯</span>
            <h2 className="text-xl font-bold text-cloud">What MailBroom Actually Is</h2>
          </div>
          <ul className="space-y-3 mt-2">
            {[
              "Smart Sweep — bulk-delete or unsubscribe from newsletters and unused mail, grouped and ranked by sender volume",
              "Storage Cleanup — free space by age bracket or sender domain without breaking retention policy or legal hold",
              "Power Search — find and bulk-act on specific mail across folders",
              "Licensed per organisation, not per person — one Microsoft SSO sign-in covers every employee on the company domain automatically",
              "Works on shared and delegated mailboxes (info@, sales@, a colleague's mailbox), not just the signed-in user's own",
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
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-black text-cloud mb-4">
            If your problem is <span className="gold-text">mailbox storage,</span> you're in the right place.
          </h2>
          <p className="text-mist mb-8">A 30-day evaluation, no payment details required.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/trial" className="btn-gold px-8 py-4 rounded-full font-bold text-center">Start a Trial</a>
            <a href="/guide" className="btn-outline px-8 py-4 rounded-full font-semibold text-center">See the Full Guide</a>
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
