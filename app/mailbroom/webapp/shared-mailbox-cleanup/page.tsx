import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Can MailBroom Clean Up a Shared Mailbox? | AIERT Ltd",
  description:
    "Yes — MailBroom for Business can clean up a shared mailbox (info@, sales@) or a colleague's delegated mailbox, once your Microsoft 365 admin enables it. Here's exactly how it works.",
  keywords: [
    "clean up shared mailbox Microsoft 365",
    "shared mailbox full storage",
    "delegated mailbox cleanup",
    "info@ mailbox full",
    "Exchange Online shared mailbox storage",
    "MailBroom shared mailbox",
  ],
  metadataBase: new URL("https://business.mailbroom.app"),
  openGraph: {
    title: "Can MailBroom Clean Up a Shared Mailbox?",
    description: "Yes, once your admin enables it — here's exactly how shared and delegated mailbox cleanup works.",
    url: "https://business.mailbroom.app/shared-mailbox-cleanup",
    siteName: "AIERT Ltd",
    locale: "en_GB",
    type: "website",
  },
};

const faqs = [
  {
    q: "Can MailBroom clean up a shared mailbox like info@ or sales@?",
    a: "Yes. Any user with Exchange \"Full Access\" permission on a shared mailbox can connect it in MailBroom and run Smart Sweep, Storage Cleanup, or Power Search against it — the same way they clean their own mailbox, from the mailbox switcher in the top navigation.",
  },
  {
    q: "What has to happen before we can connect a shared mailbox?",
    a: "Two separate steps, both required. First, a one-time step: your organisation's Microsoft 365 admin enables shared mailbox access for the whole org from Admin → Shared Mailboxes — this grants a specific Microsoft permission (Mail.ReadWrite.Shared) and is off by default. Second, per mailbox: whoever wants to connect a shared mailbox needs real Exchange \"Full Access\" permission on it, granted by your admin in the Exchange admin centre, same as any other delegate access. MailBroom verifies this live before ever connecting a mailbox — it never assumes access.",
  },
  {
    q: "Does this also work for a colleague's individual mailbox, not just a shared mailbox?",
    a: "Yes — the mechanism is identical. If a colleague has granted you delegate Full Access to their own mailbox (a common setup for an assistant managing someone's inbox), you can connect it the same way once your org has enabled shared mailbox access.",
  },
  {
    q: "Is there a separate licence cost for a shared mailbox?",
    a: "No — connecting a shared or delegated mailbox uses your own existing seat, not a separate one. This matches Microsoft's own model, where a shared mailbox up to 50GB needs no licence of its own.",
  },
  {
    q: "Does cleaning a shared mailbox risk touching data it shouldn't?",
    a: "No — every action is scoped to exactly the mailbox you've connected and been granted access to, re-verified on the server on every request, never trusted from what the browser sends. It's the same delegated-access model Exchange itself uses, not a separate broad-access credential.",
  },
];

const techArticleJsonLd = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "Can MailBroom Clean Up a Shared Mailbox?",
  description: "How MailBroom for Business supports cleaning up shared and delegated mailboxes, once an org admin enables it.",
  url: "https://business.mailbroom.app/shared-mailbox-cleanup",
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

export default function SharedMailboxCleanupPage() {
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
            <a href="/mailbox-full" className="hover:text-white transition-colors font-medium">Mailbox Full</a>
            <a href="/msp-onboarding" className="hover:text-white transition-colors font-medium">For MSPs</a>
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
        <div className="badge-live inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium mb-6">
          <span className="w-2 h-2 rounded-full bg-gold animate-pulse inline-block" />
          Microsoft 365 · Shared &amp; Delegated Mailboxes
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight mb-6 text-cloud">
          Yes — <span className="gold-text">shared mailboxes too.</span>
        </h1>
        <p className="text-lg text-cloud leading-relaxed max-w-2xl mx-auto">
          info@, sales@, and any mailbox delegated to you fill up too, but nobody &ldquo;owns&rdquo; them
          the way a personal inbox is owned. Here&apos;s exactly how MailBroom cleans them up.
        </p>
      </section>

      {/* ── TWO STEPS ────────────────────────────────────── */}
      <section className="section-dark py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-teal">Two steps, both required</p>
            <h2 className="text-4xl font-black text-cloud">Org-level, then per mailbox</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="card-glass rounded-2xl p-8">
              <h3 className="font-bold text-cloud text-lg mb-2">1. Admin enables it, once</h3>
              <p className="text-sm text-cloud leading-relaxed">
                A one-time step from Admin → Shared Mailboxes, off by default. Grants a specific
                Microsoft permission for the whole organisation — after this, no further admin
                action is needed per mailbox.
              </p>
            </div>
            <div className="card-glass rounded-2xl p-8">
              <h3 className="font-bold text-cloud text-lg mb-2">2. Full Access, per mailbox</h3>
              <p className="text-sm text-cloud leading-relaxed">
                Whoever connects a specific shared mailbox needs real Exchange Full Access on it,
                granted by an admin in the Exchange admin centre — the exact same permission that
                already governs who can open that mailbox in Outlook.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-gold">In practice</p>
          <h2 className="text-4xl font-black text-cloud">Switch mailboxes, clean up the same way</h2>
        </div>
        <div className="card-glass rounded-2xl p-8">
          <p className="text-sm text-cloud leading-relaxed">
            Once enabled, connect a shared mailbox from the mailbox switcher in the top navigation —
            MailBroom verifies your access live before connecting it, never assumes. From there,
            Smart Sweep, Storage Cleanup, and Power Search all work exactly the same as they do on
            your own mailbox, scoped to only that mailbox and re-checked on every action.
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
          Not just your inbox — <span className="gold-text">every inbox that matters.</span>
        </h2>
        <p className="text-cloud mb-8 max-w-xl mx-auto">
          A 30-day IT assessment costs nothing and needs no card — just your own Microsoft 365 tenant.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/trial"
            className="btn-gold px-10 py-5 rounded-full text-lg inline-flex items-center gap-3 justify-center"
          >
            <span>🧪</span> Start Your Free IT Assessment
          </a>
          <a
            href="/msp-onboarding"
            className="btn-outline px-10 py-5 rounded-full text-lg inline-flex items-center gap-3 justify-center"
          >
            Read About MSP Rollouts
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
              <a href="/mailbox-full" className="hover:text-white transition-colors">Mailbox Full</a>
              <a href="/msp-onboarding" className="hover:text-white transition-colors">For MSPs</a>
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
