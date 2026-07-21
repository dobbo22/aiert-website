import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Affiliate Guide – MailBroom | AIERT Ltd",
  description:
    "Everything affiliates need to promote MailBroom: how to get your link or short code, how attribution works, and tips for converting your audience.",
  metadataBase: new URL("https://aiert.co.uk"),
  openGraph: {
    title: "MailBroom Affiliate Guide",
    description: "How to get your link, share it, and get credited for every subscriber you bring to MailBroom.",
    url: "https://aiert.co.uk/mailbroom/affiliates",
    siteName: "AIERT Ltd",
    locale: "en_GB",
    type: "website",
  },
};

const steps = [
  {
    step: "01",
    icon: "🔗",
    title: "Get your link or code",
    desc: "Sign in to your Insert Affiliate dashboard and grab your unique Insert Link, or your short code (a memorable code like \"SAVE20\" you can say out loud or print).",
  },
  {
    step: "02",
    icon: "📣",
    title: "Share it with your audience",
    desc: "Drop your Insert Link in a video description, bio link, or post — or tell your audience to type your short code into MailBroom's paywall screen after they install the app.",
  },
  {
    step: "03",
    icon: "💰",
    title: "Get credited automatically",
    desc: "When someone you referred subscribes to MailBroom Pro, it's tracked and attributed to you automatically — no manual reporting, no spreadsheets.",
  },
];

const faqs = [
  {
    q: "What's the difference between an Insert Link and a short code?",
    a: "An Insert Link is a clickable URL — tap it and, if MailBroom is installed, the app opens directly with your attribution already applied (no \"Open in app?\" prompt). If it's not installed, it falls back to the App Store listing. A short code is a typed code (3–25 letters/numbers) for situations where a clickable link isn't practical — a YouTube video, a podcast, or a printed flyer. The listener opens MailBroom themselves and types your code in on the paywall screen.",
  },
  {
    q: "Where do I enter a short code in the app?",
    a: "On the subscription (paywall) screen, there's a small \"Have an affiliate code?\" link just above the Subscribe button. Tapping it reveals a text field to enter the code.",
  },
  {
    q: "How long does attribution last after someone clicks my link?",
    a: "Attribution is stored on the user's device as soon as they click your link or enter your code, and stays active for a set window even if they don't subscribe immediately — so you're still credited if they come back later and subscribe within that window.",
  },
  {
    q: "What if someone already has MailBroom installed?",
    a: "Insert Links use clipboard-based attribution as a fallback: tapping your link copies your affiliate identifier to their clipboard, and MailBroom checks for it the next time the app is opened — so attribution still works even if the deep link itself doesn't fire (e.g. the app was already running, or the link was shared somewhere that doesn't open apps directly).",
  },
  {
    q: "Does this work for both monthly and yearly subscriptions?",
    a: "Yes — any MailBroom Pro tier and billing period counts, and your commission is calculated automatically on each payment.",
  },
];

export default function MailBroomAffiliatesPage() {
  return (
    <div className="min-h-screen hero-gradient grid-bg">

      {/* ── NAV ─────────────────────────────────────────── */}
      <nav className="nav-glass sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between">
          <a href="/" className="flex items-center gap-4">
            <img src="/mailbroom-icon.png" alt="MailBroom" width={44} height={44} className="w-11 h-11 rounded-lg" />
            <span className="font-bold text-2xl tracking-tight text-cloud">
              MailBroom
            </span>
          </a>
          <div className="hidden md:flex items-center gap-10 text-base text-mist">
            <a href="/" className="hover:text-white transition-colors font-medium">Home</a>
            <a href="/mailbroom" className="hover:text-white transition-colors font-medium">MailBroom</a>
            <a href="/#contact" className="hover:text-white transition-colors font-medium">Contact</a>
          </div>
          <a
            href="https://apps.apple.com/gb/app/mailbroom"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-gold px-6 py-3 rounded-full text-base hidden md:block"
          >
            Get MailBroom
          </a>
        </div>
      </nav>

      {/* ── HEADER ──────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 pt-20 pb-12 text-center">
        <div className="badge-live inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium mb-6">
          <span className="w-2 h-2 rounded-full bg-gold animate-pulse inline-block" />
          Affiliate Programme
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-cloud mb-4">
          Promote MailBroom, <span className="gold-text">get paid</span>
        </h1>
        <p className="text-mist text-base leading-relaxed max-w-xl mx-auto">
          A full guide for affiliates: how to grab your link or code, how attribution works,
          and how to talk about MailBroom in a way that actually converts.
        </p>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────── */}
      <section className="section-dark py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-teal">How It Works</p>
            <h2 className="text-4xl font-black text-cloud">Three steps to your first commission</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((item) => (
              <div key={item.step} className="card-glass rounded-2xl p-8">
                <div className="text-xs font-black text-gold mb-4 tracking-widest">{item.step}</div>
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-lg font-bold text-cloud mb-3">{item.title}</h3>
                <p className="text-sm text-mist leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT IS MAILBROOM ────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-20">
        <div className="card-glass rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">📬</span>
            <h2 className="text-xl font-bold text-cloud">What you're promoting</h2>
          </div>
          <p className="text-mist leading-relaxed mb-4">
            MailBroom is an iOS app that connects to any IMAP inbox (Gmail, Outlook, iCloud, or
            any provider) and uses on-device AI to classify, bulk-delete, unsubscribe, and
            organise email — entirely privately, with nothing ever leaving the user&apos;s phone.
            Sweep Mode can clear 10,000+ emails in minutes.
          </p>
          <p className="text-mist leading-relaxed">
            It&apos;s free to try with action limits, with MailBroom Pro subscriptions unlocking
            unlimited bulk actions, multiple accounts, and server-side rules. That&apos;s the part
            you get a commission on.
          </p>
          <a href="/mailbroom" className="inline-block mt-6 text-gold underline hover:text-gold/80 transition-colors text-sm">
            See the full feature list →
          </a>
        </div>
      </section>

      {/* ── SHARING TIPS ─────────────────────────────────── */}
      <section className="section-dark py-20">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-teal">Tips</p>
            <h2 className="text-3xl font-black text-cloud">What actually converts</h2>
          </div>
          <ul className="space-y-4">
            {[
              "Lead with the pain, not the feature — \"I had 40,000 unread emails, this cleared it in 20 minutes\" beats \"AI-powered IMAP client.\"",
              "Privacy sells: MailBroom never sends emails to any server — everything runs on-device. Worth saying explicitly if your audience cares about data privacy.",
              "Show, don't tell — a before/after of an inbox count, or a quick screen recording of Sweep Mode, converts better than a written description.",
              "If you're sharing a typed code rather than a link, tell people exactly where to enter it: the paywall screen, behind \"Have an affiliate code?\".",
              "Mention it's free to try — no one needs to subscribe just to see if it works.",
            ].map((tip) => (
              <li key={tip} className="flex items-start gap-3 text-sm text-mist card-glass rounded-xl p-5">
                <span className="mt-0.5 flex-shrink-0 text-teal">✓</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── DEMO VIDEO ────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-20">
        <div className="card-gold-accent rounded-2xl p-8 text-center">
          <div className="text-2xl mb-4">🎬</div>
          <h2 className="text-xl font-bold text-cloud mb-3">Demo video</h2>
          <p className="text-mist text-sm leading-relaxed mb-6">
            A short screen recording of MailBroom in action — feel free to clip this into your
            own content.
          </p>
          <video controls className="w-full rounded-xl mx-auto max-w-xs" playsInline>
            <source src="/mailbroom/affiliate-demo.mp4" type="video/mp4" />
          </video>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────── */}
      <section className="section-dark py-20">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-teal">FAQ</p>
            <h2 className="text-3xl font-black text-cloud">Common questions</h2>
          </div>
          <div className="space-y-4">
            {faqs.map((f) => (
              <div key={f.q} className="card-glass rounded-2xl p-6">
                <h3 className="text-cloud font-bold mb-2">{f.q}</h3>
                <p className="text-mist text-sm leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT ───────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="text-2xl font-black text-cloud mb-4">Questions about the programme?</h2>
        <p className="text-mist mb-6">
          Reach out and we&apos;ll help you get set up.
        </p>
        <a
          href="mailto:enquiries@aiert.co.uk"
          className="btn-gold px-8 py-4 rounded-full text-base inline-block"
        >
          enquiries@aiert.co.uk
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
              <a href="/" className="hover:text-white transition-colors">AIERT Home</a>
              <a href="/mailbroom" className="hover:text-white transition-colors">MailBroom</a>
              <a href="/mailbroom/privacy" className="hover:text-white transition-colors">Privacy</a>
              <a href="/#contact" className="hover:text-white transition-colors">Contact</a>
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
