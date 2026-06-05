import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "MailBroom – AI Email Cleaner for iPhone | AIERT Ltd",
  description:
    "MailBroom connects to any IMAP inbox and uses AI to classify, bulk-delete, unsubscribe, and organise your emails — 100% privately on your device. Sweep Mode clears 10,000 emails in minutes. Free with action limits, with Pro plans available in the App Store.",
  keywords: ["MailBroom", "email cleaner", "inbox cleaner", "unsubscribe", "bulk delete", "IMAP", "iOS", "AI", "AIERT", "sweep mode", "inbox zero"],
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
  { feature: "Scan coverage", free: "Full inbox", pro: "Full inbox" },
  { feature: "Mute sender · Keep Newest · Activity Log", free: true, pro: true },
  { feature: "Safe senders", free: true, pro: true },
  { feature: "Needs Reply scans", free: "3 scans", pro: "Unlimited" },
  { feature: "Sweep Mode (guided inbox clearing)", free: "5 sessions", pro: "Unlimited" },
  { feature: "Smart Sweep grouped actions", free: "Preview only", pro: true },
  { feature: "Smart Delete", free: "1 mass delete", pro: "Unlimited" },
  { feature: "Smart Unsubscribe", free: "5 operations", pro: "Unlimited" },
  { feature: "Smart Organise & folder rules", free: "1 rule", pro: "Unlimited" },
  { feature: "Custom folder icons & names", free: true, pro: true },
  { feature: "Power Search (search & bulk action)", free: true, pro: true },
  { feature: "Offline action queue (sync on reconnect)", free: true, pro: true },
  { feature: "Server-side rules (Gmail / Outlook)", free: false, pro: true },
  { feature: "Email accounts", free: "1 account", pro: "3-50 accounts (by plan)" },
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
              Sweep Mode guides you through your inbox one sender at a time — colour-coded
              cards suggest the right action instantly, clearing thousands of emails in minutes.
              Your emails never leave your phone.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="https://apps.apple.com/gb/app/mailbroom"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-gold px-8 py-4 rounded-full text-base inline-flex items-center gap-2 justify-center"
              >
                <span>🍎</span> Download on the App Store
              </a>
              <a href="#features" className="btn-outline px-8 py-4 rounded-full text-base inline-block text-center">
                See Features
              </a>
            </div>

            <div className="flex gap-8 mt-10">
              {[
                { value: "100%", label: "Private" },
                { value: "IMAP", label: "Universal" },
                { value: "Try Before You Buy", label: "Free Actions Included" },
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
                desc: "MailBroom analyses your senders, ranks them by volume, and classifies every email as Junk, Lists, or Keep — entirely on-device. For large inboxes, Sweep Mode launches automatically.",
              },
              {
                step: "03",
                icon: "🌬️",
                title: "Sweep, delete & organise",
                desc: "Sweep Mode presents colour-coded sender cards — red for delete, orange for unsubscribe, blue for keep. One tap per sender clears 10,000 emails in minutes.",
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

        {/* Sweep Mode */}
        <div className="grid md:grid-cols-2 gap-14 items-center">
          <div className="md:order-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-2xl mb-6 bg-cyan-500/10 text-cyan-400">
              🌬️
            </div>
            <div className="badge-live inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse inline-block" />
              New feature
            </div>
            <h2 className="text-3xl font-black text-cloud mb-4">Sweep Mode</h2>
            <p className="text-mist leading-relaxed mb-6">
              The fastest way to conquer a large inbox. MailBroom ranks your senders by volume —
              newsletters, retailers, and notifications first — then guides you through them one
              at a time. Colour-coded cards suggest the right action so you barely have to think.
              Free users get 5 sessions/month; Pro users get unlimited.
            </p>
            <ul className="space-y-3">
              {[
                "🔴 Red = Delete · 🟠 Orange = Unsubscribe · 🔵 Blue = Keep 30 Days",
                "Suggested action button highlighted — tap and move on",
                "Shows 3 recent emails per sender — tap to read the full content",
                "On-device AI flags emails that may need saving before you delete",
                "Progress saved — exit and resume any time",
                "Every decision trains the AI for smarter future sweeps",
                "⭐ Free sweeps remaining shown in toolbar with colour-coded badge",
              ].map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm text-mist">
                  <span className="mt-0.5 flex-shrink-0 text-cyan-400">✓</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-center md:order-1">
            <div className="relative">
              <div className="absolute -inset-10 rounded-full blur-3xl opacity-20 bg-cyan-500" />
              <div className="card-glass rounded-3xl p-6 max-w-xs w-full">
                <div className="text-cloud font-bold text-sm mb-4 text-center">Colour-coded sender cards</div>
                <div className="space-y-3">
                  {[
                    { label: "High Volume sender", badge: "Newsletter", action: "Delete All", headerColor: "bg-red-600", btnColor: "bg-red-500" },
                    { label: "Newsletter sender", badge: "Newsletter", action: "Unsubscribe", headerColor: "bg-orange-500", btnColor: "bg-orange-500" },
                    { label: "Retail sender", badge: "Retail", action: "Keep 30 Days", headerColor: "bg-blue-500", btnColor: "bg-blue-500" },
                  ].map(({ label, action, headerColor, btnColor }) => (
                    <div key={label} className="rounded-xl overflow-hidden">
                      <div className={`${headerColor} px-3 py-2`}>
                        <div className="text-white text-xs font-semibold">{label}</div>
                      </div>
                      <div className="bg-white/5 px-3 py-2 flex items-center justify-between">
                        <span className="text-mist text-xs">Suggested →</span>
                        <span className={`text-xs font-bold text-white px-2 py-1 rounded-lg ${btnColor} ring-2 ring-white/60`}>{action}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-center text-mist text-xs mt-4">10,000 emails cleared in minutes</div>
              </div>
            </div>
          </div>
        </div>

        {/* Smart Delete */}
        <div className="grid md:grid-cols-2 gap-14 items-center">
          <div>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-2xl mb-6 bg-gold/10 text-gold">
              🧹
            </div>
            <h2 className="text-3xl font-black text-cloud mb-4">Smart Delete</h2>
            <p className="text-mist leading-relaxed mb-6">
              Groups Junk and Lists emails by sender. Risk scoring warns you before deleting
              receipts or order confirmations. Bulk-delete thousands of emails in seconds with one tap.
            </p>
            <ul className="space-y-3">
              {[
                "Sender-grouped view with email counts",
                "Receipt & invoice risk warnings",
                "Quick-keep by date (last month, 6 months, year)",
                "Optional one-click unsubscribe while deleting",
                "Works offline — deletions queue and sync when reconnected",
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
              Set rules once — MailBroom files future emails automatically, even pushing them
              to Gmail filters and Outlook server rules so emails are sorted the moment they arrive.
            </p>
            <ul className="space-y-3">
              {[
                "Create colour-coded server folders with custom icons",
                "Edit folder name and icon — swipe left on any folder to customise",
                "Search by sender, address, or keyword",
                "Stage emails by date range, then apply in bulk",
                "Auto-rules: create rules from a move with one tap",
                "Filter rules by read status — Any, Read, or Unread",
                "Gmail & Outlook: rules pushed to the server instantly",
                "iCloud & IMAP: rules applied automatically on every scan",
                "Works offline — moves queue and sync automatically when reconnected",
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

        {/* Smart Sweep Grouped Mode */}
        <div className="grid md:grid-cols-2 gap-14 items-center">
          <div>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-2xl mb-6 bg-purple-500/10 text-purple-400">
              ✨
            </div>
            <div className="badge-live inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse inline-block" />
              Pro only
            </div>
            <h2 className="text-3xl font-black text-cloud mb-4">Smart Sweep Grouped Mode</h2>
            <p className="text-mist leading-relaxed mb-6">
              Group senders by category, choose a different action for each sender, then execute them all
              in bulk. AI suggests the safest action based on sender type — Keep 30 Days for newsletters,
              Archive for promotions. Takes priority over individual sweeps in Pro mode.
            </p>
            <ul className="space-y-3">
              {[
                "Filter by category: Newsletters, Retail, or Promotional",
                "Optional filters: unread only, older than 90 days",
                "Senders organised by category with email counts visible",
                "5 action options per sender: Keep, Keep 30 Days, Archive, Unsubscribe, Quick Apply",
                "AI pre-selects safest action based on sender classification",
                "Colour-coded action pills for instant visual feedback",
                "Bulk Apply button to execute all selected actions at once",
                "Real-time progress tracking during bulk execution",
                "Delete never available at group level — delete requires individual Sweep Mode",
                "Unsubscribe automatically archives emails (cleanup + opt-out in one step)",
                "Bulk actions pause individual sender sweep, then resume after completion",
                "Perfect for large inboxes — process 60+ senders in minutes instead of hours",
              ].map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm text-mist">
                  <span className="mt-0.5 flex-shrink-0 text-purple-400">✓</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute -inset-10 rounded-full blur-3xl opacity-20 bg-purple-500" />
              <div className="card-glass rounded-3xl p-6 max-w-xs w-full">
                <div className="text-cloud font-bold text-sm mb-4 text-center">Bulk Action Selection</div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="text-mist text-xs font-semibold">Newsletters (24 senders)</div>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-xs px-2 py-1 rounded-lg bg-orange-500/20 text-orange-300">Keep 30d: 12</span>
                      <span className="text-xs px-2 py-1 rounded-lg bg-blue-500/20 text-blue-300">Archive: 8</span>
                      <span className="text-xs px-2 py-1 rounded-lg bg-pink-500/20 text-pink-300">Unsub: 4</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-mist text-xs font-semibold">Retail (18 senders)</div>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-xs px-2 py-1 rounded-lg bg-orange-500/20 text-orange-300">Keep 30d: 18</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-mist text-xs font-semibold">High-Volume (12 senders)</div>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-xs px-2 py-1 rounded-lg bg-green-500/20 text-green-300">Keep: 12</span>
                    </div>
                  </div>
                </div>
                <div className="text-center text-mist text-xs mt-4">Apply all actions at once with progress tracking</div>
              </div>
            </div>
          </div>
        </div>

        {/* Power Search */}
        <div className="grid md:grid-cols-2 gap-14 items-center">
          <div className="md:order-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-2xl mb-6 bg-purple-500/10 text-purple-400">
              🔍
            </div>
            <h2 className="text-3xl font-black text-cloud mb-4">Power Search</h2>
            <p className="text-mist leading-relaxed mb-6">
              Search your entire inbox by sender, keyword, date range, or folder. Bulk-select
              results and delete or organise thousands of matching emails in one action.
            </p>
            <ul className="space-y-3">
              {[
                "Search by sender address, name, or keyword",
                "Filter by date range, folder, read/unread, and attachment",
                "Results grouped by sender for easy review",
                "Bulk-select all results or pick individual emails",
                "Delete or move to folder in one tap",
                "Works across all your IMAP folders, not just inbox",
              ].map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm text-mist">
                  <span className="mt-0.5 flex-shrink-0 text-purple-400">✓</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-center md:order-1">
            <div className="relative">
              <div className="absolute -inset-10 rounded-full blur-3xl opacity-20 bg-purple-500" />
              <div className="rounded-[2.8rem] border-2 border-purple-500/25 shadow-[0_0_40px_rgba(168,85,247,0.1)]">
                <PhoneFrame src="/mailbroom/power-search.png" alt="Power Search screen showing search results grouped by sender with bulk action options" />
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
                "Free on all tiers — no limits",
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

        {/* Draft Reply with Apple Intelligence */}
        <div className="grid md:grid-cols-2 gap-14 items-center">
          <div className="md:order-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-2xl mb-6 bg-blue-500/10 text-blue-400">
              ✍️
            </div>
            <h2 className="text-3xl font-black text-cloud mb-4">Draft Reply with Apple Intelligence</h2>
            <p className="text-mist leading-relaxed mb-6">
              MailBroom detects emails that need a reply — unread messages, requests with phrases like
              "let me know" or "please confirm", and emails you&apos;ve read but never responded to. Tap
              "Draft a Reply" and Apple Intelligence writes a suggested response on-device. Completely
              private — no internet, no API key, no data leaves your phone.
            </p>
            <ul className="space-y-3">
              {[
                "Needs Reply tab surfaces unanswered emails automatically",
                "Apple Intelligence drafts a reply on-device (iOS 26+)",
                "Edit the draft before sending — MailBroom never sends on your behalf",
                "Opens Mail app with To, Subject and body pre-filled",
                "Falls back to a smart template on older devices",
                "Free: 3 scans · Pro: unlimited",
              ].map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm text-mist">
                  <span className="mt-0.5 flex-shrink-0 text-blue-400">✓</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-center md:order-1">
            <div className="relative">
              <div className="absolute -inset-10 rounded-full blur-3xl opacity-20 bg-blue-500" />
              <div className="card-glass rounded-3xl p-10 text-center max-w-xs">
                <div className="text-6xl mb-4">✍️</div>
                <div className="text-cloud font-bold mb-2">On-device · Private</div>
                <div className="text-mist text-sm">Apple Intelligence drafts your reply without sending anything to the cloud</div>
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* ── DASHBOARD METRICS ──────────────────────────── */}
      <section className="section-dark py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-purple-400">Dashboard</p>
            <h2 className="text-4xl font-black text-cloud">Track your inbox health at a glance</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: "⏱️",
                title: "Time Saved",
                desc: "MailBroom estimates hours of manual cleanup work you've avoided. Each delete saves ~8s, unsubscribe ~40s, organise ~15s.",
              },
              {
                icon: "❤️",
                title: "Inbox Health %",
                desc: "The percentage of your current inbox classified as Keep — emails you want to see. Higher percentage means your inbox is cleaner and more focused.",
              },
              {
                icon: "📊",
                title: "Action Breakdown",
                desc: "Track emails deleted, unsubscribed from, and organised separately. See metrics from Sweep Mode, Smart Delete, and Smart Organise combined.",
              },
            ].map((item) => (
              <div key={item.title} className="card-glass rounded-2xl p-8">
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-lg font-bold text-cloud mb-3">{item.title}</h3>
                <p className="text-sm text-mist leading-relaxed">{item.desc}</p>
              </div>
            ))}
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
          <h2 className="text-4xl font-black text-cloud">Free to try · 99p for unlimited · Cancel anytime</h2>
          <p className="text-mist mt-4 max-w-2xl mx-auto leading-relaxed">
            No credit card required. No hidden fees. No "trial expiry" surprise.
            <br /><br />
            <strong className="text-cloud">Get 5 free storage cleanups and 5 free sweeps.</strong> Use them or save them for later – they never expire.
            <br /><br />
            Love MailBroom? Upgrade to Pro for just <strong className="text-gold">99p/month</strong> to unlock unlimited cleanups, sweeps, and every feature. Cancel anytime in your iPhone Settings.
            <br /><br />
            <span className="text-sm text-gold font-semibold">That's less than a coffee, and your emails never leave your phone.</span>
          </p>
          <div className="mt-8 p-6 bg-white/[0.05] rounded-2xl border border-white/10 max-w-2xl mx-auto">
            <p className="text-mist italic text-sm">
              <span className="text-gold font-semibold">"</span>Cleared my 45,000-email work inbox in 11 minutes. No cloud, no crash.<span className="text-gold font-semibold">"</span>
            </p>
            <p className="text-mist text-xs mt-3">— MailBroom Beta Tester</p>
          </div>
        </div>

        {/* What does cleanup and sweep mean */}
        <div className="max-w-3xl mx-auto mb-12 p-8 bg-white/[0.05] rounded-2xl border border-white/10">
          <h3 className="text-lg font-bold text-cloud mb-6">What counts as a "cleanup" or "sweep"?</h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <div className="flex items-start gap-3 mb-3">
                <div className="text-2xl">🗑️</div>
                <div>
                  <h4 className="font-semibold text-cloud">Storage Cleanup</h4>
                  <p className="text-sm text-mist mt-1">One bulk delete or archive action of up to 500 emails. For example: delete all emails from one sender, or archive everything older than 90 days.</p>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-start gap-3 mb-3">
                <div className="text-2xl">🌬️</div>
                <div>
                  <h4 className="font-semibold text-cloud">Sweep</h4>
                  <p className="text-sm text-mist mt-1">Clear all emails from one sender using Smart Triage. Choose delete, keep 30 days, unsubscribe + delete, or any combination.</p>
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-mist mt-6 border-t border-white/10 pt-6">
            Free tier: 5 of each. No time limit. Use them today, next week, or never – they never expire.
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
          <p className="text-center text-sm text-mist mb-8">All Pro plans include every feature above · prices may vary by region · cancel any time</p>
          <div className="card-glass rounded-3xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-6 py-4 text-mist font-semibold">Email accounts</th>
                  <th className="px-6 py-4 text-mist font-semibold text-center">Plan type</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Up to 3 accounts", plan: "Tier 1" },
                  { label: "Up to 10 accounts", plan: "Tier 2" },
                  { label: "Up to 20 accounts", plan: "Tier 3" },
                  { label: "Up to 50 accounts", plan: "Tier 4" },
                ].map((tier, i) => (
                  <tr key={tier.label} className={i % 2 === 0 ? "bg-white/[0.02]" : ""}>
                    <td className="px-6 py-4 text-cloud font-medium">{tier.label}</td>
                    <td className="px-6 py-4 text-center text-mist">{tier.plan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-center text-xs text-mist mt-4">
            Monthly and yearly prices are provided in the App Store at purchase time.
          </p>
        </div>

        <div className="text-center">
          <a
            href="https://apps.apple.com/gb/app/mailbroom"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-gold px-8 py-4 rounded-full text-base inline-flex items-center gap-2"
          >
            <span>🍎</span> Get Started Free
          </a>
          <p className="mt-4 text-xs text-mist">
            Try before you buy with free actions · Subscriptions managed by Apple · Cancel any time
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
          Try before you buy with free actions · Upgrade to Pro when you reach your limits · Your emails never leave your phone.
        </p>
        <a
          href="https://apps.apple.com/gb/app/mailbroom"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-gold px-10 py-5 rounded-full text-lg inline-flex items-center gap-3"
        >
          <span>🍎</span> Download Free
        </a>
        <p className="mt-4 text-sm text-mist">iOS 17.0+ · iPhone & iPad · Try before you buy with free actions · Pro plans in the App Store · cancel any time</p>
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
              <a href="/mailbroom/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="/mailbroom/terms" className="hover:text-white transition-colors">Terms of Use</a>
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
