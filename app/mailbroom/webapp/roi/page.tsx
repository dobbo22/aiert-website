import type { Metadata } from "next";
import RoiCalculator from "./RoiCalculator";

export const metadata: Metadata = {
  title: "The Business Case for MailBroom for Business | AIERT Ltd",
  description:
    "Storage overage costs, IT ticket time, and compliance-safe deletion — the numbers behind MailBroom for Business, with sources.",
  keywords: ["MailBroom ROI", "Microsoft 365 storage cost", "email cleanup business case", "compliance", "litigation hold", "eDiscovery"],
  metadataBase: new URL("https://aiert.co.uk"),
  openGraph: {
    title: "The Business Case for MailBroom for Business",
    description: "Storage overage costs, IT ticket time, and compliance-safe deletion — with sources.",
    url: "https://aiert.co.uk/mailbroom/webapp/roi",
    siteName: "AIERT Ltd",
    locale: "en_GB",
    type: "website",
  },
};

export default function MailBroomRoiPage() {
  return (
    <div className="min-h-screen hero-gradient grid-bg">

      {/* ── NAV ─────────────────────────────────────────── */}
      <nav className="nav-glass sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between">
          <a href="/" className="flex items-center gap-4">
            <div className="nav-logo-icon w-11 h-11 rounded-lg flex items-center justify-center font-black text-base">
              AI
            </div>
            <span className="font-bold text-2xl tracking-tight text-cloud">
              AIERT<span className="text-sm font-normal ml-1 text-mist">Ltd</span>
            </span>
          </a>
          <div className="hidden md:flex items-center gap-10 text-base text-mist">
            <a href="/mailbroom/webapp" className="hover:text-white transition-colors font-medium">MailBroom for Business</a>
            <a href="/mailbroom/webapp/storage-costs" className="hover:text-white transition-colors font-medium">Storage Costs</a>
            <a href="/mailbroom/webapp/trial" className="hover:text-white transition-colors font-medium">Free Assessment</a>
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
          For IT Directors &amp; Finance
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight mb-6 text-cloud">
          The business case, <span className="gold-text">not just the pitch.</span>
        </h1>
        <p className="text-lg text-mist leading-relaxed max-w-2xl mx-auto">
          What unmanaged mailboxes actually cost, what a MailBroom for Business plan actually
          costs, and how deletion works alongside the retention policies and legal holds you
          already have in place.
        </p>
      </section>

      {/* ── COST OF INACTION ──────────────────────────────── */}
      <section className="section-dark py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-gold">Cost of inaction</p>
            <h2 className="text-4xl font-black text-cloud">Storage isn&apos;t free once you outgrow it</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-10">
            <div className="card-glass rounded-2xl p-6">
              <div className="text-3xl font-black gold-text mb-2">100 GB</div>
              <p className="text-sm text-mist leading-relaxed">
                Included per mailbox on Business Basic, Standard, and Premium plans — raised from
                50 GB as of 1 July 2026. Anything a mailbox holds beyond its plan&apos;s limit is
                billed as extra storage.<sup>1</sup>
              </p>
            </div>
            <div className="card-glass rounded-2xl p-6">
              <div className="text-3xl font-black gold-text mb-2">~£0.16/GB</div>
              <p className="text-sm text-mist leading-relaxed">
                Typical extra-storage add-on rate (~$0.20/GB/month). Not published as a fixed
                global price by Microsoft — varies by region, currency, and agreement type, so
                confirm your own tenant&apos;s rate in the admin centre.<sup>2</sup>
              </p>
            </div>
            <div className="card-glass rounded-2xl p-6">
              <div className="text-3xl font-black gold-text mb-2">£3.20–£4/seat</div>
              <p className="text-sm text-mist leading-relaxed">
                Monthly cost of the Exchange Online Archiving add-on for Business Basic/Standard
                tenants, needed to get auto-expanding archive up to 1.5 TB (included free on
                Premium, E3, and E5). Beyond 1.5 TB, overage is billed at ~£0.20/GB/month.<sup>3</sup>
              </p>
            </div>
          </div>

          <div className="max-w-2xl mx-auto rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
            <p className="text-sm text-mist leading-relaxed">
              None of this is a one-off charge. Every newsletter, notification, and old attachment
              left unswept adds to a mailbox&apos;s footprint permanently — and that footprint is
              re-billed every month it sits above the plan&apos;s included storage.
            </p>
          </div>
        </div>
      </section>

      {/* ── CALCULATOR ─────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-teal">Calculate it yourself</p>
          <h2 className="text-4xl font-black text-cloud">What would this mean for you?</h2>
          <p className="text-mist mt-4 max-w-2xl mx-auto leading-relaxed">
            Enter your own headcount and average mailbox size to see the effect of cutting mailbox
            size in half — a typical result once clutter is cleared out.
          </p>
        </div>

        <RoiCalculator />
      </section>

      {/* ── IT TIME ────────────────────────────────────────── */}
      <section className="section-dark py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-gold">IT overhead</p>
          <h2 className="text-4xl font-black text-cloud mb-6">The ticket you already know by heart</h2>
          <p className="text-mist leading-relaxed max-w-2xl mx-auto mb-8">
            &ldquo;My mailbox is full&rdquo; is one of the most common Microsoft 365 helpdesk
            tickets — and the fix is almost always the same manual walk-through, repeated per
            employee, every few months. MailBroom moves that work from IT&apos;s queue to a
            self-service tool the employee runs themselves, in the browser, in minutes.
          </p>
          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto text-left">
            <div className="card-glass rounded-2xl p-6">
              <div className="text-2xl mb-3">🎫</div>
              <h3 className="font-bold text-cloud text-sm mb-2">Without MailBroom</h3>
              <p className="text-xs text-mist leading-relaxed">
                Employee raises a ticket → IT talks them through Outlook&apos;s built-in cleanup
                or does it remotely → repeats next quarter for the same mailbox.
              </p>
            </div>
            <div className="card-glass rounded-2xl p-6">
              <div className="text-2xl mb-3">🧹</div>
              <h3 className="font-bold text-cloud text-sm mb-2">With MailBroom</h3>
              <p className="text-xs text-mist leading-relaxed">
                Employee signs in with their existing Microsoft account and clears their own
                mailbox with Smart Sweep or Storage Cleanup — no ticket raised at all.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── COMPLIANCE ─────────────────────────────────────── */}
      <section id="compliance" className="max-w-4xl mx-auto px-6 py-24 scroll-mt-24">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-teal">Compliance</p>
          <h2 className="text-4xl font-black text-cloud">Deletion is not destruction</h2>
        </div>
        <div className="card-teal-accent rounded-3xl p-10 md:p-12 glow-teal">
          <p className="text-mist leading-relaxed mb-6">
            When MailBroom deletes an email, it does exactly what Outlook itself does when a
            person deletes a message by hand: the item moves into the mailbox&apos;s Recoverable
            Items folder, and — if the retention period expires or the item is purged — into the
            Purges subfolder marked for eventual removal.<sup>4</sup>
          </p>
          <p className="text-mist leading-relaxed mb-6">
            If that mailbox is on Litigation Hold, an eDiscovery hold, or a retention policy your
            organisation has already configured, Exchange Online preserves everything in the
            Purges subfolder for the full hold duration — regardless of what deleted it, and
            regardless of whether the hold is indefinite.<sup>5</sup> MailBroom has no path around
            that mechanism, because it isn&apos;t a separate system — it&apos;s the same Exchange
            Online mailbox, accessed through the same Microsoft Graph API Outlook itself uses.
          </p>
          <p className="text-mist leading-relaxed">
            In practice: a company with active holds keeps everything it&apos;s legally required to
            keep, exactly as before. A company with no such hold gets exactly what it asked for —
            genuinely uncluttered, smaller mailboxes.
          </p>
        </div>
      </section>

      {/* ── SOURCES ─────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 pb-16">
        <h3 className="text-xs font-semibold uppercase tracking-widest mb-4 text-mist">Sources</h3>
        <ol className="text-xs text-mist space-y-2 list-decimal list-inside">
          <li>Microsoft 365 Business plan mailbox storage increase from 50 GB to 100 GB per user, effective 1 July 2026 — per current Microsoft 365 licensing communications.</li>
          <li>Microsoft 365 extra storage add-on, commonly listed at $0.20/GB/month; exact rate is not published as a fixed global price and varies by region, currency, and agreement type — confirm in your Microsoft 365 admin centre.</li>
          <li>Exchange Online Archiving add-on ($4/user/month) for auto-expanding archive up to 1.5 TB on Business Basic/Standard; included on Business Premium, E3, and E5. Storage beyond 1.5 TB billed at $0.25/GB/month as a consumption-based feature — Microsoft Learn, &ldquo;Learn about auto-expanding archiving.&rdquo;</li>
          <li>Microsoft Learn, &ldquo;Recoverable Items folder in Exchange Online&rdquo; — describes the Deletions and Purges subfolder lifecycle for deleted mailbox items.</li>
          <li>Microsoft Learn, &ldquo;Place a mailbox on Litigation Hold&rdquo; — describes preservation of Purges-subfolder items for the hold duration, including indefinite holds.</li>
          <li>Microsoft Learn, &ldquo;Outlook performance issues when you have a large PST or OST file&rdquo; — describes short pauses appearing around 10GB and increasing in frequency from 25GB, independent of your mailbox&apos;s storage quota.</li>
          <li>HDI (Help Desk Institute) 2025–2026 service desk benchmarking — average cost per IT support ticket $15.56 (range $2.93–$49.69), converted to GBP.</li>
          <li>2026 voluntary carbon market pricing for standard nature-based offset credits, €8–30/tonne CO₂e range — converted to GBP at the range&apos;s mid-point.</li>
          <li>Office for National Statistics, Annual Survey of Hours and Earnings, April 2025 — UK median gross full-time hourly wage of £19.67. Excludes employer on-costs (NI, pension), so this is a conservative floor rather than a fully-loaded cost.</li>
          <li>~2,300 emails per GB, measured from a real MailBroom account rather than a generic message-size average — the latter is typically quoted for message bodies only (~75KB) and badly overcounts at real mailbox scale once attachments, which dominate mailbox storage, are accounted for.</li>
        </ol>
      </section>

      {/* ── CTA ────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl md:text-4xl font-black text-cloud mb-6">
          See these numbers against <span className="gold-text">your own mailboxes.</span>
        </h2>
        <p className="text-mist mb-8 max-w-xl mx-auto">
          A 30-day IT assessment costs nothing and needs no card — just your own Microsoft 365 tenant.
        </p>
        <a
          href="/mailbroom/webapp/trial"
          className="btn-gold px-10 py-5 rounded-full text-lg inline-flex items-center gap-3"
        >
          <span>🧪</span> Start Your Free IT Assessment
        </a>
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
                <div className="text-xs text-mist">Registered in England &amp; Wales · No. 16587000</div>
              </div>
            </div>
            <div className="flex gap-6 text-sm text-mist flex-wrap justify-center">
              <a href="/mailbroom/webapp" className="hover:text-white transition-colors">MailBroom for Business</a>
              <a href="/mailbroom/webapp/storage-costs" className="hover:text-white transition-colors">Storage Costs</a>
              <a href="/mailbroom/webapp/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="/mailbroom/webapp/terms" className="hover:text-white transition-colors">Terms of Use</a>
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
