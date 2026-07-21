import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Litigation Hold vs Retention Policy in Exchange Online | AIERT Ltd",
  description:
    "The difference between a retention policy and a litigation/in-place hold in Exchange Online, and how bulk mailbox cleanup tools need to work around both without breaking them.",
  keywords: [
    "Exchange Online litigation hold",
    "litigation hold vs retention policy",
    "in-place hold Microsoft 365",
    "does deleting email break legal hold",
    "M365 recoverable items purges",
  ],
  metadataBase: new URL("https://business.mailbroom.app"),
  alternates: { canonical: "/litigation-hold" },
  openGraph: {
    images: [{ url: "https://business.mailbroom.app/mailbroom-business-og.png", width: 1200, height: 628, alt: "MailBroom for Business — inbox cleanup for the whole company" }],
    title: "Litigation Hold vs Retention Policy in Exchange Online",
    description: "The difference between the two, and how bulk cleanup needs to respect both without breaking them.",
    url: "https://business.mailbroom.app/litigation-hold",
    siteName: "AIERT Ltd",
    locale: "en_GB",
    type: "website",
  },
};

const faqs = [
  {
    q: "What's the difference between a retention policy and a litigation hold in Exchange Online?",
    a: "A retention policy is a general rule an organisation sets for how long mail should be kept or when it should be deleted, applied broadly (e.g. \"keep everything for 7 years\"). A litigation hold (or in-place hold) is a specific, often legally-mandated preservation requirement placed on individual mailboxes — typically triggered by actual or anticipated litigation, an investigation, or a regulatory requirement — and it can override what a user or even an admin tries to delete.",
  },
  {
    q: "If a mailbox is on litigation hold, can a user still delete emails from it?",
    a: "A user can still delete items from their own view of the mailbox, but Exchange Online's hold mechanism preserves a copy in the Recoverable Items folder's Purges subfolder for the duration of the hold — including indefinitely, if the hold has no end date. The item disappears from the user's mailbox but isn't actually gone.",
  },
  {
    q: "Will bulk mailbox cleanup break a litigation hold?",
    a: "It shouldn't, provided the cleanup tool works within Exchange Online's built-in hold mechanism rather than trying to bypass it — deletions still route through the same Purges-subfolder preservation regardless of whether they were done one email at a time or as part of a bulk cleanup action. Always confirm this explicitly with whatever tool is doing the bulk action before running it against mailboxes you know are on hold.",
  },
  {
    q: "How does an admin know if a mailbox is on litigation hold before running a bulk cleanup?",
    a: "Litigation hold status is visible per-mailbox in the Microsoft 365 admin centre (or via PowerShell for a full tenant audit) — worth checking before any bulk action across an unfamiliar set of mailboxes, since a hold placed for a legal or regulatory reason isn't always obvious from the mailbox owner's day-to-day usage.",
  },
];

const techArticleJsonLd = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "Litigation Hold vs Retention Policy in Exchange Online",
  description: "The difference between a retention policy and a litigation/in-place hold, and how bulk mailbox cleanup needs to respect both.",
  url: "https://business.mailbroom.app/litigation-hold",
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

export default function LitigationHoldPage() {
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
            <a href="/bulk-delete-emails" className="hover:text-white transition-colors font-medium">Bulk Delete</a>
            <a href="/gdpr" className="hover:text-white transition-colors font-medium">GDPR</a>
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
          Compliance · Exchange Online
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight mb-6 text-cloud">
          Two different things, <span className="gold-text">often confused.</span>
        </h1>
        <p className="text-lg text-cloud leading-relaxed max-w-2xl mx-auto">
          Retention policy vs litigation hold, and how bulk mailbox cleanup needs to respect both
          without quietly breaking either.
        </p>
      </section>

      {/* ── THE DIFFERENCE ──────────────────────────────── */}
      <section className="section-dark py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-teal">The distinction</p>
            <h2 className="text-4xl font-black text-cloud">Policy vs hold</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="card-glass rounded-2xl p-8">
              <h3 className="font-bold text-cloud text-lg mb-2">Retention policy</h3>
              <p className="text-sm text-cloud leading-relaxed">
                A general organisation-wide rule for how long mail is kept, set as a matter of policy
                rather than in response to any specific event — e.g. "keep everything for 7 years."
              </p>
            </div>
            <div className="card-glass rounded-2xl p-8">
              <h3 className="font-bold text-cloud text-lg mb-2">Litigation / in-place hold</h3>
              <p className="text-sm text-cloud leading-relaxed">
                A specific, often legally-mandated preservation requirement on individual mailboxes —
                triggered by actual or anticipated litigation, an investigation, or a regulatory
                requirement. It can override what a user or admin tries to delete.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT SURVIVES DELETION ─────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-gold">What actually happens</p>
          <h2 className="text-4xl font-black text-cloud">Deleted, but not gone</h2>
        </div>
        <div className="card-glass rounded-2xl p-8">
          <p className="text-sm text-cloud leading-relaxed">
            A held item disappears from the mailbox owner's view when deleted, but Exchange Online
            preserves a copy in the Recoverable Items folder's Purges subfolder for the duration of
            the hold — including indefinitely, if the hold has no set end date. This applies the same
            way whether the deletion happened one email at a time or as part of a bulk cleanup
            action, provided the tool doing the bulk action works within Exchange Online's built-in
            hold mechanism rather than around it.
          </p>
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
          Bulk cleanup that <span className="gold-text">respects holds by design.</span>
        </h2>
        <p className="text-cloud mb-8 max-w-xl mx-auto">
          Smart Sweep and Storage Cleanup work within existing Exchange Online retention and hold
          settings, not around them.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/trial"
            className="btn-gold px-10 py-5 rounded-full text-lg inline-flex items-center gap-3 justify-center"
          >
            <span>🧪</span> Start Your Free IT Assessment
          </a>
          <a
            href="/gdpr"
            className="btn-outline px-10 py-5 rounded-full text-lg inline-flex items-center gap-3 justify-center"
          >
            Read About GDPR
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
              <a href="/bulk-delete-emails" className="hover:text-white transition-colors">Bulk Delete</a>
              <a href="/gdpr" className="hover:text-white transition-colors">GDPR</a>
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
