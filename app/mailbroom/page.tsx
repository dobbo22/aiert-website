import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "MailBroom – AI Email Cleaner for iPhone | AIERT Ltd",
  description:
    "MailBroom connects to any IMAP inbox and uses AI to classify, bulk-delete, unsubscribe, and organise your emails — 100% privately on your device. Free on iOS.",
  keywords: ["MailBroom", "email cleaner", "inbox cleaner", "unsubscribe", "bulk delete", "IMAP", "iOS", "AI", "AIERT"],
  metadataBase: new URL("https://aiert.co.uk"),
  openGraph: {
    title: "MailBroom – AI Email Cleaner for iPhone",
    description: "Bulk-delete thousands of emails in seconds. Smart unsubscribe. Fully private — your emails never leave your device.",
    url: "https://aiert.co.uk/mailbroom",
    siteName: "AIERT Ltd",
    locale: "en_GB",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MailBroom – AI Email Cleaner for iPhone",
    description: "Bulk-delete thousands of emails in seconds. Smart unsubscribe. Fully private.",
  },
};

const freeVsPro = [
  { feature: "Scan & AI-classify emails", free: true, pro: true },
  { feature: "View & read emails", free: true, pro: true },
  { feature: "Delete single email", free: true, pro: true },
  { feature: "Scan limit", free: "500 emails", pro: "Unlimited" },
  { feature: "Bulk delete (2+ emails)", free: false, pro: true },
  { feature: "Smart Delete", free: false, pro: true },
  { feature: "Smart Unsubscribe", free: false, pro: true },
  { feature: "Smart Organise", free: false, pro: true },
  { feature: "Background sync", free: "Limited", pro: "Full" },
  { feature: "Safe senders", free: "5", pro: "Unlimited" },
];

function PhoneFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="phone-frame-wrap">
      <div className="absolute -inset-8 bg-gold/5 rounded-full blur-3xl" />
      <div className="relative rounded-[2.8rem] overflow-hidden shadow-2xl border-2 border-slate/50">
        <Image
          src={src}
          alt={alt}
          width={284}
          height={614}
          className="w-full h-auto block"
          priority
        />
      </div>
    </div>
  );
}

export default function MailBroomPage() {
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
            <a href="/" className="hover:text-white transition-colors font-medium">Home</a>
            <a href="/#products" className="hover:text-white transition-colors font-medium">Products</a>
            <a href="/#contact" className="hover:text-white transition-colors font-medium">Contact</a>
          </div>
          <a
            href="https://sharequest.co.uk"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-gold px-6 py-3 rounded-full text-base hidden md:block"
          >
            Visit ShareQuest
          </a>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="badge-live inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-gold animate-pulse inline-block" />
              iOS App · Available on the App Store
            </div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-tight mb-6">
              <span className="text-cloud">Clean your inbox</span>
              <br />
              <span className="gold-text">with AI.</span>
            </h1>
            <p className="text-lg text-mist leading-relaxed mb-8 max-w-lg">
              MailBroom connects to any IMAP email account and uses AI to classify,
              bulk-delete, unsubscribe, and organise your emails — 100% privately on your device.
              Your emails never leave your phone.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="https://apps.apple.com/gb/app/mailbroom"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-gold px-8 py-4 rounded-full text-base inline-flex items-center gap-2 justify-center"
              >
                <span>🍎</span> Download on App Store
              </a>
              <a href="#features" className="btn-outline px-8 py-4 rounded-full text-base inline-block text-center">
                See Features
              </a>
            </div>

            <div className="flex gap-8 mt-10">
              {[
                { value: "100%", label: "Private" },
                { value: "IMAP", label: "Universal" },
                { value: "Free", label: "To Start" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-2xl font-black gold-text">{s.value}</div>
                  <div className="text-xs text-mist">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center">
            <PhoneFrame src="/mailbroom/dashboard.png" alt="MailBroom dashboard showing 2,943 emails classified as Junk, Lists, and Keep" />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────── */}
      <section className="section-dark py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-teal">How It Works</p>
            <h2 className="text-4xl font-black text-cloud">Clean in three steps</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: "🔌",
                title: "Connect your inbox",
                desc: "Enter your IMAP server details (Gmail, Outlook, iCloud, or any email provider). Credentials are stored in iOS Keychain only — never sent to any third party.",
              },
              {
                step: "02",
                icon: "🤖",
                title: "AI scans & classifies",
                desc: "MailBroom downloads your emails and classifies each one as Junk, Lists, or Keep using on-device AI. The first 1,000 emails load before you see the UI.",
              },
              {
                step: "03",
                icon: "🧹",
                title: "Bulk clean in seconds",
                desc: "Delete thousands of emails, unsubscribe from mailing lists, and file the rest into organised folders — all in a few taps.",
              },
            ].map((item) => (
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

      {/* ── FEATURES ───────────────────────────────────── */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-24 space-y-24">

        {/* Smart Delete */}
        <div className="grid md:grid-cols-2 gap-14 items-center">
          <div>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-2xl mb-6 bg-gold/10 text-gold">
              🧹
            </div>
            <h2 className="text-3xl font-black text-cloud mb-4">Smart Delete</h2>
            <p className="text-mist leading-relaxed mb-6">
              Groups junk and newsletter emails by sender. Risk scoring warns you before deleting
              receipts or order confirmations. Bulk-delete thousands of emails in seconds with one tap.
            </p>
            <ul className="space-y-3">
              {[
                "Sender-grouped view with email counts",
                "Receipt & invoice risk warnings",
                "Quick-keep by date (last month, 6 months, year)",
                "Optional one-click unsubscribe while deleting",
              ].map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm text-mist">
                  <span className="mt-0.5 flex-shrink-0 text-gold">✓</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute -inset-10 rounded-full blur-3xl opacity-20 bg-gold" />
              <div className="rounded-[2.8rem] border-2 border-gold/25 shadow-[0_0_40px_rgba(251,191,36,0.1)]">
                <PhoneFrame src="/mailbroom/smart-delete.png" alt="Smart Delete screen showing Times Business emails with receipt warning and quick-keep options" />
              </div>
            </div>
          </div>
        </div>

        {/* Smart Organise */}
        <div className="grid md:grid-cols-2 gap-14 items-center">
          <div className="md:order-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-2xl mb-6 bg-teal/10 text-teal">
              📁
            </div>
            <h2 className="text-3xl font-black text-cloud mb-4">Smart Organise</h2>
            <p className="text-mist leading-relaxed mb-6">
              Create named folders on your own mail server and file emails by sender.
              Folders sync back to Gmail, Outlook, iCloud and any IMAP server.
            </p>
            <ul className="space-y-3">
              {[
                "Create colour-coded server folders",
                "Search by sender, address, or keyword",
                "Stage emails by date range, then apply in bulk",
                "Folders persist across sessions",
              ].map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm text-mist">
                  <span className="mt-0.5 flex-shrink-0 text-teal">✓</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-center md:order-1">
            <div className="relative">
              <div className="absolute -inset-10 rounded-full blur-3xl opacity-20 bg-teal" />
              <div className="rounded-[2.8rem] border-2 border-teal/25 shadow-[0_0_40px_rgba(45,212,191,0.1)]">
                <PhoneFrame src="/mailbroom/smart-organise.png" alt="Smart Organise screen showing folder creation and sender filing options" />
              </div>
            </div>
          </div>
        </div>

        {/* Smart Unsubscribe */}
        <div className="grid md:grid-cols-2 gap-14 items-center">
          <div>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-2xl mb-6 bg-sq-blue/10 text-sq-blue">
              ✉️
            </div>
            <h2 className="text-3xl font-black text-cloud mb-4">Smart Unsubscribe</h2>
            <p className="text-mist leading-relaxed mb-6">
              Sends RFC 8058 one-click unsubscribe requests on your behalf — the proper opt-out
              standard supported by Gmail, Outlook, and all major senders.
            </p>
            <ul className="space-y-3">
              {[
                "Works with all RFC 8058 compliant senders",
                "Runs silently in the background",
                "Combine with Smart Delete for a clean sweep",
                "No fake 'unsubscribe' workarounds",
              ].map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm text-mist">
                  <span className="mt-0.5 flex-shrink-0 text-sq-blue">✓</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute -inset-10 rounded-full blur-3xl opacity-20 bg-sq-blue" />
              <div className="rounded-[2.8rem] border-2 border-sq-blue/25 shadow-[0_0_40px_rgba(59,130,246,0.1)]">
                <PhoneFrame src="/mailbroom/smart-unsubscribe.png" alt="Smart Unsubscribe screen showing unsubscribe requests being sent to multiple senders" />
              </div>
            </div>
          </div>
        </div>

        {/* Safe Senders */}
        <div className="grid md:grid-cols-2 gap-14 items-center">
          <div className="md:order-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-2xl mb-6 bg-sq-green/10 text-sq-green">
              🛡️
            </div>
            <h2 className="text-3xl font-black text-cloud mb-4">Safe Senders</h2>
            <p className="text-mist leading-relaxed mb-6">
              One tap marks any sender as trusted — reclassifying all their emails to Keep and
              flagging them as not-junk on your mail server.
            </p>
            <ul className="space-y-3">
              {[
                "Works across Gmail, Outlook, iCloud, Dovecot",
                "Fires IMAP flag commands on the server",
                "Free: up to 5 safe senders · Pro: unlimited",
                "Instant reclassification on device",
              ].map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm text-mist">
                  <span className="mt-0.5 flex-shrink-0 text-sq-green">✓</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-center md:order-1">
            <div className="relative">
              <div className="absolute -inset-10 rounded-full blur-3xl opacity-20 bg-sq-green" />
              <div className="rounded-[2.8rem] border-2 border-sq-green/25 shadow-[0_0_40px_rgba(34,197,94,0.1)]">
                <PhoneFrame src="/mailbroom/safe-senders.png" alt="Safe Senders screen showing trusted senders list with shield icons" />
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* ── PRIVACY ────────────────────────────────────── */}
      <section className="section-dark py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="card-teal-accent rounded-3xl p-10 md:p-14 glow-teal text-center max-w-3xl mx-auto">
            <div className="text-5xl mb-6">🔒</div>
            <h2 className="text-3xl font-black text-cloud mb-4">100% Private by Design</h2>
            <p className="text-mist leading-relaxed mb-8 text-lg">
              MailBroom has no server, no account, and no cloud. Your emails are downloaded
              directly from your mail server to your phone over IMAP. They are classified on-device
              and never transmitted anywhere. Your credentials are stored exclusively in iOS Keychain.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {[
                { icon: "📵", label: "No external servers" },
                { icon: "🚫", label: "No data harvesting" },
                { icon: "📱", label: "On-device AI" },
                { icon: "🔑", label: "Keychain storage" },
              ].map((item) => (
                <div key={item.label} className="stat-teal rounded-xl p-4">
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <div className="text-teal font-semibold text-xs">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ────────────────────────────────────── */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-gold">Pricing</p>
          <h2 className="text-4xl font-black text-cloud">Free to start · Pro to go unlimited</h2>
          <p className="text-mist mt-4 max-w-xl mx-auto">
            Start for free — scan and classify up to 500 emails with no sign-up required.
            Upgrade to Pro for unlimited scanning and all power features. All plans include a 7-day free trial.
          </p>
        </div>

        {/* Free vs Pro feature table */}
        <div className="card-glass rounded-3xl overflow-hidden max-w-3xl mx-auto mb-12">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-6 py-4 text-mist font-semibold">Feature</th>
                <th className="px-6 py-4 text-mist font-semibold text-center">Free</th>
                <th className="px-6 py-4 text-gold font-semibold text-center">Pro</th>
              </tr>
            </thead>
            <tbody>
              {freeVsPro.map((row, i) => (
                <tr key={row.feature} className={i % 2 === 0 ? "bg-white/[0.02]" : ""}>
                  <td className="px-6 py-3 text-mist">{row.feature}</td>
                  <td className="px-6 py-3 text-center">
                    {row.free === false
                      ? <span className="text-white/25">✗</span>
                      : <span className="text-sq-green">{typeof row.free === "string" ? row.free : "✓"}</span>
                    }
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span className="text-gold">{typeof row.pro === "string" ? row.pro : "✓"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tier pricing table */}
        <div className="max-w-4xl mx-auto mb-10">
          <h3 className="text-center text-xl font-bold text-cloud mb-2">Choose your plan</h3>
          <p className="text-center text-sm text-mist mb-8">All Pro plans include every feature above · 7-day free trial (1 account) · cancel anytime</p>
          <div className="card-glass rounded-3xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-6 py-4 text-mist font-semibold">Email accounts</th>
                  <th className="px-6 py-4 text-mist font-semibold text-center">Monthly</th>
                  <th className="px-6 py-4 text-gold font-semibold text-center">
                    Yearly <span className="text-xs font-normal text-sq-green ml-1">Save ~37%</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Up to 3 accounts", monthly: "£1.99", yearly: "£14.99" },
                  { label: "Up to 10 accounts", monthly: "£3.99", yearly: "£29.99" },
                  { label: "Up to 20 accounts", monthly: "£5.99", yearly: "£44.99" },
                  { label: "Up to 50 accounts", monthly: "£8.99", yearly: "£69.99" },
                ].map((tier, i) => (
                  <tr key={tier.label} className={i % 2 === 0 ? "bg-white/[0.02]" : ""}>
                    <td className="px-6 py-4 text-cloud font-medium">{tier.label}</td>
                    <td className="px-6 py-4 text-center text-mist">{tier.monthly}<span className="text-xs text-mist/60">/mo</span></td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-gold font-semibold">{tier.yearly}</span>
                      <span className="text-xs text-mist/60">/yr</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="text-center">
          <a
            href="https://apps.apple.com/gb/app/mailbroom"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-gold px-8 py-4 rounded-full text-base inline-flex items-center gap-2"
          >
            <span>🍎</span> Start 7-Day Free Trial
          </a>
          <p className="mt-4 text-xs text-mist">
            Subscriptions managed by Apple · Cancel anytime in iPhone Settings → Subscriptions
          </p>
        </div>
      </section>

      {/* ── COMPATIBILITY ──────────────────────────────── */}
      <section className="section-dark py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-teal">Compatibility</p>
            <h2 className="text-4xl font-black text-cloud">Works with every inbox</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { icon: "📧", name: "Gmail", note: "IMAP or App Password" },
              { icon: "📮", name: "Outlook / Hotmail", note: "IMAP enabled" },
              { icon: "🍎", name: "iCloud Mail", note: "App-specific password" },
              { icon: "🌐", name: "Any IMAP", note: "All IMAP servers" },
            ].map((item) => (
              <div key={item.name} className="card-glass rounded-2xl p-5 text-center">
                <div className="text-3xl mb-3">{item.icon}</div>
                <div className="font-bold text-cloud text-sm mb-1">{item.name}</div>
                <div className="text-xs text-mist">{item.note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <h2 className="text-4xl md:text-5xl font-black text-cloud mb-6">
          Ready to reclaim<br />
          <span className="gold-text">your inbox?</span>
        </h2>
        <p className="text-lg text-mist mb-10 max-w-xl mx-auto">
          Free to download. No account required. Your emails stay on your phone.
        </p>
        <a
          href="https://apps.apple.com/gb/app/mailbroom"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-gold px-10 py-5 rounded-full text-lg inline-flex items-center gap-3"
        >
          <span>🍎</span> Download MailBroom Free
        </a>
        <p className="mt-4 text-sm text-mist">iOS 17.0+ · iPhone · Free with optional Pro upgrade</p>
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
                <div className="text-xs text-mist">Registered in England &amp; Wales · No. 16253779</div>
              </div>
            </div>
            <div className="flex gap-6 text-sm text-mist flex-wrap justify-center">
              <a href="/" className="hover:text-white transition-colors">AIERT Home</a>
              <a href="https://sharequest.co.uk" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">ShareQuest</a>
              <a href="/#contact" className="hover:text-white transition-colors">Contact</a>
              <a href="https://sharequest.co.uk/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Privacy</a>
            </div>
          </div>
          <div className="footer-divider mt-8 pt-8 text-center text-xs text-mist">
            © {new Date().getFullYear()} AIERT Ltd. MailBroom is a product of AIERT Ltd.
            AIERT Ltd does not provide financial advice.
          </div>
        </div>
      </footer>

    </div>
  );
}
