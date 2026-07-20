import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How to Reduce Microsoft 365 Storage Costs | AIERT Ltd",
  description:
    "What Microsoft actually charges once a mailbox outgrows its plan, and how to reduce Microsoft 365 storage costs — extra storage, archive overage, and how to avoid paying to store clutter you don't need.",
  keywords: ["reduce Microsoft 365 storage costs", "Microsoft 365 storage cost", "Exchange Online storage overage", "mailbox storage limit", "archive mailbox cost", "email storage pricing", "lower Exchange Online costs"],
  metadataBase: new URL("https://aiert.co.uk"),
  openGraph: {
    title: "How to Reduce Microsoft 365 Storage Costs",
    description: "What Microsoft actually charges once a mailbox outgrows its plan, and how to bring the bill back down.",
    url: "https://aiert.co.uk/mailbroom/webapp/storage-costs",
    siteName: "AIERT Ltd",
    locale: "en_GB",
    type: "website",
  },
};

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "How to Reduce Microsoft 365 Storage Costs",
  description: "What Microsoft actually charges once a mailbox outgrows its plan, and how to reduce Microsoft 365 storage costs.",
  url: "https://aiert.co.uk/mailbroom/webapp/storage-costs",
  publisher: { "@type": "Organization", name: "AIERT Ltd", url: "https://aiert.co.uk" },
};

export default function StorageCostsPage() {
  return (
    <div className="min-h-screen hero-gradient grid-bg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      {/* ── NAV ─────────────────────────────────────────── */}
      <nav className="nav-glass sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between">
          <a href="/mailbroom/webapp" className="flex items-center gap-4">
            <div className="nav-logo-icon w-11 h-11 rounded-lg flex items-center justify-center font-black text-base">
              AI
            </div>
            <span className="font-bold text-2xl tracking-tight text-cloud">
              AIERT<span className="text-sm font-normal ml-1 text-cloud">Ltd</span>
            </span>
          </a>
          <div className="hidden md:flex items-center gap-10 text-base text-cloud">
            <a href="/mailbroom/webapp" className="hover:text-white transition-colors font-medium">MailBroom for Business</a>
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
          Microsoft 365 · Exchange Online
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight mb-6 text-cloud">
          How to reduce <span className="gold-text">Microsoft 365 storage costs.</span>
        </h1>
        <p className="text-lg text-cloud leading-relaxed max-w-2xl mx-auto">
          Every Microsoft 365 mailbox has a storage limit built into its plan. Here&apos;s what
          actually happens once a mailbox goes over it — and the fastest way to bring the bill
          back down.
        </p>
      </section>

      {/* ── HOW LIMITS WORK ────────────────────────────── */}
      <section className="section-dark py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-teal">The baseline</p>
            <h2 className="text-4xl font-black text-cloud">What&apos;s actually included</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="card-glass rounded-2xl p-6">
              <div className="text-3xl font-black gold-text mb-2">100 GB</div>
              <p className="text-sm text-cloud leading-relaxed">
                Per-mailbox storage on Microsoft 365 Business Basic, Standard, and Premium —
                raised from 50 GB as of 1 July 2026.<sup>1</sup>
              </p>
            </div>
            <div className="card-glass rounded-2xl p-6">
              <div className="text-3xl font-black gold-text mb-2">1.5 TB</div>
              <p className="text-sm text-cloud leading-relaxed">
                Maximum size an auto-expanding archive mailbox can grow to before storage becomes
                consumption-billed. Included on Business Premium, E3, and E5; an add-on elsewhere.<sup>2</sup>
              </p>
            </div>
          </div>
          <p className="text-center text-sm text-cloud mt-8 max-w-2xl mx-auto leading-relaxed">
            Both limits sound generous — until a mailbox has been in daily use for five, ten, or
            fifteen years, accumulating newsletters, automated notifications, and every attachment
            anyone has ever sent it. That&apos;s the point at which storage stops being free.
          </p>
        </div>
      </section>

      {/* ── WHAT IT COSTS ──────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-gold">Once you're over the limit</p>
          <h2 className="text-4xl font-black text-cloud">Three ways Microsoft bills the excess</h2>
        </div>
        <div className="space-y-6">
          <div className="card-glass rounded-2xl p-8">
            <h3 className="font-bold text-cloud text-lg mb-2">1. Extra storage, by the gigabyte</h3>
            <p className="text-sm text-cloud leading-relaxed">
              Commonly listed at around $0.20 per GB per month (roughly £0.16). A mailbox running
              20 GB over its plan costs about £3.20/month on its own — small per mailbox, but this
              is charged every month, for every mailbox over the limit, indefinitely.<sup>3</sup>
            </p>
          </div>
          <div className="card-glass rounded-2xl p-8">
            <h3 className="font-bold text-cloud text-lg mb-2">2. The archiving add-on itself</h3>
            <p className="text-sm text-cloud leading-relaxed">
              On Business Basic or Standard, auto-expanding archive (up to 1.5 TB) requires the
              Exchange Online Archiving add-on at around $4/user/month (~£3.20). It&apos;s included
              free on Business Premium, E3, and E5 — worth checking which plan your organisation
              is actually on before assuming this cost doesn&apos;t apply.<sup>2</sup>
            </p>
          </div>
          <div className="card-glass rounded-2xl p-8">
            <h3 className="font-bold text-cloud text-lg mb-2">3. Consumption billing past 1.5 TB</h3>
            <p className="text-sm text-cloud leading-relaxed">
              Once an archive mailbox exceeds the 1.5 TB auto-expand ceiling, further growth is
              billed as a consumption-based feature at around $0.25/GB/month (~£0.20) — the
              steepest of the three rates, and the one most likely to apply to long-tenured senior
              staff mailboxes that have never been cleaned up.<sup>2</sup>
            </p>
          </div>
        </div>
        <p className="text-center text-xs text-cloud mt-8 max-w-2xl mx-auto">
          None of these rates are published as fixed global prices — they vary by region, currency,
          and licensing agreement. Confirm your tenant&apos;s actual rate in the Microsoft 365
          admin centre before budgeting against these figures.
        </p>
      </section>

      {/* ── WHY IT COMPOUNDS ───────────────────────────── */}
      <section className="section-dark py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-teal">Why this compounds</p>
          <h2 className="text-4xl font-black text-cloud mb-6">Storage never shrinks on its own</h2>
          <p className="text-cloud leading-relaxed max-w-2xl mx-auto">
            A mailbox that&apos;s 20 GB over its limit today doesn&apos;t self-correct — it only
            grows, one newsletter and one meeting-invite attachment at a time. Left alone, the
            monthly overage bill for that mailbox only ever goes up. The only way the number goes
            down is for someone — or something — to actually delete the clutter.
          </p>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <h2 className="text-3xl md:text-4xl font-black text-cloud mb-6">
          See how MailBroom can help you <span className="gold-text">manage these costs.</span>
        </h2>
        <p className="text-cloud mb-8 max-w-xl mx-auto">
          Smart Sweep and Storage Cleanup let every employee clear their own clutter in minutes —
          no per-mailbox IT time, no waiting for a quarterly cleanup project.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/mailbroom/webapp/trial"
            className="btn-gold px-10 py-5 rounded-full text-lg inline-flex items-center gap-3 justify-center"
          >
            <span>🧪</span> Start Your Free IT Assessment
          </a>
          <a
            href="/mailbroom/webapp/roi"
            className="btn-outline px-10 py-5 rounded-full text-lg inline-flex items-center gap-3 justify-center"
          >
            See the Full Business Case
          </a>
        </div>
      </section>

      {/* ── SOURCES ─────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 pb-16">
        <h3 className="text-xs font-semibold uppercase tracking-widest mb-4 text-cloud">Sources</h3>
        <ol className="text-xs text-cloud space-y-2 list-decimal list-inside">
          <li>Microsoft 365 Business plan mailbox storage increase from 50 GB to 100 GB per user, effective 1 July 2026 — per current Microsoft 365 licensing communications.</li>
          <li>Microsoft Learn, &ldquo;Learn about auto-expanding archiving&rdquo; — Exchange Online Archiving add-on pricing, the 1.5 TB auto-expand ceiling, and consumption-based billing beyond it.</li>
          <li>Microsoft 365 extra storage add-on, commonly listed at $0.20/GB/month; not a fixed global published price — varies by region, currency, and agreement type.</li>
        </ol>
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
              <a href="/mailbroom/webapp/roi" className="hover:text-white transition-colors">Business Case</a>
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
