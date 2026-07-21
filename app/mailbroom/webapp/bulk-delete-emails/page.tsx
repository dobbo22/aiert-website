import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bulk Delete Emails in Microsoft 365 — Admin Guide | AIERT Ltd",
  description:
    "How IT admins can bulk delete emails across Microsoft 365 and Exchange Online mailboxes safely — compliance holds, retention policies, and company-wide cleanup without per-mailbox manual work.",
  keywords: ["bulk delete emails Microsoft 365 admin", "bulk delete emails Exchange Online", "mass delete emails Office 365", "Microsoft 365 admin email cleanup", "bulk delete Outlook mailbox admin"],
  metadataBase: new URL("https://business.mailbroom.app"),
  openGraph: {
    title: "Bulk Delete Emails in Microsoft 365 — Admin Guide",
    description: "How IT admins can bulk delete emails across every mailbox safely — without breaking retention or legal hold.",
    url: "https://business.mailbroom.app/bulk-delete-emails",
    siteName: "AIERT Ltd",
    locale: "en_GB",
    type: "website",
  },
};

const faqs = [
  {
    q: "Can a Microsoft 365 admin bulk delete emails across multiple mailboxes at once?",
    a: "Yes, in a few different ways: PowerShell with the Exchange Online management module (e.g. Search-Mailbox or the Content Search + purge workflow in the compliance centre) for admin-driven, IT-only cleanup; or a company-wide tool that lets each employee clear their own mailbox, which scales far better than IT running scripted deletes against every mailbox one at a time.",
  },
  {
    q: "Will bulk deleting emails break legal hold or retention policy?",
    a: "It shouldn't, if the hold or retention policy is actually in place and the deletion method respects it. Exchange Online's In-Place Hold, Litigation Hold, and retention policies all work by preserving a copy of an item regardless of user or admin deletion — properly built bulk-delete tooling works within that constraint rather than around it. Always verify holds are correctly configured before running any bulk deletion, admin script or otherwise.",
  },
  {
    q: "What's the difference between admin-run PowerShell deletion and letting employees self-serve?",
    a: "PowerShell scripts are precise but require IT time for every request and don't scale to \"every mailbox in the company, regularly\" without becoming a recurring project. Self-serve tooling — where each employee runs their own Smart Sweep or Storage Cleanup, scoped to only their own mailbox — removes IT from the loop entirely for routine cleanup, while admins still control the plan, seats, and any org-wide policy.",
  },
  {
    q: "Is it safe to bulk delete old newsletters and automated emails specifically?",
    a: "This is usually the safest category to bulk delete — grouping by sender and clearing years of accumulated newsletters or notification emails rarely touches anything business-critical, and unsubscribing at the same time stops the mailbox from filling back up. It's a good first target for any company-wide cleanup.",
  },
  {
    q: "Does bulk deletion permanently remove the emails?",
    a: "Not immediately. Deleted items move to the Deleted Items folder (and from there, typically a recoverable-items store) before being permanently purged after Microsoft's retention window — so a bulk delete is recoverable for a period afterward, not instantly irreversible, unless a hard-delete/purge action is deliberately used.",
  },
];

const techArticleJsonLd = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "Bulk Delete Emails in Microsoft 365 — Admin Guide",
  description: "How IT admins can bulk delete emails across Microsoft 365 and Exchange Online mailboxes safely, without breaking retention or legal hold.",
  url: "https://business.mailbroom.app/bulk-delete-emails",
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

export default function BulkDeleteEmailsPage() {
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
            <a href="/mailbroom/webapp/mailbox-full" className="hover:text-white transition-colors font-medium">Mailbox Full?</a>
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
          For IT Admins · Microsoft 365
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight mb-6 text-cloud">
          How to bulk delete emails in <span className="gold-text">Microsoft 365.</span>
        </h1>
        <p className="text-lg text-cloud leading-relaxed max-w-2xl mx-auto">
          Two ways admins actually do this at scale — scripted, IT-run deletion, or company-wide
          self-serve cleanup — and how to do either without breaking retention policy or legal hold.
        </p>
      </section>

      {/* ── TWO APPROACHES ─────────────────────────────── */}
      <section className="section-dark py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-teal">Two approaches</p>
            <h2 className="text-4xl font-black text-cloud">Admin-run scripts vs. company-wide self-serve</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="card-glass rounded-2xl p-8">
              <h3 className="font-bold text-cloud text-lg mb-2">PowerShell / Compliance Centre</h3>
              <p className="text-sm text-cloud leading-relaxed">
                Precise and fully IT-controlled — content search and purge workflows can target
                specific criteria across specific mailboxes. Doesn&apos;t scale well as a recurring
                task: every cleanup request becomes IT time, and it requires Exchange Online
                admin permissions most employees rightly don&apos;t have.
              </p>
            </div>
            <div className="card-glass rounded-2xl p-8">
              <h3 className="font-bold text-cloud text-lg mb-2">Company-wide self-serve tooling</h3>
              <p className="text-sm text-cloud leading-relaxed">
                Admin subscribes once; every employee gets a scoped tool to clean only their own
                mailbox — bulk-delete by sender, age, or size. Removes IT from routine cleanup
                entirely, while admins retain control over the plan and seats, not individual actions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── DOING IT SAFELY ─────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-gold">Before you run anything</p>
          <h2 className="text-4xl font-black text-cloud">Doing it without breaking compliance</h2>
        </div>
        <div className="space-y-6">
          <div className="card-glass rounded-2xl p-8">
            <h3 className="font-bold text-cloud text-lg mb-2">Check for holds first</h3>
            <p className="text-sm text-cloud leading-relaxed">
              Litigation Hold, In-Place Hold, and retention policies all preserve a copy of an item
              regardless of user or admin deletion — confirm what&apos;s configured on a mailbox
              before assuming a bulk delete is a clean, total removal.
            </p>
          </div>
          <div className="card-glass rounded-2xl p-8">
            <h3 className="font-bold text-cloud text-lg mb-2">Start with the safest category: newsletters and automated mail</h3>
            <p className="text-sm text-cloud leading-relaxed">
              Grouping by sender and clearing years of newsletters or notification emails rarely
              touches anything business-critical — a good first bulk-delete target, especially
              paired with unsubscribing so the mailbox doesn&apos;t just fill back up.
            </p>
          </div>
          <div className="card-glass rounded-2xl p-8">
            <h3 className="font-bold text-cloud text-lg mb-2">Remember: it&apos;s not instantly permanent</h3>
            <p className="text-sm text-cloud leading-relaxed">
              Deleted mail moves to Deleted Items and a recoverable-items store before permanent
              purge after Microsoft&apos;s retention window — a bulk delete is recoverable for a
              period afterward, not an irreversible action, unless a hard-purge is deliberately used.
            </p>
          </div>
          <div className="card-glass rounded-2xl p-8">
            <h3 className="font-bold text-cloud text-lg mb-2">Prefer self-serve for anything recurring</h3>
            <p className="text-sm text-cloud leading-relaxed">
              A one-off scripted purge solves today&apos;s ticket. The mailbox fills up again next
              year. Giving employees their own cleanup tool — scoped only to what they&apos;re
              allowed to touch — turns a recurring IT project into something that never needs a
              ticket at all.
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
          Let every employee <span className="gold-text">clean up their own mailbox.</span>
        </h2>
        <p className="text-cloud mb-8 max-w-xl mx-auto">
          One licence, one company domain — no per-mailbox IT time, no scripts to maintain,
          respects retention policy and legal hold by design.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/mailbroom/webapp/trial"
            className="btn-gold px-10 py-5 rounded-full text-lg inline-flex items-center gap-3 justify-center"
          >
            <span>🧪</span> Start Your Free IT Assessment
          </a>
          <a
            href="/mailbroom/webapp/mailbox-full"
            className="btn-outline px-10 py-5 rounded-full text-lg inline-flex items-center gap-3 justify-center"
          >
            Mailbox Full? Read the Fix
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
              <a href="/mailbroom/webapp/mailbox-full" className="hover:text-white transition-colors">Mailbox Full?</a>
              <a href="/mailbroom/webapp/storage-costs" className="hover:text-white transition-colors">Storage Costs</a>
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
