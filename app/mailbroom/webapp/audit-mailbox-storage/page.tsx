import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Audit Mailbox Storage Across an M365 Tenant | AIERT Ltd",
  description:
    "The two native ways to see every mailbox's storage usage across a Microsoft 365 tenant — the admin centre report and PowerShell — and what to do once you've found the worst offenders.",
  keywords: [
    "audit mailbox storage Microsoft 365",
    "Exchange Online mailbox usage report",
    "Get-MailboxStatistics PowerShell",
    "find largest mailboxes M365 tenant",
    "M365 admin centre mailbox size report",
  ],
  metadataBase: new URL("https://business.mailbroom.app"),
  openGraph: {
    title: "Audit Mailbox Storage Across an M365 Tenant",
    description: "The two native ways to see every mailbox's storage usage, and what to do with the worst offenders.",
    url: "https://business.mailbroom.app/audit-mailbox-storage",
    siteName: "AIERT Ltd",
    locale: "en_GB",
    type: "website",
  },
};

const faqs = [
  {
    q: "What's the fastest way to see every mailbox's storage usage across a tenant?",
    a: "The Microsoft 365 admin centre's Reports section has a Mailbox usage report covering every mailbox in the tenant — storage used, item count, and last activity date, exportable to CSV. It's the fastest no-scripting option and the right starting point for most admins.",
  },
  {
    q: "How do I get mailbox sizes via PowerShell instead?",
    a: "Connect to Exchange Online PowerShell and run Get-MailboxStatistics against each mailbox (or loop it across Get-Mailbox -ResultSize Unlimited for the whole tenant) — it returns TotalItemSize, ItemCount, and last logon time per mailbox. This is the better option when you need it scripted, scheduled, or combined with other tenant data the admin centre report doesn't include.",
  },
  {
    q: "Once I know which mailboxes are the biggest, what's the fastest way to actually shrink them?",
    a: "Manually, mailbox by mailbox, is what makes cleanup slow and is why \"mailbox full\" tickets keep recurring — see the case for company-wide self-serve cleanup. The audit tells you where the problem is; the actual fix still needs to happen per mailbox, ideally by the mailbox owner rather than IT doing it by hand for each one.",
  },
  {
    q: "Does auditing mailbox storage itself require any special licence or permission?",
    a: "Viewing the Mailbox usage report in the admin centre needs a Global Reader, Reports Reader, or Global Administrator role. Get-MailboxStatistics via PowerShell needs an Exchange administrator role or equivalent — no per-mailbox licence changes required just to audit, only to act on what you find.",
  },
];

const techArticleJsonLd = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "Audit Mailbox Storage Across an M365 Tenant",
  description: "The two native ways to see every mailbox's storage usage across a Microsoft 365 tenant, and what to do with the worst offenders.",
  url: "https://business.mailbroom.app/audit-mailbox-storage",
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

export default function AuditMailboxStoragePage() {
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
            <a href="/exchange-online-quotas" className="hover:text-white transition-colors font-medium">Storage Quotas</a>
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
          Find the biggest mailboxes <span className="gold-text">before they become tickets.</span>
        </h1>
        <p className="text-lg text-cloud leading-relaxed max-w-2xl mx-auto">
          Two native ways to see every mailbox's storage usage across a tenant — no third-party
          tool needed just to find the problem, only to fix it.
        </p>
      </section>

      {/* ── TWO METHODS ──────────────────────────────────── */}
      <section className="section-dark py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-teal">Two native methods</p>
            <h2 className="text-4xl font-black text-cloud">Admin centre report, or PowerShell</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="card-glass rounded-2xl p-8">
              <h3 className="font-bold text-cloud text-lg mb-2">Admin centre: Mailbox usage report</h3>
              <p className="text-sm text-cloud leading-relaxed">
                Under Reports in the Microsoft 365 admin centre — storage used, item count, and last
                activity date for every mailbox in the tenant, exportable to CSV. No scripting
                required; the fastest starting point for most admins.
              </p>
            </div>
            <div className="card-glass rounded-2xl p-8">
              <h3 className="font-bold text-cloud text-lg mb-2">PowerShell: Get-MailboxStatistics</h3>
              <p className="text-sm text-cloud leading-relaxed">
                Run against Exchange Online PowerShell, looped across every mailbox
                (Get-Mailbox -ResultSize Unlimited) for a tenant-wide sweep. Returns TotalItemSize,
                ItemCount, and last logon time — better when you need it scripted, scheduled, or
                combined with other tenant data.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── AFTER THE AUDIT ─────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-gold">After the audit</p>
          <h2 className="text-4xl font-black text-cloud">Knowing isn&apos;t the same as fixing</h2>
        </div>
        <div className="card-glass rounded-2xl p-8">
          <p className="text-sm text-cloud leading-relaxed">
            An audit tells you which mailboxes are the problem — it doesn&apos;t shrink them. Doing
            that manually, mailbox by mailbox, is what makes cleanup slow and is why &ldquo;mailbox
            full&rdquo; tickets keep recurring even after an audit identifies the worst offenders.
            Company-wide self-serve tooling lets each mailbox owner clear their own mailbox directly,
            rather than IT working through the audit&apos;s list by hand.
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
          Found the problem mailboxes? <span className="gold-text">Now fix them.</span>
        </h2>
        <p className="text-cloud mb-8 max-w-xl mx-auto">
          Smart Sweep and Storage Cleanup let every employee clear their own mailbox — no
          per-mailbox IT time working down the audit list.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/trial"
            className="btn-gold px-10 py-5 rounded-full text-lg inline-flex items-center gap-3 justify-center"
          >
            <span>🧪</span> Start Your Free IT Assessment
          </a>
          <a
            href="/mailbox-full"
            className="btn-outline px-10 py-5 rounded-full text-lg inline-flex items-center gap-3 justify-center"
          >
            Read About Mailbox Full
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
              <a href="/exchange-online-quotas" className="hover:text-white transition-colors">Storage Quotas</a>
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
