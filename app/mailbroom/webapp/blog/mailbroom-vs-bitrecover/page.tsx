import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MailBroom vs BitRecover Office 365 Email Eraser | AIERT Ltd",
  description: "BitRecover's Office 365 Eraser is a genuine bulk-delete competitor for M365 — but it works by logging in with the account's actual email and password, not Microsoft SSO. Here's why that matters.",
  keywords: ["MailBroom vs BitRecover", "BitRecover Office 365 Eraser alternative", "bulk delete Office 365 emails tool", "M365 bulk email deletion security"],
  metadataBase: new URL("https://business.mailbroom.app"),
  alternates: { canonical: "/blog/mailbroom-vs-bitrecover" },
  openGraph: {
    title: "MailBroom vs BitRecover Office 365 Email Eraser",
    description: "A genuine bulk-delete competitor for M365 — with a fundamentally different, credential-based access model.",
    url: "https://business.mailbroom.app/blog/mailbroom-vs-bitrecover",
    siteName: "AIERT Ltd",
    locale: "en_GB",
    type: "article",
    images: [{ url: "https://business.mailbroom.app/mailbroom-business-og.png", width: 1200, height: 628, alt: "MailBroom for Business — inbox cleanup for the whole company" }],
  },
};

const faqs = [
  {
    q: "How does BitRecover Office 365 Eraser access a mailbox?",
    a: "By entering the account's actual email address and password directly into the tool — either the individual mailbox's own credentials, or an Office 365 administrator account's credentials for bulk/admin-mode operation across multiple mailboxes. There's no OAuth or Microsoft SSO sign-in step described in BitRecover's own documentation.",
  },
  {
    q: "How does MailBroom access a mailbox instead?",
    a: "Through Microsoft Entra ID sign-in (Microsoft SSO) and the Microsoft Graph API. MailBroom never sees or stores a password — it receives a scoped, revocable access token that only grants the specific permissions needed, and that access can be revoked at any time via the organisation's own Microsoft admin settings, independent of MailBroom.",
  },
  {
    q: "Why does the credential-vs-SSO difference matter for an IT admin?",
    a: "A tool that logs in with a real password (especially an admin account's password) is a tool that now holds a credential capable of far more than mailbox cleanup, with no scoped limits and no easy revocation short of a password reset. Modern security guidance (and Microsoft's own direction with Entra ID) favours OAuth-scoped tokens specifically to avoid this exposure. It's a genuine architectural trade-off worth weighing, not a minor detail.",
  },
  {
    q: "Does BitRecover support retention policies or legal hold?",
    a: "We found no published mention of Exchange Online retention policy or litigation hold compatibility in BitRecover's own documentation. That doesn't necessarily mean it's incompatible — but for a compliance-sensitive bulk-deletion tool, the absence of any stated position is worth confirming directly with the vendor before relying on it. MailBroom explicitly states it works within existing retention policies and litigation holds rather than around them.",
  },
];

const techArticleJsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: "MailBroom vs BitRecover Office 365 Email Eraser",
  description: "A genuine bulk-delete competitor for M365 — with a fundamentally different, credential-based access model.",
  url: "https://business.mailbroom.app/blog/mailbroom-vs-bitrecover",
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

export default function MailBroomVsBitRecoverPage() {
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
            <a href="/security" className="hover:text-white transition-colors font-medium">Security</a>
          </div>
          <a href="/trial" className="btn-gold px-6 py-3 rounded-full text-base hidden md:block">Start a Trial</a>
        </div>
      </nav>

      {/* ── ARTICLE HEADER ──────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-10">
        <a href="/blog" className="inline-flex items-center gap-2 text-gold text-sm font-medium mb-8 hover:opacity-80 transition-opacity">
          ← Back to Blog
        </a>
        <div className="flex items-center gap-3 mb-6">
          <span className="inline-flex items-center px-3 py-1 rounded-full border bg-gold/10 border-gold/20 text-gold text-xs font-semibold">
            Comparison
          </span>
          <span className="text-mist text-xs">22 July 2026 · 6 min read</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-cloud leading-snug mb-6">
          MailBroom vs <span className="gold-text">BitRecover</span> Office 365 Email Eraser
        </h1>
        <p className="text-mist text-sm">By <span className="text-cloud font-semibold">Martin Dobson</span>, AIERT Ltd</p>
      </section>

      {/* ── ARTICLE BODY ────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pb-16 space-y-8">

        <div className="card-glass rounded-2xl p-8 space-y-5 text-mist leading-relaxed">
          <p>
            BitRecover&apos;s Office 365 Email Eraser is a genuine bulk-delete competitor — listed on the Microsoft Marketplace, built specifically for purging Office 365 mailboxes at scale, including across multiple accounts. On the surface, that&apos;s the same job MailBroom does.
          </p>
          <p>
            <strong className="text-cloud">The difference that actually matters is how each tool gets access to the mailbox in the first place.</strong> BitRecover&apos;s own documentation describes logging in by entering the account&apos;s email address and password directly — or an Office 365 administrator account&apos;s credentials for bulk operations. MailBroom uses Microsoft SSO and never sees a password at all.
          </p>
        </div>

        {/* Section 1 */}
        <div className="card-glass rounded-2xl p-8 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🔑</span>
            <h2 className="text-xl font-bold text-cloud">Credentials vs Scoped Tokens</h2>
          </div>
          <p className="text-mist leading-relaxed">
            When a tool asks for an email and password directly, it's holding a credential that can do anything that account can do — not just what the cleanup tool needs. If it's an admin account (as BitRecover&apos;s admin mode requires for bulk operation across multiple mailboxes), that's an admin-level credential sitting inside a third-party tool.
          </p>
          <p className="text-mist leading-relaxed">
            MailBroom instead signs in via Microsoft Entra ID and receives a scoped Microsoft Graph API access token — permissioned to exactly what mailbox cleanup requires, nothing more, and revocable at any time from the organisation&apos;s own Microsoft admin settings, independent of MailBroom itself. There&apos;s no password to leak, phish, or rotate.
          </p>
        </div>

        {/* Section 2 — comparison table */}
        <div className="card-glass rounded-2xl p-8 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">⚖️</span>
            <h2 className="text-xl font-bold text-cloud">Side by Side</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-3 pr-4 text-mist font-semibold">&nbsp;</th>
                  <th className="py-3 pr-4 text-cloud font-semibold">MailBroom for Business</th>
                  <th className="py-3 text-cloud font-semibold">BitRecover Office 365 Eraser</th>
                </tr>
              </thead>
              <tbody className="text-mist">
                <tr className="border-b border-white/5">
                  <td className="py-3 pr-4 font-medium text-cloud">Access method</td>
                  <td className="py-3 pr-4">Microsoft SSO (Entra ID), scoped Graph API token</td>
                  <td className="py-3">Direct email + password login</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-3 pr-4 font-medium text-cloud">Sees your password</td>
                  <td className="py-3 pr-4">Never</td>
                  <td className="py-3">Yes, entered directly into the tool</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-3 pr-4 font-medium text-cloud">Revocation</td>
                  <td className="py-3 pr-4">Instantly, via Microsoft admin settings</td>
                  <td className="py-3">Requires password reset</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-3 pr-4 font-medium text-cloud">Retention/legal hold</td>
                  <td className="py-3 pr-4">Explicitly supported, stated policy</td>
                  <td className="py-3">Not documented publicly</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium text-cloud">Licensing</td>
                  <td className="py-3 pr-4">Per organisation, by seat band</td>
                  <td className="py-3">Not published on-site</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section — functionality checklist */}
        <div className="card-glass rounded-2xl p-8 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">📋</span>
            <h2 className="text-xl font-bold text-cloud">Functionality Checklist</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-3 pr-4 text-cloud font-semibold">Feature</th>
                  <th className="py-3 pr-4 text-cloud font-semibold">MailBroom for Business</th>
                  <th className="py-3 text-cloud font-semibold">BitRecover Office 365 Eraser</th>
                </tr>
              </thead>
              <tbody className="text-mist">
                {[
                  ["Bulk delete by date/subject/sender filters", "✓", "✓"],
                  ["Multi-account / whole-tenant operation", "✓", "✓ — via admin mode"],
                  ["OAuth / Microsoft SSO (no password entry)", "✓", "✗ — direct email/password login"],
                  ["Scoped, admin-revocable access", "✓", "✗ — full account credential required"],
                  ["Works within retention policy / legal hold", "✓", "Not published"],
                  ["Published per-org pricing", "✓", "✗ — not disclosed"],
                  ["Shared/delegated mailbox support", "✓", "Not published"],
                ].map(([feature, mb, br]) => (
                  <tr key={feature} className="border-b border-white/5">
                    <td className="py-3 pr-4 font-medium text-cloud">{feature}</td>
                    <td className="py-3 pr-4">{mb}</td>
                    <td className="py-3">{br}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-mist text-xs leading-relaxed mt-2">
            &quot;Not published&quot; means we found no public documentation either way — not that the feature is absent.
          </p>
        </div>

        {/* Section 3 */}
        <div className="card-glass rounded-2xl p-8 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">✅</span>
            <h2 className="text-xl font-bold text-cloud">The Honest Take</h2>
          </div>
          <p className="text-mist leading-relaxed">
            BitRecover&apos;s tool clearly works for the specific job of one-off bulk purges, and its filtering options (date range, subject, sender) are comparable to what MailBroom offers. But for an IT admin thinking about ongoing, company-wide mailbox hygiene rather than a single one-time purge, the access model is the deciding factor: a tool that needs a password every time it runs is a standing security decision each time, not a one-time setup you configure once and trust.
          </p>
          <p className="text-mist leading-relaxed">
            And if this isn&apos;t a company-wide M365 deployment at all — just cleaning up your own personal inbox — neither tool is really the right fit; see <a href="https://ios.mailbroom.app" className="text-gold font-semibold hover:opacity-80 transition-opacity">MailBroom for iOS</a> on the App Store instead.
          </p>
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
            Clean up mailboxes without <span className="gold-text">handing over passwords.</span>
          </h2>
          <p className="text-mist mb-8">A 30-day evaluation, no payment details required.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/trial" className="btn-gold px-8 py-4 rounded-full font-bold text-center">Start a Trial</a>
            <a href="/security" className="btn-outline px-8 py-4 rounded-full font-semibold text-center">Read Our Security Practices</a>
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
