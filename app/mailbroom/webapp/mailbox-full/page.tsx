import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Exchange Online Mailbox Full? How to Fix It | AIERT Ltd",
  description:
    "Mailbox full and can't send email in Exchange Online? Here's why it happens, what breaks first, and how to fix it fast — including the safest way to clear space across every mailbox in the company.",
  keywords: ["Exchange Online mailbox full", "mailbox full fix", "can't send email mailbox full", "Outlook mailbox full", "Exchange Online storage quota exceeded", "Microsoft 365 mailbox over quota"],
  metadataBase: new URL("https://business.mailbroom.app"),
  openGraph: {
    title: "Exchange Online Mailbox Full? How to Fix It",
    description: "Why it happens, what breaks first, and how to fix it fast.",
    url: "https://business.mailbroom.app/mailbox-full",
    siteName: "AIERT Ltd",
    locale: "en_GB",
    type: "website",
  },
};

const faqs = [
  {
    q: "What happens when an Exchange Online mailbox is full?",
    a: "Exchange Online enforces storage limits in stages. Once a mailbox passes its warning threshold, the user gets a low-storage notification but mail still flows normally. Past the send limit, the user can still receive mail but can no longer send. Past the send-and-receive limit, incoming mail is rejected and bounces back to the sender — the most disruptive stage, since it looks to outside senders like the account doesn't exist.",
  },
  {
    q: "Why is my mailbox full when I thought I had plenty of storage?",
    a: "Storage climbs quietly: large attachments, years of newsletters nobody unsubscribed from, calendar invites with embedded images, and Sent Items (which count against the same quota as Inbox) all add up. A mailbox that's been in daily use for five or more years without ever being cleaned out is the most common case.",
  },
  {
    q: "How do I quickly free up space in a full mailbox?",
    a: "The fastest wins are usually: emptying Deleted Items and Junk Email (they still count against quota until emptied), clearing out the largest attachments first rather than the oldest emails first, and bulk-unsubscribing from newsletters and automated notifications that make up a large share of message count without much value. Doing this manually, sender by sender, is what makes it slow — bulk tooling is what makes it fast.",
  },
  {
    q: "Can an IT admin fix this for a user, or does the user have to do it themselves?",
    a: "An admin can grant themselves access to a mailbox and clean it directly, but that doesn't scale past a handful of one-off tickets — it's why 'mailbox full' tickets are one of the most common recurring IT helpdesk requests. Company-wide tooling that lets each employee clear their own mailbox in a couple of clicks removes the ticket entirely, rather than requiring IT to do it by hand each time.",
  },
  {
    q: "Will cleaning up a full mailbox break compliance or legal hold requirements?",
    a: "It shouldn't, provided the tool respects existing retention policies and litigation holds — Exchange Online's hold mechanisms retain a copy of held items regardless of user-initiated deletion, so a properly built cleanup tool works within that, not around it. Always confirm this explicitly with whatever tool you use before running a bulk cleanup.",
  },
];

const techArticleJsonLd = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "Exchange Online Mailbox Full? How to Fix It",
  description: "Why an Exchange Online mailbox fills up, what breaks at each stage, and how to fix it — including the safest way to clear space across every mailbox in a company.",
  url: "https://business.mailbroom.app/mailbox-full",
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

export default function MailboxFullPage() {
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
          <a href="/mailbroom/webapp" className="flex items-center gap-4">
            <img src="/mailbroom-icon.png" alt="MailBroom" width={44} height={44} className="w-11 h-11 rounded-lg" />
            <span className="font-bold text-2xl tracking-tight text-cloud">
              MailBroom
            </span>
          </a>
          <div className="hidden md:flex items-center gap-10 text-base text-cloud">
            <a href="/mailbroom/webapp" className="hover:text-white transition-colors font-medium">MailBroom for Business</a>
            <a href="/mailbroom/webapp/storage-costs" className="hover:text-white transition-colors font-medium">Storage Costs</a>
            <a href="/mailbroom/webapp/roi" className="hover:text-white transition-colors font-medium">Business Case</a>
          </div>
          <a
            href="/mailbroom/webapp/trial"
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
          Exchange Online · Microsoft 365
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight mb-6 text-cloud">
          Mailbox full in <span className="gold-text">Exchange Online?</span>
        </h1>
        <p className="text-lg text-cloud leading-relaxed max-w-2xl mx-auto">
          Here&apos;s exactly what happens when a mailbox hits its storage limit, why it caught
          you by surprise, and the fastest way to fix it — for one mailbox or every mailbox in
          the company.
        </p>
      </section>

      {/* ── WHAT BREAKS ─────────────────────────────────── */}
      <section className="section-dark py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-teal">What actually happens</p>
            <h2 className="text-4xl font-black text-cloud">Three stages, each worse than the last</h2>
          </div>
          <div className="space-y-6">
            <div className="card-glass rounded-2xl p-8">
              <h3 className="font-bold text-cloud text-lg mb-2">1. Warning stage</h3>
              <p className="text-sm text-cloud leading-relaxed">
                The user gets a low-storage notification. Mail still sends and receives normally —
                this is the easiest, cheapest point to fix it, and the one most people ignore.
              </p>
            </div>
            <div className="card-glass rounded-2xl p-8">
              <h3 className="font-bold text-cloud text-lg mb-2">2. Send-prohibited stage</h3>
              <p className="text-sm text-cloud leading-relaxed">
                The mailbox can still receive mail, but new outgoing mail is blocked. Meetings can&apos;t
                be sent, replies queue or fail — the first stage most users actually notice and raise a ticket for.
              </p>
            </div>
            <div className="card-glass rounded-2xl p-8">
              <h3 className="font-bold text-cloud text-lg mb-2">3. Send-and-receive-prohibited stage</h3>
              <p className="text-sm text-cloud leading-relaxed">
                Incoming mail bounces back to the sender with a non-delivery report. To anyone outside
                the company, it looks like the mailbox doesn&apos;t exist — the most disruptive and
                visible stage, and the one that generates the most urgent IT tickets.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY IT HAPPENS ──────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-gold">Why it sneaks up on you</p>
          <h2 className="text-4xl font-black text-cloud">Storage climbs quietly, not suddenly</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="card-glass rounded-2xl p-6">
            <div className="text-2xl mb-3">📎</div>
            <h3 className="font-bold text-cloud text-sm mb-1">Large attachments</h3>
            <p className="text-xs text-cloud leading-relaxed">Every file ever emailed to or from the mailbox, still sitting in Inbox or Sent Items years later.</p>
          </div>
          <div className="card-glass rounded-2xl p-6">
            <div className="text-2xl mb-3">📬</div>
            <h3 className="font-bold text-cloud text-sm mb-1">Newsletters &amp; notifications</h3>
            <p className="text-xs text-cloud leading-relaxed">Automated mail nobody ever unsubscribed from — often the largest share of message count, if not size.</p>
          </div>
          <div className="card-glass rounded-2xl p-6">
            <div className="text-2xl mb-3">🗑️</div>
            <h3 className="font-bold text-cloud text-sm mb-1">A full Deleted Items folder</h3>
            <p className="text-xs text-cloud leading-relaxed">Deleting an email doesn&apos;t free space until Deleted Items is actually emptied — a step many users never take.</p>
          </div>
          <div className="card-glass rounded-2xl p-6">
            <div className="text-2xl mb-3">📅</div>
            <h3 className="font-bold text-cloud text-sm mb-1">Years without a cleanup</h3>
            <p className="text-xs text-cloud leading-relaxed">A mailbox in daily use for five, ten, or fifteen years without ever being cleared — the single biggest predictor of hitting the limit.</p>
          </div>
        </div>
      </section>

      {/* ── HOW TO FIX ──────────────────────────────────── */}
      <section className="section-dark py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-teal">The fix</p>
            <h2 className="text-4xl font-black text-cloud">Fastest ways to free up space</h2>
          </div>
          <div className="space-y-6">
            <div className="card-glass rounded-2xl p-8">
              <h3 className="font-bold text-cloud text-lg mb-2">Empty Deleted Items and Junk Email first</h3>
              <p className="text-sm text-cloud leading-relaxed">
                Both still count against quota until actually emptied — the single fastest way to
                claw back space with zero risk, since it&apos;s mail the user already decided they don&apos;t need.
              </p>
            </div>
            <div className="card-glass rounded-2xl p-8">
              <h3 className="font-bold text-cloud text-lg mb-2">Sort by size, not by date</h3>
              <p className="text-sm text-cloud leading-relaxed">
                A handful of large attachments usually accounts for more space than thousands of
                small text emails — clearing the biggest offenders first gets a mailbox back under
                quota faster than working chronologically.
              </p>
            </div>
            <div className="card-glass rounded-2xl p-8">
              <h3 className="font-bold text-cloud text-lg mb-2">Bulk-unsubscribe from what&apos;s not being read</h3>
              <p className="text-sm text-cloud leading-relaxed">
                Newsletters and automated notifications are usually the largest share of message
                count. Unsubscribing stops the mailbox from filling back up again — deleting alone
                only buys time until the next batch arrives.
              </p>
            </div>
            <div className="card-glass rounded-2xl p-8">
              <h3 className="font-bold text-cloud text-lg mb-2">For IT: fix it company-wide, not mailbox by mailbox</h3>
              <p className="text-sm text-cloud leading-relaxed">
                Manually cleaning one mailbox at a time doesn&apos;t scale, and it&apos;s why &ldquo;my
                mailbox is full&rdquo; is one of the most common recurring helpdesk tickets. Giving every
                employee a way to clear their own mailbox in a couple of clicks — respecting any
                retention policy or legal hold already in place — removes the ticket at the source.
              </p>
            </div>
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
          Clear a full mailbox in <span className="gold-text">minutes, not tickets.</span>
        </h2>
        <p className="text-cloud mb-8 max-w-xl mx-auto">
          Smart Sweep and Storage Cleanup let every employee free up their own mailbox — no
          per-mailbox IT time, no waiting on a helpdesk queue.
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
              <a href="/mailbroom/webapp/bulk-delete-emails" className="hover:text-white transition-colors">Bulk Delete Emails</a>
              <a href="/mailbroom/webapp/employee-offboarding" className="hover:text-white transition-colors">Leaver Mailboxes</a>
              <a href="/mailbroom/webapp/tenant-migration" className="hover:text-white transition-colors">Tenant Migration</a>
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
