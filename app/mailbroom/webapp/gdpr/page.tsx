import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MailBroom & GDPR: How Mailbox Access Is Scoped | AIERT Ltd",
  description:
    "How MailBroom for Business handles Microsoft 365 mailbox data under GDPR — scoped, revocable Graph API access, no password storage, and how it works within existing retention and legal hold policies.",
  keywords: [
    "MailBroom GDPR",
    "M365 mailbox cleanup GDPR compliance",
    "Microsoft Graph API data protection",
    "email cleanup tool data privacy",
    "GDPR legitimate interest email processing",
    "MSP GDPR client mailbox data",
  ],
  metadataBase: new URL("https://business.mailbroom.app"),
  alternates: { canonical: "/gdpr" },
  openGraph: {
    images: [{ url: "https://business.mailbroom.app/mailbroom-business-og.png", width: 1200, height: 628, alt: "MailBroom for Business — inbox cleanup for the whole company" }],
    title: "MailBroom & GDPR: How Mailbox Access Is Scoped",
    description: "Scoped, revocable Graph API access, no password storage, and how MailBroom works within existing retention and hold policies.",
    url: "https://business.mailbroom.app/gdpr",
    siteName: "AIERT Ltd",
    locale: "en_GB",
    type: "website",
  },
};

const faqs = [
  {
    q: "Does MailBroom store my Microsoft 365 password?",
    a: "No. Sign-in happens via Microsoft Entra ID — the same login your company already uses for Microsoft 365. MailBroom never sees or stores the password itself; it only ever receives a scoped, revocable Microsoft Graph access token, used to read and act on the mailbox on the signed-in user's behalf.",
  },
  {
    q: "Can an admin revoke MailBroom's access to company mailboxes?",
    a: "Yes, at any time, via the organisation's own Microsoft admin settings — the same place any other Entra ID-connected app's access is managed. Revoking access there immediately invalidates MailBroom's Graph API token for that user.",
  },
  {
    q: "Does mailbox cleanup respect existing data retention obligations under GDPR?",
    a: "MailBroom's Smart Sweep and Storage Cleanup work within existing Exchange Online retention policies and legal/litigation holds, not around them — held or retained items stay preserved regardless of what a user clears elsewhere in their own mailbox. This matters for GDPR specifically where retention is a legal obligation (e.g. a litigation hold), not just a company preference.",
  },
  {
    q: "What's the lawful basis for an MSP or company using MailBroom on client or employee mailboxes?",
    a: "Each employee (or, for an MSP, each client's own employees) signs in with their own Microsoft account and acts on their own mailbox directly — the company or MSP running MailBroom isn't accessing mailbox contents on their behalf without their own authentication in the loop. The underlying data is the organisation's own business correspondence, held for its own operational purposes, which is the same basis the organisation already relies on for holding that mail in Microsoft 365 at all.",
  },
  {
    q: "Does MailBroom retain a copy of mailbox content on its own servers?",
    a: "MailBroom for Business connects to a mailbox via the Microsoft Graph API to act on it directly — it does not maintain its own separate copy of mailbox content as a matter of course. Some usage data (e.g. counts of storage freed, emails deleted) is retained at the account level to power the ROI/CO₂ dashboards; see the Privacy Policy for the full breakdown of exactly what's stored.",
  },
];

const techArticleJsonLd = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "MailBroom & GDPR: How Mailbox Access Is Scoped",
  description: "How MailBroom for Business handles Microsoft 365 mailbox data under GDPR — scoped access, revocability, and retention/hold compatibility.",
  url: "https://business.mailbroom.app/gdpr",
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

export default function GdprPage() {
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
            <a href="/security" className="hover:text-white transition-colors font-medium">Security</a>
            <a href="/privacy" className="hover:text-white transition-colors font-medium">Privacy Policy</a>
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
          Data Protection · Microsoft 365
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight mb-6 text-cloud">
          Scoped access, <span className="gold-text">not a copy of your mailbox.</span>
        </h1>
        <p className="text-lg text-cloud leading-relaxed max-w-2xl mx-auto">
          How MailBroom for Business connects to Microsoft 365 mailboxes, what it can and can&apos;t
          see, and how that fits an organisation&apos;s GDPR obligations.
        </p>
      </section>

      {/* ── HOW ACCESS WORKS ────────────────────────────── */}
      <section className="section-dark py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-teal">How access works</p>
            <h2 className="text-4xl font-black text-cloud">Scoped, revocable, per-user</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="card-glass rounded-2xl p-8">
              <h3 className="font-bold text-cloud text-lg mb-2">No password ever seen</h3>
              <p className="text-sm text-cloud leading-relaxed">
                Sign-in goes through Microsoft Entra ID — the same login already used for Microsoft
                365. MailBroom receives only a scoped Graph API access token, never the password
                itself.
              </p>
            </div>
            <div className="card-glass rounded-2xl p-8">
              <h3 className="font-bold text-cloud text-lg mb-2">Revocable at any time</h3>
              <p className="text-sm text-cloud leading-relaxed">
                An admin can revoke that access instantly from the organisation&apos;s own Microsoft
                admin settings — no need to contact MailBroom to cut off access.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── RETENTION & HOLD ────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-gold">Retention obligations</p>
          <h2 className="text-4xl font-black text-cloud">Works within holds, not around them</h2>
        </div>
        <div className="card-glass rounded-2xl p-8">
          <p className="text-sm text-cloud leading-relaxed">
            Smart Sweep and Storage Cleanup respect existing Exchange Online retention policies and
            litigation/in-place holds — items covered by a hold stay preserved regardless of what a
            user clears elsewhere in their own mailbox. This is the same requirement that applies to
            any bulk mailbox action, and matters specifically under GDPR where a retention or legal
            hold obligation overrides a general right to deletion.
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
          Read the full <span className="gold-text">Privacy Policy.</span>
        </h2>
        <p className="text-cloud mb-8 max-w-xl mx-auto">
          Every data category MailBroom for Business stores, and exactly why — no summary, the
          actual policy.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/privacy"
            className="btn-gold px-10 py-5 rounded-full text-lg inline-flex items-center gap-3 justify-center"
          >
            Read the Privacy Policy
          </a>
          <a
            href="/security"
            className="btn-outline px-10 py-5 rounded-full text-lg inline-flex items-center gap-3 justify-center"
          >
            See Security Practices
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
              <a href="/security" className="hover:text-white transition-colors">Security</a>
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
