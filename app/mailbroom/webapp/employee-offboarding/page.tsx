import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "What to Do With a Leaver's Mailbox in Microsoft 365 | AIERT Ltd",
  description:
    "An employee is leaving — what happens to their Exchange Online mailbox? Retention, licensing cost, security risk, and the fastest safe way to close it out without losing anything you're required to keep.",
  keywords: [
    "employee offboarding mailbox",
    "leaver mailbox Microsoft 365",
    "what to do with ex-employee email",
    "convert mailbox to shared mailbox",
    "Exchange Online offboarding",
    "delete employee email account",
  ],
  metadataBase: new URL("https://aiert.co.uk"),
  openGraph: {
    title: "What to Do With a Leaver's Mailbox in Microsoft 365",
    description: "Retention, cost, security risk, and the fastest safe way to close out a leaver's mailbox.",
    url: "https://aiert.co.uk/mailbroom/webapp/employee-offboarding",
    siteName: "AIERT Ltd",
    locale: "en_GB",
    type: "website",
  },
};

const faqs = [
  {
    q: "Can I just delete a leaver's mailbox straight away?",
    a: "Not usually a good idea. Deleting the account immediately can break inbound mail to that address (it bounces instead of being handled), lose records you may be required to retain, and cut off anyone mid-conversation with that person — customers included. The safer default is to convert it to a shared mailbox or forward it for a set period, then close it out properly once you're sure nothing's still needed.",
  },
  {
    q: "Do I still pay for a leaver's mailbox after they've left?",
    a: "Yes, if the licence stays assigned. A full mailbox licence continues billing until it's removed or downgraded — converting to a shared mailbox (free up to 50GB in most Microsoft 365 plans) is the usual way to stop paying for a seat nobody's using while keeping the mailbox itself accessible.",
  },
  {
    q: "How long should we keep an ex-employee's emails?",
    a: "There's no single legal answer — it depends on your sector, contract terms, and any active legal holds. What matters operationally is having a consistent policy (e.g. 90 days accessible, then archived or deleted) rather than leaving leaver mailboxes to accumulate indefinitely, which is how companies end up with dozens of forgotten, still-licensed accounts.",
  },
  {
    q: "What's the security risk of leaving old accounts around?",
    a: "An orphaned account nobody's actively monitoring is a soft target — if credentials are ever compromised, there's no one who'd notice unusual activity on it. Disabling sign-in immediately on departure (separate from what you do with the mailbox content) closes that gap without touching retention decisions.",
  },
  {
    q: "Can IT handle this at scale, or is it always a manual, per-person job?",
    a: "It's manual by default in Microsoft 365 — each mailbox gets converted, forwarded, or archived individually through the admin center or PowerShell. With enough leavers across a year, that adds up to real recurring IT time for a task that doesn't need a person doing it one at a time.",
  },
];

const techArticleJsonLd = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "What to Do With a Leaver's Mailbox in Microsoft 365",
  description:
    "What happens to an Exchange Online mailbox when an employee leaves — retention, licensing cost, security risk, and how to close it out safely.",
  url: "https://aiert.co.uk/mailbroom/webapp/employee-offboarding",
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

export default function EmployeeOffboardingPage() {
  return (
    <div className="min-h-screen hero-gradient grid-bg">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(techArticleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      {/* ── NAV ─────────────────────────────────────────── */}
      <nav className="nav-glass sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between">
          <a href="/mailbroom/webapp" className="flex items-center gap-4">
            <img src="/mailbroom-icon.png" alt="MailBroom" width={44} height={44} className="w-11 h-11 rounded-lg" />
            <span className="font-bold text-2xl tracking-tight text-cloud">
              MailBroom
            </span>
          </a>
          <div className="hidden md:flex items-center gap-10 text-base text-cloud">
            <a href="/mailbroom/webapp" className="hover:text-white transition-colors font-medium">MailBroom for Business</a>
            <a href="/mailbroom/webapp/mailbox-full" className="hover:text-white transition-colors font-medium">Mailbox Full</a>
            <a href="/mailbroom/webapp/storage-costs" className="hover:text-white transition-colors font-medium">Storage Costs</a>
          </div>
          <a href="/mailbroom/webapp/trial" className="btn-gold px-6 py-3 rounded-full text-base hidden md:block">
            Start a Trial
          </a>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="badge-live inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium mb-6">
          <span className="w-2 h-2 rounded-full bg-gold animate-pulse inline-block" />
          Exchange Online · Microsoft 365
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight mb-6 text-cloud">
          What happens to a <span className="gold-text">leaver&apos;s mailbox?</span>
        </h1>
        <p className="text-lg text-cloud leading-relaxed max-w-2xl mx-auto">
          An employee leaves, and their mailbox just... sits there. Here&apos;s what you&apos;re actually
          on the hook for — retention, licence cost, security risk — and the fastest way to close it
          out properly instead of letting it pile up.
        </p>
      </section>

      {/* ── WHAT'S ACTUALLY AT STAKE ────────────────────── */}
      <section className="section-dark py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-teal">What&apos;s actually at stake</p>
            <h2 className="text-4xl font-black text-cloud">Three separate problems, often treated as one</h2>
          </div>
          <div className="space-y-6">
            <div className="card-glass rounded-2xl p-8">
              <h3 className="font-bold text-cloud text-lg mb-2">Retention</h3>
              <p className="text-sm text-cloud leading-relaxed">
                Records you&apos;re contractually or legally required to keep don&apos;t stop being required
                just because the person who sent or received them left. Deleting on day one risks losing
                something you needed on day ninety.
              </p>
            </div>
            <div className="card-glass rounded-2xl p-8">
              <h3 className="font-bold text-cloud text-lg mb-2">Licence cost</h3>
              <p className="text-sm text-cloud leading-relaxed">
                A full mailbox licence keeps billing until someone actively downgrades or removes it.
                Leaver mailboxes are one of the most common places companies quietly overpay — nobody&apos;s
                using the seat, but nobody&apos;s cancelled it either.
              </p>
            </div>
            <div className="card-glass rounded-2xl p-8">
              <h3 className="font-bold text-cloud text-lg mb-2">Security exposure</h3>
              <p className="text-sm text-cloud leading-relaxed">
                An account nobody&apos;s watching is exactly the kind of account an attacker wants —
                unusual activity on it is far less likely to get noticed. This is independent of what
                you do with the mailbox content, and should happen immediately on departure.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW TO CLOSE IT OUT ─────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-gold">A sane default</p>
          <h2 className="text-4xl font-black text-cloud">Closing out a leaver&apos;s mailbox properly</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="card-glass rounded-2xl p-6">
            <div className="text-2xl mb-3">🔒</div>
            <h3 className="font-bold text-cloud text-sm mb-1">Disable sign-in immediately</h3>
            <p className="text-xs text-cloud leading-relaxed">Do this on the day they leave, regardless of what you decide about retention — it closes the security gap without touching the content decision.</p>
          </div>
          <div className="card-glass rounded-2xl p-6">
            <div className="text-2xl mb-3">📥</div>
            <h3 className="font-bold text-cloud text-sm mb-1">Convert to a shared mailbox</h3>
            <p className="text-xs text-cloud leading-relaxed">Free up to 50GB in most Microsoft 365 plans — colleagues can still access what they need, and you stop paying for a licensed seat nobody&apos;s using.</p>
          </div>
          <div className="card-glass rounded-2xl p-6">
            <div className="text-2xl mb-3">↪️</div>
            <h3 className="font-bold text-cloud text-sm mb-1">Forward or delegate for a fixed window</h3>
            <p className="text-xs text-cloud leading-relaxed">Route incoming mail to a manager or team inbox for a set period (30-90 days is typical) so nothing important falls through during handover.</p>
          </div>
          <div className="card-glass rounded-2xl p-6">
            <div className="text-2xl mb-3">🗓️</div>
            <h3 className="font-bold text-cloud text-sm mb-1">Set a real close-out date</h3>
            <p className="text-xs text-cloud leading-relaxed">Pick a policy (e.g. archive after 90 days, delete after a year, unless a legal hold applies) and actually apply it — the alternative is leaver mailboxes accumulating for years.</p>
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
          Stop leaver mailboxes <span className="gold-text">piling up.</span>
        </h2>
        <p className="text-cloud mb-8 max-w-xl mx-auto">
          MailBroom&apos;s Storage Cleanup applies the same bulk-cleanup tooling to any mailbox IT
          manages — including leaver accounts — instead of handling each one by hand.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/mailbroom/webapp/trial"
            className="btn-gold px-10 py-5 rounded-full text-lg inline-flex items-center gap-3 justify-center"
          >
            <span>🧪</span> Start Your Free IT Assessment
          </a>
          <a
            href="/mailbroom/webapp/storage-costs"
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
              <a href="/mailbroom/webapp" className="hover:text-white transition-colors">MailBroom for Business</a>
              <a href="/mailbroom/webapp/storage-costs" className="hover:text-white transition-colors">Storage Costs</a>
              <a href="/mailbroom/webapp/mailbox-full" className="hover:text-white transition-colors">Mailbox Full</a>
              <a href="/mailbroom/webapp/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="/mailbroom/webapp/terms" className="hover:text-white transition-colors">Terms of Use</a>
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
