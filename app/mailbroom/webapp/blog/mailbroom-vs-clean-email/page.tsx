import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MailBroom vs Clean Email: Which Is Right for Your M365 Tenant? | AIERT Ltd",
  description: "Clean Email is a genuine competitor for bulk inbox cleanup — but built for individuals sharing an account, not IT admins licensing a company. Here's the real difference.",
  keywords: ["MailBroom vs Clean Email", "Clean Email alternative", "M365 mailbox cleanup tool", "bulk email cleanup for business", "Clean Email for business"],
  metadataBase: new URL("https://business.mailbroom.app"),
  alternates: { canonical: "/blog/mailbroom-vs-clean-email" },
  openGraph: {
    title: "MailBroom vs Clean Email: Which Is Right for Your M365 Tenant?",
    description: "A genuine competitor, built for a different buyer — individuals sharing an account, not IT admins licensing a company.",
    url: "https://business.mailbroom.app/blog/mailbroom-vs-clean-email",
    siteName: "AIERT Ltd",
    locale: "en_GB",
    type: "article",
    images: [{ url: "https://business.mailbroom.app/mailbroom-business-og.png", width: 1200, height: 628, alt: "MailBroom for Business — inbox cleanup for the whole company" }],
  },
};

const faqs = [
  {
    q: "Is Clean Email a real alternative to MailBroom for Business?",
    a: "For bulk organising and unsubscribing, yes — the core cleanup mechanics are comparable. The difference is who each is built for: Clean Email's pricing is structured around buying a bundle of accounts (1, 5, or 10) to share with people you know personally, like family. MailBroom is licensed once per organisation, with every employee on the company's Microsoft domain getting automatic access via Microsoft SSO — no shared logins, no per-person account purchase.",
  },
  {
    q: "Does Clean Email support shared or delegated Microsoft 365 mailboxes?",
    a: "We found no published documentation on shared or delegated mailbox support for Clean Email. MailBroom explicitly supports this — an admin can enable access to a shared mailbox like info@ or sales@, or a colleague's delegated mailbox, the same way as a personal one, once that's turned on for the organisation.",
  },
  {
    q: "What does Clean Email cost for a whole company?",
    a: "Clean Email doesn't publish per-organisation pricing on its own site — its plans page is structured around personal account bundles, with a 'contact us for a quote' path for bulk/organisational needs. Independent review site TheBusinessDive lists Clean Email's account-bundle pricing at roughly €11.99/month for 1 account, €23.99/month for 5, and €35.99/month for 10, with monthly billing — and that same review scores its team/collaboration fit just 1 out of 5, noting it 'was designed for individuals, not teams.' MailBroom publishes flat monthly pricing by seat band (1–5, 6–10, 11–25, 26–50, 51–100 seats) built specifically for company-wide use, with custom quoting only above 100 seats.",
  },
  {
    q: "Does Clean Email work with more email providers than MailBroom?",
    a: "Within one product, yes: Clean Email connects to Gmail, Yahoo, AOL, and other providers as well as Microsoft 365. MailBroom for Business is deliberately M365/Exchange Online-only — that focus is what lets it plug directly into Microsoft Graph API and Entra ID for one-click company-wide SSO deployment, and M365/Exchange Online is what the large majority of businesses actually run, so this is rarely a real gap in practice. If your organisation genuinely needs other providers too, the wider MailBroom family covers that ground via a second product: MailBroom for iOS connects over IMAP to almost any mail server, including Gmail and Yahoo — just as a personal-inbox app rather than a company-wide deployment.",
  },
];

const techArticleJsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: "MailBroom vs Clean Email: Which Is Right for Your M365 Tenant?",
  description: "A genuine competitor for bulk inbox cleanup, built for a different buyer — individuals sharing an account, not IT admins licensing a company.",
  url: "https://business.mailbroom.app/blog/mailbroom-vs-clean-email",
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

export default function MailBroomVsCleanEmailPage() {
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
            <a href="/roi" className="hover:text-white transition-colors font-medium">Business Case</a>
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
          <span className="text-mist text-xs">22 July 2026 · 7 min read</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-cloud leading-snug mb-6">
          MailBroom vs <span className="gold-text">Clean Email:</span> Which Is Right for Your M365 Tenant?
        </h1>
        <p className="text-mist text-sm">By <span className="text-cloud font-semibold">Martin Dobson</span>, AIERT Ltd</p>
      </section>

      {/* ── ARTICLE BODY ────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pb-16 space-y-8">

        <div className="card-glass rounded-2xl p-8 space-y-5 text-mist leading-relaxed">
          <p>
            Clean Email is a real, well-established tool for bulk-organising and unsubscribing from unwanted email, and it genuinely competes with MailBroom on the mechanics of cleanup. If you&apos;re an IT admin comparing the two for a company running Microsoft 365, though, the honest answer is: they&apos;re built for different buyers.
          </p>
          <p>
            <strong className="text-cloud">Clean Email is built around personal account bundles — buy access for 1, 5, or 10 accounts and share it with people you know, like family.</strong> MailBroom for Business is licensed once per organisation, with every employee on the company&apos;s Microsoft domain getting access automatically through Microsoft SSO. That single difference shapes almost everything else about how each tool fits — or doesn&apos;t — into a company&apos;s Microsoft 365 tenant.
          </p>
        </div>

        {/* Section 1 */}
        <div className="card-glass rounded-2xl p-8 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">👥</span>
            <h2 className="text-xl font-bold text-cloud">Who Each Tool Is Actually Built For</h2>
          </div>
          <p className="text-mist leading-relaxed">
            Clean Email&apos;s own pricing page frames its multi-account plans around sharing with people you know personally — buy 5 or 10 accounts and share them with friends and family. It does support company/business use, with employees at thousands of companies among its users, but the published buying model is account bundles, not an organisation-wide licence.
          </p>
          <p className="text-mist leading-relaxed">
            MailBroom for Business is licensed per organisation, not per person. An IT admin subscribes once, signs in via Microsoft SSO, and every employee with a matching company email address gets automatic access — no invite list, no separate account for each person to manage, no shared credentials.
          </p>
        </div>

        {/* Section 2 */}
        <div className="card-glass rounded-2xl p-8 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🗄️</span>
            <h2 className="text-xl font-bold text-cloud">Shared and Delegated Mailboxes</h2>
          </div>
          <p className="text-mist leading-relaxed">
            A common IT admin need is cleaning up shared inboxes — info@, sales@, or a departing colleague&apos;s delegated mailbox — not just each employee&apos;s own account. We couldn&apos;t find any published documentation from Clean Email addressing shared or delegated mailbox support specifically.
          </p>
          <p className="text-mist leading-relaxed">
            MailBroom explicitly supports this: once an org admin enables it, a shared or delegated mailbox can be connected and cleaned the same way as a personal one, provided the connecting user has Exchange Full Access on that mailbox.
          </p>
        </div>

        {/* Section 3 — comparison table */}
        <div className="card-glass rounded-2xl p-8 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">💷</span>
            <h2 className="text-xl font-bold text-cloud">Pricing and Deployment, Side by Side</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-3 pr-4 text-mist font-semibold">&nbsp;</th>
                  <th className="py-3 pr-4 text-cloud font-semibold">MailBroom for Business</th>
                  <th className="py-3 text-cloud font-semibold">Clean Email</th>
                </tr>
              </thead>
              <tbody className="text-mist">
                <tr className="border-b border-white/5">
                  <td className="py-3 pr-4 font-medium text-cloud">Licensing model</td>
                  <td className="py-3 pr-4">Per organisation, by seat band</td>
                  <td className="py-3">Per account bundle (1 / 5 / 10)</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-3 pr-4 font-medium text-cloud">Deployment</td>
                  <td className="py-3 pr-4">One Microsoft SSO sign-in covers the domain</td>
                  <td className="py-3">Each account signed in separately</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-3 pr-4 font-medium text-cloud">Shared/delegated mailboxes</td>
                  <td className="py-3 pr-4">Explicitly supported</td>
                  <td className="py-3">Not documented publicly</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-3 pr-4 font-medium text-cloud">Published company pricing</td>
                  <td className="py-3 pr-4">Yes — flat monthly by seat band</td>
                  <td className="py-3">No official org pricing — per-account bundles from ~€11.99/mo (per TheBusinessDive)</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-3 pr-4 font-medium text-cloud">Team/collaboration fit</td>
                  <td className="py-3 pr-4">Built for company-wide use</td>
                  <td className="py-3">Scored 1/5 by TheBusinessDive — &quot;designed for individuals, not teams&quot;</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium text-cloud">Email providers supported</td>
                  <td className="py-3 pr-4">Microsoft 365 / Exchange Online (company-wide); other providers via the separate MailBroom for iOS app</td>
                  <td className="py-3">Gmail, Yahoo, AOL, and more, all in one product</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-mist text-sm leading-relaxed mt-2">
            That last row is less of a gap than it looks: Microsoft 365/Exchange Online is what the large majority of businesses actually run, and MailBroom&apos;s Microsoft-only focus for Business is what makes the one-click, tenant-wide SSO deployment possible in the first place. For an organisation on genuinely mixed providers, Clean Email covers that in a single product — MailBroom&apos;s equivalent coverage exists too, just split across two products (Business for M365 companies, iOS for everything else via IMAP), not one.
          </p>
        </div>

        {/* Section — security */}
        <div className="card-glass rounded-2xl p-8 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🔐</span>
            <h2 className="text-xl font-bold text-cloud">Why Access Model Matters for a Company Rollout</h2>
          </div>
          <p className="text-mist leading-relaxed">
            MailBroom for Business connects via Microsoft Entra ID sign-in (Microsoft SSO) and the Microsoft Graph API. It never sees or stores a password — it receives a scoped, revocable access token limited to exactly what mailbox cleanup requires, and an org admin can revoke that access instantly from the organisation&apos;s own Microsoft admin settings, independent of MailBroom entirely.
          </p>
          <p className="text-mist leading-relaxed">
            Clean Email&apos;s own privacy policy states it &quot;may have to store authorization credentials and related information&quot; for some third-party mail providers — meaning, for at least some connections, it may retain account credentials rather than exchange them for a scoped, revocable token the way OAuth does. For Gmail specifically, Clean Email says it only reads message metadata and headers, never message bodies — a reasonable scope limit, but it&apos;s a Gmail-specific commitment, not a blanket statement about every provider it connects to. Clean Email doesn&apos;t publish SOC2 or ISO27001 certification.
          </p>
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
                  <th className="py-3 text-cloud font-semibold">Clean Email</th>
                </tr>
              </thead>
              <tbody className="text-mist">
                {[
                  ["Bulk delete / unsubscribe by sender", "✓", "✓"],
                  ["Storage cleanup by age or domain", "✓", "Partial — organising focus, not storage-targeted"],
                  ["Shared/delegated mailbox support", "✓", "Not published"],
                  ["Company-wide SSO licensing", "✓", "✗ — per-account bundles"],
                  ["Published per-org pricing", "✓", "✗ — quote-only"],
                  ["Works within retention policy / legal hold", "✓", "Not published"],
                  ["Non-Microsoft email providers (Gmail, Yahoo, etc.)", "✗ — via MailBroom for iOS instead", "✓ — in one product"],
                  ["Never stores account credentials", "✓ — OAuth token only", "Not for all providers, per own policy"],
                ].map(([feature, mb, ce]) => (
                  <tr key={feature} className="border-b border-white/5">
                    <td className="py-3 pr-4 font-medium text-cloud">{feature}</td>
                    <td className="py-3 pr-4">{mb}</td>
                    <td className="py-3">{ce}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-mist text-xs leading-relaxed mt-2">
            &quot;Not published&quot; means we found no public documentation either way — not that the feature is absent.
          </p>
        </div>

        {/* Section 4 */}
        <div className="card-glass rounded-2xl p-8 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">✅</span>
            <h2 className="text-xl font-bold text-cloud">When to Choose Which</h2>
          </div>
          <ul className="space-y-3 mt-2">
            {[
              <>Choose Clean Email if your team is on mixed email providers (not just Microsoft 365) and you&apos;re comfortable buying and distributing account access yourself.</>,
              <>Choose MailBroom for Business if you&apos;re an M365/Exchange Online shop and want one admin sign-in to cover the whole company automatically, including shared and delegated mailboxes, with transparent per-seat-band pricing.</>,
              <>Neither, if you&apos;re not buying for a company at all — just cleaning up your own personal inbox — see <a href="https://ios.mailbroom.app" className="text-gold font-semibold hover:opacity-80 transition-opacity">MailBroom for iOS</a> on the App Store instead, built for exactly that.</>,
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-mist">
                <span className="mt-0.5 flex-shrink-0 text-gold">✓</span>
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
            See how MailBroom handles <span className="gold-text">your whole tenant.</span>
          </h2>
          <p className="text-mist mb-8">A 30-day evaluation, no payment details required.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/trial" className="btn-gold px-8 py-4 rounded-full font-bold text-center">Start a Trial</a>
            <a href="/roi" className="btn-outline px-8 py-4 rounded-full font-semibold text-center">See the Business Case</a>
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
