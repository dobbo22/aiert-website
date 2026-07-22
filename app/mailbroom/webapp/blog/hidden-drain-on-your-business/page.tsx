import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Hidden Drain on Your Business: Why Email Cleaning Is No Longer Optional | AIERT Ltd",
  description: "Email clutter costs time, storage budget, and carbon footprint. How MailBroom for Business turns your inbox from a cost centre into an efficiency engine.",
  keywords: ["email clutter cost business", "why clean up company email", "email management ROI", "mailbox storage cost", "email carbon footprint business"],
  metadataBase: new URL("https://business.mailbroom.app"),
  alternates: { canonical: "/blog/hidden-drain-on-your-business" },
  openGraph: {
    title: "The Hidden Drain on Your Business: Why Email Cleaning Is No Longer Optional",
    description: "How MailBroom for Business turns your inbox from a cost centre into an efficiency engine.",
    url: "https://business.mailbroom.app/blog/hidden-drain-on-your-business",
    siteName: "AIERT Ltd",
    locale: "en_GB",
    type: "article",
    images: [{ url: "https://business.mailbroom.app/mailbroom-business-og.png", width: 1200, height: 628, alt: "MailBroom for Business — inbox cleanup for the whole company" }],
  },
};

const faqs = [
  {
    q: "Does MailBroom read the contents of my emails to decide what's important?",
    a: "No. MailBroom for Business classifies mail using known sending-domain lists (mass-mailing providers like Mailchimp, SendGrid, Klaviyo), sender local-part patterns (noreply@, newsletter@, alerts@, and similar), and subject-line pattern matching for promotional and newsletter language. It never reads message bodies or attachment contents, and it doesn't do full-thread importance analysis — it's a deliberately simple, fast, server-side heuristic, not a machine-learning model.",
  },
  {
    q: "Does MailBroom automatically clean up mailboxes on a schedule?",
    a: "No — Smart Sweep and Storage Cleanup are actions an admin or employee runs when they choose to, not a background job that deletes mail automatically on a timer. There's no daily/weekly/monthly auto-cleanup feature. This is a deliberate design choice: bulk deletion should always be a decision someone makes, not something that happens silently in the background.",
  },
  {
    q: "Will cleaning up email break our compliance or retention obligations?",
    a: "It shouldn't. MailBroom doesn't manage or enforce your retention policies — Exchange Online and Microsoft Purview already do that. Items under an active retention policy or litigation hold are retained by Exchange Online's own hold mechanisms regardless of user-initiated deletion, so MailBroom's cleanup works within those obligations rather than around them. Always confirm this directly for your own tenant's configuration before running a bulk cleanup.",
  },
  {
    q: "How much will this actually save my company?",
    a: "We won't publish a generic before/after table with invented savings figures — that's not a credible way to answer this. MailBroom has a live ROI calculator that uses your actual employee count and mailbox sizes against published Microsoft storage-overage rates, a published average IT-ticket cost, and the ONS median UK wage for time value, with every figure footnoted to its source.",
  },
];

const techArticleJsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: "The Hidden Drain on Your Business: Why Email Cleaning Is No Longer Optional",
  description: "Email clutter costs time, storage budget, and carbon footprint. How MailBroom for Business turns your inbox from a cost centre into an efficiency engine.",
  url: "https://business.mailbroom.app/blog/hidden-drain-on-your-business",
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

export default function HiddenDrainPage() {
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
          <span className="inline-flex items-center px-3 py-1 rounded-full border bg-teal/10 border-teal/20 text-teal text-xs font-semibold">
            Business Case
          </span>
          <span className="text-mist text-xs">22 July 2026 · 8 min read</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-cloud leading-snug mb-4">
          The Hidden Drain on <span className="gold-text">Your Business</span>
        </h1>
        <p className="text-mist text-lg leading-relaxed mb-6">
          Why email cleaning is no longer optional — and how MailBroom turns your inbox from a cost centre into an efficiency engine.
        </p>
        <p className="text-mist text-sm">By <span className="text-cloud font-semibold">Martin Dobson</span>, AIERT Ltd</p>
      </section>

      {/* ── ARTICLE BODY ────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pb-16 space-y-8">

        <div className="card-glass rounded-2xl p-8 space-y-5 text-mist leading-relaxed">
          <p>
            The average knowledge worker receives 120+ emails per day and spends roughly 28% of their workweek managing that inbox — sorting, searching, deleting, triaging. Multiply that across a 50-person company and it&apos;s the equivalent of several full-time roles spent purely on inbox admin, before anyone&apos;s actually done any work.
          </p>
          <p>
            And that&apos;s before storage costs, security risk, and carbon footprint enter the picture. Email cleaning isn&apos;t about tidiness. <strong className="text-cloud">It&apos;s about time, cost, and sustainability.</strong>
          </p>
        </div>

        {/* Three hidden costs */}
        <div className="card-glass rounded-2xl p-8 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🕵️</span>
            <h2 className="text-xl font-bold text-cloud">The Three Hidden Costs of a Dirty Inbox</h2>
          </div>
          <div>
            <h3 className="text-cloud font-semibold mb-1">1. The Productivity Tax</h3>
            <p className="text-mist text-sm leading-relaxed">
              Every time someone searches for an important email buried among tens of thousands of old messages, they lose focus — and refocusing after an interruption takes real time (UC Irvine research puts it at roughly 20+ minutes on average). A cluttered inbox is a constant source of exactly that kind of interruption. The cost isn&apos;t just the sorting — it&apos;s the recovery time afterward.
            </p>
          </div>
          <div>
            <h3 className="text-cloud font-semibold mb-1">2. The Storage Bill That Keeps Growing</h3>
            <p className="text-mist text-sm leading-relaxed">
              Old attachments, years of newsletters, and duplicate threads sit on your Exchange Online storage indefinitely unless someone actively clears them. Microsoft bills storage overage once a mailbox crosses its plan&apos;s included quota, and average mailbox size only grows over time — so the bill grows with it.
            </p>
          </div>
          <div>
            <h3 className="text-cloud font-semibold mb-1">3. The Sustainability Blind Spot</h3>
            <p className="text-mist text-sm leading-relaxed">
              Every email stored in the cloud has a real, measurable carbon cost — the energy to store it, back it up, index it, and serve it back when searched. MailBroom&apos;s own published figure: <strong className="text-cloud">0.233 kg CO₂ per GB of storage freed</strong>, the same number used consistently across our carbon-savings page, ROI calculator, and account dashboard. A single 50,000-email cleanup frees roughly 200kg of CO₂ over the emails&apos; remaining lifetime in storage — about equivalent to not driving for two weeks.
            </p>
          </div>
        </div>

        {/* What happens when you clean house */}
        <div className="card-glass rounded-2xl p-8 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🧹</span>
            <h2 className="text-xl font-bold text-cloud">What Happens When You Clean House</h2>
          </div>
          <ul className="space-y-3 mt-2">
            {[
              "Faster triage — a mailbox with only relevant, actionable mail in it is faster to search and process than one with years of accumulated clutter.",
              "Lower storage costs — clearing oversized attachments and old newsletters reduces what you're paying Microsoft to store.",
              "Measurable sustainability gains — every GB freed has a quantified CO2 value, tracked per account with award tiers (Seedling to Earth Hero).",
              "Reduced attack surface — old, forgotten email is a real target; clearing it out reduces what's sitting there to be found.",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-mist">
                <span className="mt-0.5 flex-shrink-0 text-teal">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-mist text-xs leading-relaxed mt-2">
            We&apos;re not going to invent a specific % improvement figure for any of these without real customer data behind it — if you want that, it needs to come from an actual pilot, not a projection.
          </p>
        </div>

        {/* What sets MailBroom apart */}
        <div className="card-glass rounded-2xl p-8 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🎯</span>
            <h2 className="text-xl font-bold text-cloud">What Sets MailBroom Apart</h2>
          </div>
          <div>
            <h3 className="text-cloud font-semibold mb-1">A Fast, Accurate Heuristic Classifier</h3>
            <p className="text-mist text-sm leading-relaxed">
              MailBroom for Business classifies mail using known mass-mailing sending domains (Mailchimp, SendGrid, Klaviyo, and similar providers), sender local-part patterns (noreply@, newsletter@, alerts@, and similar), and subject-line pattern matching for promotional and newsletter language. To be precise about scope: it classifies based on sender, subject line, and headers — it does not read message bodies or attachment contents, and it doesn&apos;t do full-thread importance analysis. This is a deliberately simple, server-side approach rather than a machine-learning model — fast, predictable, and easy to reason about when it&apos;s deciding what counts as clutter across an entire company&apos;s mail.
            </p>
          </div>
          <div>
            <h3 className="text-cloud font-semibold mb-1">Company-Wide Deployment, Not Per-Person Licensing</h3>
            <p className="text-mist text-sm leading-relaxed">
              Unlike consumer tools that only cover one account at a time, MailBroom for Business is licensed once per organisation. IT signs in via Microsoft SSO, and every employee on the company&apos;s Microsoft domain gets access automatically — including shared and delegated mailboxes (info@, sales@, a colleague&apos;s mailbox), not just each person&apos;s own inbox.
            </p>
          </div>
          <div>
            <h3 className="text-cloud font-semibold mb-1">Smart Sweep, Storage Cleanup, and Power Search</h3>
            <p className="text-mist text-sm leading-relaxed">
              Smart Sweep groups mail by sender for bulk delete/unsubscribe decisions. Storage Cleanup surfaces the emails actually consuming the most space, browsable by age bracket or sender domain. Power Search finds and bulk-acts on specific mail across folders — and because it queries Microsoft Graph&apos;s own server-side search index directly, rather than downloading and scanning mail locally the way many consumer tools do, results come back from Exchange Online&apos;s own indexed search, not a client-side crawl. All of it runs through the browser — no install, no client-side software.
            </p>
          </div>
          <div>
            <h3 className="text-cloud font-semibold mb-1">Works Within Retention Policy and Legal Hold — Not Around Them</h3>
            <p className="text-mist text-sm leading-relaxed">
              MailBroom doesn&apos;t manage or enforce your retention policies — Exchange Online and Microsoft Purview already do that. What MailBroom does is respect what&apos;s already there: items under litigation hold or an active retention policy are retained by Exchange Online&apos;s own hold mechanisms regardless of user-initiated deletion, so cleanup can run without conflicting with obligations you already have in place.
            </p>
          </div>
        </div>

        {/* Real ROI */}
        <div className="card-glass rounded-2xl p-8 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">📊</span>
            <h2 className="text-xl font-bold text-cloud">The Real ROI — Calculated From Your Own Numbers</h2>
          </div>
          <p className="text-mist leading-relaxed">
            We&apos;re not going to publish a static before/after table with invented savings figures — that&apos;s not how real ROI works, and it&apos;s exactly the kind of thing that shouldn&apos;t be trusted at face value from anyone. Instead, MailBroom has a live, sourced ROI calculator that uses your actual employee count and mailbox sizes, published Microsoft storage-overage rates, a published average IT-ticket cost, and the ONS median UK wage for time value — with every figure footnoted to its source.
          </p>
          <a href="/roi" className="text-gold font-semibold hover:opacity-80 transition-opacity">See the calculator →</a>
        </div>

        {/* Why now */}
        <div className="card-glass rounded-2xl p-8 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">⏳</span>
            <h2 className="text-xl font-bold text-cloud">Why Now</h2>
          </div>
          <p className="text-mist leading-relaxed">
            Email volume doesn&apos;t stay flat — it grows as new projects, clients, and subscriptions accumulate. The longer cleanup is deferred, the larger and more time-consuming the eventual catch-up becomes. Addressing it now, with company-wide tooling, is meaningfully cheaper than addressing it later, one overdue &quot;mailbox full&quot; ticket at a time.
          </p>
        </div>

        {/* How to get started */}
        <div className="card-glass rounded-2xl p-8 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🚀</span>
            <h2 className="text-xl font-bold text-cloud">How to Get Started</h2>
          </div>
          <ol className="space-y-3 mt-2 list-decimal list-inside">
            {[
              "Request a free 30-day evaluation — a single time-limited login for whoever's assessing it (typically the IT director), no payment details required.",
              "Run Smart Sweep and Storage Cleanup yourself against your own tenant during the evaluation to see the real impact before deciding.",
              "Subscribe when you're satisfied — licensing is per company domain, not per person, so every employee gets access automatically via Microsoft SSO the moment the organisation has a paid plan, with no separate invite step.",
              "Check the ROI calculator with your own numbers to see the real, sourced case for your organisation.",
            ].map((item) => (
              <li key={item} className="text-sm text-mist leading-relaxed">{item}</li>
            ))}
          </ol>
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
            Stop paying to store <span className="gold-text">clutter.</span>
          </h2>
          <p className="text-mist mb-8">A 30-day evaluation, no payment details required.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/trial" className="btn-gold px-8 py-4 rounded-full font-bold text-center">Start a Trial</a>
            <a href="/roi" className="btn-outline px-8 py-4 rounded-full font-semibold text-center">See the ROI Calculator</a>
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
