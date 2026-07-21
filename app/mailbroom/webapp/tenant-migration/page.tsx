import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "M365 Tenant-to-Tenant Migration: What Happens to Mailboxes | AIERT Ltd",
  description:
    "What actually carries over in a Microsoft 365 tenant-to-tenant migration, why mailbox size drives migration time and cost, and why cleaning up before you move is cheaper than cleaning up after.",
  keywords: [
    "M365 tenant to tenant migration",
    "Microsoft 365 tenant migration mailbox",
    "tenant to tenant migration mailbox size",
    "reduce mailbox size before migration",
    "MSP tenant migration client mailboxes",
    "Exchange Online tenant migration cleanup",
  ],
  metadataBase: new URL("https://business.mailbroom.app"),
  openGraph: {
    title: "M365 Tenant-to-Tenant Migration: What Happens to Mailboxes",
    description: "What carries over, what doesn't, and why mailbox size drives your migration cost and timeline.",
    url: "https://business.mailbroom.app/tenant-migration",
    siteName: "AIERT Ltd",
    locale: "en_GB",
    type: "website",
  },
};

const faqs = [
  {
    q: "What actually happens to mailbox data during an M365 tenant-to-tenant migration?",
    a: "Mail items, folders, and calendar/contacts generally migrate across intact when using a proper migration tool (e.g. BitTitan MigrationWiz, Quest On Demand, ShareGate). What doesn't automatically carry over: on-prem AD-synced attributes, some retention/hold configurations (these need to be recreated in the destination tenant), and anything tied to the source tenant's identity, like certain mail flow rules or Teams-linked data. Always confirm your migration tool's exact scope against your specific mailbox setup before assuming full parity.",
  },
  {
    q: "Does cleaning up a mailbox before migration actually save time or money?",
    a: "Yes, directly. Every tenant-to-tenant migration tool moves data at a rate bound by mailbox size — most are priced per seat but timed and throttled by total GB moved, and Microsoft's own throttling policies slow large mailboxes down further. A mailbox that's been in use for years without ever being cleared often has 30-50% of its size in newsletters, old attachments, and automated notifications nobody reads — none of which needs to survive the move. Clearing that first shrinks both the migration window and, for tools billed by data volume or migration duration, the invoice.",
  },
  {
    q: "Should cleanup happen before or after the migration?",
    a: "Before, in almost every case. Migrating junk mail across tenants and then deleting it afterwards means paying for the transfer of data you were always going to throw away, and it doubles the work — once to move it, once to clean it up in the new tenant. The only exception is when a retention or legal hold requires certain mail to survive the move regardless of size; that mail should stay untouched either way.",
  },
  {
    q: "Will bulk cleanup before migration break anything the migration tool depends on?",
    a: "It shouldn't, provided the cleanup tool respects retention policies and legal holds already in place, the same requirement that applies to any bulk mailbox action. MailBroom's Smart Sweep and Storage Cleanup work within existing Exchange Online retention and hold settings rather than around them, so held items are preserved regardless of what an employee or IT admin clears elsewhere in the mailbox.",
  },
  {
    q: "Can an MSP use this across every client tenant it manages, not just one?",
    a: "MailBroom for Business is licensed per organisation (per Microsoft 365 tenant) via Microsoft SSO — IT signs in once with an admin account for that tenant, and every employee on the domain gets access automatically. For an MSP managing several client tenants ahead of a migration, that means setting it up separately per client tenant being migrated, not a single MSP-wide login across all of them.",
  },
];

const techArticleJsonLd = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "M365 Tenant-to-Tenant Migration: What Happens to Mailboxes",
  description:
    "What carries over and what doesn't in a Microsoft 365 tenant-to-tenant migration, and why mailbox size drives migration time and cost.",
  url: "https://business.mailbroom.app/tenant-migration",
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

export default function TenantMigrationPage() {
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
            <a href="/storage-costs" className="hover:text-white transition-colors font-medium">Storage Costs</a>
            <a href="/roi" className="hover:text-white transition-colors font-medium">Business Case</a>
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
          Microsoft 365 · Tenant-to-Tenant Migration
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight mb-6 text-cloud">
          Migrating tenants? <span className="gold-text">Mailbox size is the bill.</span>
        </h1>
        <p className="text-lg text-cloud leading-relaxed max-w-2xl mx-auto">
          What actually carries across in an M365 tenant-to-tenant migration, what doesn&apos;t, and
          why clearing out mailboxes first — not after — is what actually shortens the project.
        </p>
      </section>

      {/* ── WHAT CARRIES OVER ──────────────────────────── */}
      <section className="section-dark py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-teal">What actually moves</p>
            <h2 className="text-4xl font-black text-cloud">What carries over, what doesn&apos;t</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="card-glass rounded-2xl p-8">
              <h3 className="font-bold text-cloud text-lg mb-2">Carries over cleanly</h3>
              <p className="text-sm text-cloud leading-relaxed">
                Mail items, folder structure, and calendar/contacts — the bulk of what a migration
                tool like BitTitan MigrationWiz, Quest On Demand, or ShareGate is built to move,
                with reasonable fidelity for most standard mailbox setups.
              </p>
            </div>
            <div className="card-glass rounded-2xl p-8">
              <h3 className="font-bold text-cloud text-lg mb-2">Needs reconfiguring</h3>
              <p className="text-sm text-cloud leading-relaxed">
                Retention policies and legal holds, on-prem AD-synced attributes, and some mail flow
                rules are tied to the source tenant&apos;s configuration, not the mailbox data itself —
                these need to be rebuilt in the destination tenant, not assumed to travel automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY SIZE MATTERS ────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-gold">The real cost driver</p>
          <h2 className="text-4xl font-black text-cloud">Migration time is mailbox size, not seat count</h2>
        </div>
        <div className="space-y-6">
          <div className="card-glass rounded-2xl p-8">
            <h3 className="font-bold text-cloud text-lg mb-2">Throttled by GB, not by user</h3>
            <p className="text-sm text-cloud leading-relaxed">
              Migration tools move data at a rate bound by total mailbox size, and Microsoft&apos;s
              own throttling policies on both source and destination tenants slow large mailboxes
              down further. A 40GB mailbox doesn&apos;t take twice as long as a 20GB one — it takes
              considerably longer, since throttling compounds as volume grows.
            </p>
          </div>
          <div className="card-glass rounded-2xl p-8">
            <h3 className="font-bold text-cloud text-lg mb-2">Most of that size is disposable</h3>
            <p className="text-sm text-cloud leading-relaxed">
              A mailbox that&apos;s never been cleaned out often carries years of newsletters,
              automated notifications, and large attachments nobody has opened in years — routinely
              30-50% of total size, none of which needs to survive a tenant move.
            </p>
          </div>
          <div className="card-glass rounded-2xl p-8">
            <h3 className="font-bold text-cloud text-lg mb-2">Clean before, not after</h3>
            <p className="text-sm text-cloud leading-relaxed">
              Migrating junk data across tenants and deleting it afterwards means paying for the
              transfer twice over — once to move it, once to clear it up again in the new tenant.
              Clearing it beforehand shrinks the migration window and, for tools priced by data
              volume or duration, the bill.
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
          Shrink mailboxes <span className="gold-text">before you move them.</span>
        </h2>
        <p className="text-cloud mb-8 max-w-xl mx-auto">
          Smart Sweep and Storage Cleanup let every employee clear their own mailbox ahead of a
          tenant migration — no per-mailbox IT time, no waiting on a migration vendor&apos;s clock.
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
              <a href="/storage-costs" className="hover:text-white transition-colors">Storage Costs</a>
              <a href="/bulk-delete-emails" className="hover:text-white transition-colors">Bulk Delete Emails</a>
              <a href="/employee-offboarding" className="hover:text-white transition-colors">Leaver Mailboxes</a>
              <a href="/msp-storage-billing" className="hover:text-white transition-colors">MSP Billing</a>
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
