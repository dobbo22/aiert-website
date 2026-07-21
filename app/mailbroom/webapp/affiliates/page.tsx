import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Referral & Affiliate Programme – MailBroom for Business | AIERT Ltd",
  description:
    "Refer a company to MailBroom for Business and both sides get rewarded — or apply as an affiliate if you work with multiple Microsoft 365 clients.",
  metadataBase: new URL("https://business.mailbroom.app"),
  alternates: { canonical: "/affiliates" },
  openGraph: {
    images: [{ url: "https://business.mailbroom.app/mailbroom-business-og.png", width: 1200, height: 628, alt: "MailBroom for Business — inbox cleanup for the whole company" }],
    title: "MailBroom for Business — Referral & Affiliate Programme",
    description: "Refer a company, both sides get rewarded. IT consultants and MSPs can apply for cash commission.",
    url: "https://business.mailbroom.app/affiliates",
    siteName: "AIERT Ltd",
    locale: "en_GB",
    type: "website",
  },
};

const tracks = [
  {
    icon: "🤝",
    title: "Referral",
    who: "For anyone already using MailBroom for Business",
    reward: "10% off their first invoice for the company you refer, plus a free month credited to your own subscription once they convert to a paid plan.",
    cta: "Email us the company you're referring and we'll set up a code for them.",
  },
  {
    icon: "💼",
    title: "Affiliate",
    who: "For IT consultants, MSPs, and Microsoft partners who work with multiple client companies",
    reward: "30% cash commission on the referred company's subscription payments for their first 12 months, paid monthly as each payment clears.",
    cta: "Apply below — a good fit is anyone who already recommends Microsoft 365 tooling to their clients.",
  },
];

const faqs = [
  {
    q: "How does attribution actually work?",
    a: "You get a promotion code (e.g. \"YOURNAME10\"), not a tracking link. The company you refer enters it directly on MailBroom's own Stripe checkout page when they subscribe — there's a native \"Add promotion code\" field there. No cookies, no browser tracking, no risk of losing attribution because someone clicked your link on one device and subscribed from another.",
  },
  {
    q: "What if the company I refer cancels early?",
    a: "Commission is paid monthly as each payment actually clears, up to a maximum of 12 months per referred company — so if they cancel after 3 months, you're paid for those 3 months, not all 12.",
  },
  {
    q: "Does this apply to every seat band?",
    a: "Yes — MailBroom for Business is licensed per company domain, not per seat, so the referred company's discount and your commission are both based on whatever plan they actually subscribe to, regardless of size.",
  },
  {
    q: "How do I get a code?",
    a: "Email us — this programme is early and codes are set up individually for now, so we can make sure attribution is configured correctly for each referrer or affiliate.",
  },
];

export default function MailBroomWebAppAffiliatesPage() {
  return (
    <div className="min-h-screen hero-gradient grid-bg">

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
            <a href="/mailbroom/webapp/roi" className="hover:text-white transition-colors font-medium">Business Case</a>
            <a href="/mailbroom/webapp/trial" className="hover:text-white transition-colors font-medium">Free Assessment</a>
          </div>
          <a
            href="https://app.mailbroom.app/sign-in"
            className="btn-gold px-6 py-3 rounded-full text-base hidden md:block"
          >
            Sign in
          </a>
        </div>
      </nav>

      {/* ── HEADER ──────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 pt-20 pb-12 text-center">
        <div className="badge-live inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium mb-6">
          <span className="w-2 h-2 rounded-full bg-gold animate-pulse inline-block" />
          Referral &amp; Affiliate Programme
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-cloud mb-4">
          Refer a company, <span className="gold-text">both sides win.</span>
        </h1>
        <p className="text-cloud text-base leading-relaxed max-w-xl mx-auto">
          MailBroom for Business is licensed per company domain — so a referral is one company
          subscribing, not one person. Two ways to take part, depending on who you are.
        </p>
      </section>

      {/* ── TRACKS ─────────────────────────────────────── */}
      <section className="section-dark py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-8">
            {tracks.map((t) => (
              <div key={t.title} className="card-glass rounded-2xl p-8">
                <div className="text-4xl mb-4">{t.icon}</div>
                <h2 className="text-xl font-bold text-cloud mb-1">{t.title}</h2>
                <p className="text-xs text-gold font-semibold uppercase tracking-widest mb-4">{t.who}</p>
                <p className="text-sm text-cloud leading-relaxed mb-4">{t.reward}</p>
                <p className="text-sm text-cloud font-semibold">{t.cta}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-teal">FAQ</p>
          <h2 className="text-3xl font-black text-cloud">Common questions</h2>
        </div>
        <div className="space-y-4">
          {faqs.map((f) => (
            <div key={f.q} className="card-glass rounded-2xl p-6">
              <h3 className="text-cloud font-bold mb-2">{f.q}</h3>
              <p className="text-cloud text-sm leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CONTACT ───────────────────────────────────────── */}
      <section className="section-dark py-20 text-center">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl font-black text-cloud mb-4">Ready to refer someone, or apply as an affiliate?</h2>
          <p className="text-cloud mb-6">
            Email us the company you&apos;re referring, or a bit about your consultancy/MSP practice
            if you&apos;re applying as an affiliate.
          </p>
          <a
            href="mailto:enquiries@aiert.co.uk?subject=MailBroom%20for%20Business%20—%20Referral%2FAffiliate"
            className="btn-gold px-8 py-4 rounded-full text-base inline-block"
          >
            enquiries@aiert.co.uk
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
              <a href="/mailbroom/webapp/privacy" className="hover:text-white transition-colors">Privacy</a>
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
