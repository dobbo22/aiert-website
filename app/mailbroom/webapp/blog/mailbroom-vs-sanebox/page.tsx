import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MailBroom vs SaneBox: Solving Different Problems in the Inbox | AIERT Ltd",
  description: "SaneBox prioritizes new email as it arrives. MailBroom cleans up what already piled up. An honest look at when you need one, the other, or both.",
  keywords: ["MailBroom vs SaneBox", "SaneBox alternative", "email prioritization vs cleanup", "M365 mailbox storage tool", "SaneBox for business"],
  metadataBase: new URL("https://business.mailbroom.app"),
  alternates: { canonical: "/blog/mailbroom-vs-sanebox" },
  openGraph: {
    title: "MailBroom vs SaneBox: Solving Different Problems in the Inbox",
    description: "Prioritization vs remediation — an honest look at when you need one, the other, or both.",
    url: "https://business.mailbroom.app/blog/mailbroom-vs-sanebox",
    siteName: "AIERT Ltd",
    locale: "en_GB",
    type: "article",
    images: [{ url: "https://business.mailbroom.app/mailbroom-business-og.png", width: 1200, height: 628, alt: "MailBroom for Business — inbox cleanup for the whole company" }],
  },
};

const faqs = [
  {
    q: "Is SaneBox a competitor to MailBroom, or a different kind of tool?",
    a: "Different kind of tool solving an adjacent problem. SaneBox is an AI-powered filtering and prioritization layer — it sorts incoming email so the important stuff surfaces and the rest gets out of the way. MailBroom is a bulk cleanup and storage-remediation tool — it deletes, unsubscribes from, and frees space from mail that's already accumulated. One manages the flow of new mail; the other clears out the backlog.",
  },
  {
    q: "Does SaneBox reduce mailbox storage usage?",
    a: "Not as its core function. SaneBox reorganizes where email lives within your inbox (moving lower-priority mail into folders like SaneLater) rather than deleting it or reducing what's stored. If the underlying problem is a mailbox approaching its Exchange Online storage quota, filtering alone doesn't fix that — the mail is still there, just relocated.",
  },
  {
    q: "Does SaneBox work with Microsoft 365?",
    a: "Yes — SaneBox states it works with Gmail, Microsoft 365, Apple iCloud, Yahoo! Mail, Fastmail, and any IMAP, Microsoft Exchange, or ActiveSync server. So it's a legitimate option for M365 users specifically looking for inbox prioritization, just not for bulk storage cleanup or company-wide deployment.",
  },
  {
    q: "Should a company use SaneBox and MailBroom together?",
    a: "That's a coherent combination, not a conflict — SaneBox manages what floods in day to day, while MailBroom periodically clears out what's built up (old newsletters, oversized attachments, years of accumulated storage) and handles company-wide concerns like shared mailboxes, leaver offboarding, and storage-quota tickets that a personal filtering tool isn't built to address.",
  },
];

const techArticleJsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: "MailBroom vs SaneBox: Solving Different Problems in the Inbox",
  description: "Prioritization vs remediation — an honest look at when you need one, the other, or both.",
  url: "https://business.mailbroom.app/blog/mailbroom-vs-sanebox",
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

export default function MailBroomVsSaneBoxPage() {
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
            <a href="/mailbox-full" className="hover:text-white transition-colors font-medium">Mailbox Full?</a>
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
          MailBroom vs <span className="gold-text">SaneBox:</span> Solving Different Problems in the Inbox
        </h1>
        <p className="text-mist text-sm">By <span className="text-cloud font-semibold">Martin Dobson</span>, AIERT Ltd</p>
      </section>

      {/* ── ARTICLE BODY ────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pb-16 space-y-8">

        <div className="card-glass rounded-2xl p-8 space-y-5 text-mist leading-relaxed">
          <p>
            SaneBox and MailBroom get compared because they both promise a better inbox — but they solve different jobs. Confusing the two is the most common mistake in this comparison, so it&apos;s worth being direct about it upfront.
          </p>
          <p>
            <strong className="text-cloud">SaneBox is about prioritization: managing the flow of email arriving today.</strong> <strong className="text-cloud">MailBroom is about remediation: cleaning up storage and mail that already accumulated.</strong> If your problem is drowning in new email, that&apos;s a SaneBox problem. If your problem is an Exchange Online storage quota, a &quot;mailbox full&quot; ticket, or years of newsletters nobody unsubscribed from, that&apos;s a MailBroom problem.
          </p>
        </div>

        {/* Section 1 */}
        <div className="card-glass rounded-2xl p-8 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">📥</span>
            <h2 className="text-xl font-bold text-cloud">What SaneBox Actually Does</h2>
          </div>
          <p className="text-mist leading-relaxed">
            SaneBox uses AI to filter and categorize incoming email — sorting lower-priority mail out of your main inbox (into folders like SaneLater), letting you block unwanted senders (BlackHole), snooze messages, and get daily digest summaries. It works with Gmail, Microsoft 365, Apple iCloud, Yahoo! Mail, Fastmail, and any IMAP, Exchange, or ActiveSync server — genuinely broad platform support.
          </p>
          <p className="text-mist leading-relaxed">
            What it doesn&apos;t do, as far as we found published, is bulk-delete accumulated mail or reduce mailbox storage usage. It reorganizes where mail lives; it doesn&apos;t clear it out.
          </p>
        </div>

        {/* Section 2 */}
        <div className="card-glass rounded-2xl p-8 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🧹</span>
            <h2 className="text-xl font-bold text-cloud">What MailBroom Actually Does</h2>
          </div>
          <p className="text-mist leading-relaxed">
            MailBroom for Business does the opposite job: Smart Sweep bulk-deletes or unsubscribes from newsletters and unused mail grouped by sender, Storage Cleanup frees space by age bracket or sender domain without breaking retention policy or legal hold, and Power Search finds and bulk-acts on specific mail across folders. None of that is about filtering what arrives today — it&apos;s about clearing what&apos;s already there, across an entire company&apos;s Microsoft 365 tenant if needed, including shared and delegated mailboxes.
          </p>
        </div>

        {/* Section 3 — comparison table */}
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
                  <th className="py-3 text-cloud font-semibold">SaneBox</th>
                </tr>
              </thead>
              <tbody className="text-mist">
                <tr className="border-b border-white/5">
                  <td className="py-3 pr-4 font-medium text-cloud">Core job</td>
                  <td className="py-3 pr-4">Bulk cleanup, storage remediation</td>
                  <td className="py-3">Filtering, prioritization</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-3 pr-4 font-medium text-cloud">Reduces storage usage</td>
                  <td className="py-3 pr-4">Yes — deletion and unsubscribe</td>
                  <td className="py-3">No — reorganizes, doesn&apos;t delete</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-3 pr-4 font-medium text-cloud">Platforms</td>
                  <td className="py-3 pr-4">Microsoft 365 / Exchange Online</td>
                  <td className="py-3">Gmail, M365, iCloud, Yahoo, IMAP</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-3 pr-4 font-medium text-cloud">Company-wide licensing</td>
                  <td className="py-3 pr-4">Per organisation, via SSO</td>
                  <td className="py-3">Per individual account — ~$4.92/user/month per TheBusinessDive, no free plan</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-3 pr-4 font-medium text-cloud">Team fit</td>
                  <td className="py-3 pr-4">Built for company-wide use</td>
                  <td className="py-3">TheBusinessDive lists teams under &quot;not ideal for&quot;</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium text-cloud">Shared/delegated mailboxes</td>
                  <td className="py-3 pr-4">Explicitly supported</td>
                  <td className="py-3">Not documented publicly</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section — security */}
        <div className="card-glass rounded-2xl p-8 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🔐</span>
            <h2 className="text-xl font-bold text-cloud">Access Model — a Rare Case of Rough Parity</h2>
          </div>
          <p className="text-mist leading-relaxed">
            Credit where it&apos;s due: SaneBox&apos;s own security documentation states that &quot;most services authorize SaneBox without a password&quot;, specifically naming Google, Office365, Yahoo, and AOL — meaning for Microsoft 365 specifically, SaneBox uses OAuth, not a stored password. Where it does need direct credentials (iCloud, Fastmail, since those providers don&apos;t offer the same OAuth flow), it says those are encrypted with public-key cryptography and stored on servers unreachable from the public internet, with encryption keys in hardware security modules.
          </p>
          <p className="text-mist leading-relaxed">
            MailBroom&apos;s model is still slightly different in one respect: as a company-wide tool, it&apos;s built around one Microsoft SSO sign-in that an org admin controls and can revoke centrally for the whole domain, rather than each person authorizing their own account individually. For M365 access specifically, though, this is one area where the two tools are reasonably comparable — the real differences are elsewhere (see the table below).
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
                  <th className="py-3 text-cloud font-semibold">SaneBox</th>
                </tr>
              </thead>
              <tbody className="text-mist">
                {[
                  ["Bulk delete accumulated mail", "✓", "✗ — reorganizes, doesn't delete"],
                  ["Storage cleanup by age or domain", "✓", "✗"],
                  ["AI filtering/prioritization of incoming mail", "✗", "✓"],
                  ["Shared/delegated mailbox support", "✓", "Not published"],
                  ["Company-wide SSO licensing", "✓", "✗ — per-account plans"],
                  ["Works within retention policy / legal hold", "✓", "Not published"],
                  ["Non-Microsoft email providers", "✗", "✓ — Gmail, iCloud, Yahoo, IMAP"],
                  ["OAuth (no password) for M365 access", "✓", "✓ — per SaneBox's own security docs"],
                ].map(([feature, mb, sb]) => (
                  <tr key={feature} className="border-b border-white/5">
                    <td className="py-3 pr-4 font-medium text-cloud">{feature}</td>
                    <td className="py-3 pr-4">{mb}</td>
                    <td className="py-3">{sb}</td>
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
            <h2 className="text-xl font-bold text-cloud">When to Use Which</h2>
          </div>
          <ul className="space-y-3 mt-2">
            {[
              <>Use SaneBox if your problem is too much incoming email and you want it triaged automatically — that&apos;s what it&apos;s built for.</>,
              <>Use MailBroom for Business if your problem is an Exchange Online storage quota, a recurring &apos;mailbox full&apos; helpdesk ticket, or years of accumulated mail across the company that needs clearing out.</>,
              <>Use both if you have both problems — they don&apos;t overlap or conflict, since one manages the inflow and the other clears the backlog.</>,
              <>Use <a href="https://ios.mailbroom.app" className="text-gold font-semibold hover:opacity-80 transition-opacity">MailBroom for iOS</a> instead if this isn&apos;t a company deployment at all — just your own personal inbox on your iPhone.</>,
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
            Got the &quot;mailbox full&quot; problem, <span className="gold-text">not the inbox-overload problem?</span>
          </h2>
          <p className="text-mist mb-8">A 30-day evaluation, no payment details required.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/trial" className="btn-gold px-8 py-4 rounded-full font-bold text-center">Start a Trial</a>
            <a href="/mailbox-full" className="btn-outline px-8 py-4 rounded-full font-semibold text-center">Mailbox Full? Read This First</a>
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
