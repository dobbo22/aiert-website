import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PowerSearch – Privacy & Support | AIERT Ltd",
  description:
    "PowerSearch is a multi-account email finder for iPhone and Android — sync headers from every account on-device, search across all of them, flag or forward what you find. Privacy policy and support.",
  metadataBase: new URL("https://www.aiert.co.uk"),
  alternates: { canonical: "/powersearch" },
  openGraph: {
    title: "PowerSearch – Privacy & Support",
    description:
      "A multi-account email finder for iPhone and Android. On-device header search, no server, no tracking.",
    url: "https://www.aiert.co.uk/powersearch",
    siteName: "AIERT Ltd",
    locale: "en_GB",
    type: "website",
  },
};

const guideSections = [
  { icon: "➕", title: "Add your accounts", img: "5-accounts.png", body: "Add a mail account: Gmail, Microsoft 365, iCloud, or any IMAP account. PowerSearch pulls down headers only (sender, subject, date, folder) for every folder, never the email body. The first sync of a large account can take a few minutes." },
  { icon: "🔄", title: "Sync", body: "Sync is manual: tap the sync icon to sync every account at once. A re-sync only pulls what is new, so it is quick after the first time. If an account shows a red error, tap Fix to update its password or sign in again." },
  { icon: "🔎", title: "Search", img: "2-sender-results.png", body: "Type in the search box. Results are grouped by sender and collapsed by default. Tap a sender to peek at their emails, or tap the magnifying-glass on that row to narrow the whole search to just that person." },
  { icon: "⌨️", title: "Search operators", img: "1-search.png", body: "Type operators straight into the search box: from:sarah, has:pdf, has:image, has:document, after:2026-01-01, before:2026-06-30. Combine as many as you like with ordinary words, for example \"from:sarah has:pdf invoice\"." },
  { icon: "📅", title: "Date and other filters", img: "4-filters.png", body: "The date chips (Today, This week and so on) are quick picks for when you roughly remember getting an email. Use Filters for exact date ranges, unread only, attachments, or limiting the search to certain accounts." },
  { icon: "↩️", title: "Flag, Reply and Forward", body: "Tap any result to read the full email. Flag marks it on your mail server. Reply, Reply All and Forward open your own email app with the message pre-filled; Reply is the default. PowerSearch never sends email itself." },
  { icon: "✨", title: "Enhance a TapCard contact", img: "3-drill-down.png", body: "In the free TapCard app, open a contact and tap Enhance this contact. PowerSearch reads the signature in their latest emails, on your phone only, and suggests missing details such as a mobile number, job title, website or address. You tick what to keep and it is added to their card in TapCard." },
  { icon: "🪪", title: "Search from TapCard", img: "3-drill-down.png", body: "If you also use the free TapCard app, open a contact there and tap Find emails in PowerSearch. PowerSearch opens locked to that person, showing every email from every address they have, across all your accounts." },
  { icon: "💳", title: "Trial and purchase", body: "PowerSearch is free for 7 days. After that it is a single one-time purchase, with no subscription." },
];

const privacySections = [
  {
    icon: "📋",
    title: "Overview",
    body: "PowerSearch adds every mail account you connect (Gmail, iCloud, Microsoft 365, or any IMAP account), pulls down email headers — sender, subject, date, folder, flags — for every folder, and lets you search across all of them at once to find a specific old email. It never downloads or stores an email's body; a body is only ever fetched live, on demand, when you open a result, and is never written to disk.",
  },
  {
    icon: "🔑",
    title: "Sign-in & Credentials",
    body: "For Gmail and Microsoft accounts, sign-in happens through Google's or Microsoft's own login screen — PowerSearch never sees or stores your password, only a scoped, revocable access token. For other IMAP accounts (iCloud, Yahoo, custom domains, etc.), your password is stored in the iOS Keychain, encrypted by iOS itself, and is never sent anywhere except directly to your mail provider's own server.",
  },
  {
    icon: "🗄️",
    title: "What's Stored — On Your Device Only",
    list: [
      "Account details — email address, mail server, and (for password-based accounts) an encrypted Keychain entry.",
      "Email headers — sender, subject, date, folder, and flag status for every synced folder. Never the email body.",
    ],
  },
  {
    icon: "🚫",
    title: "What's Never Stored",
    list: [
      "Email bodies — fetched live only when you open a specific result, never persisted to disk.",
      "Any data on a PowerSearch or AIERT server — there isn't one. PowerSearch has no backend; your device talks directly to your mail provider (IMAP or Microsoft Graph).",
      "Analytics or tracking of any kind — PowerSearch doesn't use any tracking or advertising SDKs, and doesn't track you across other apps or websites.",
    ],
  },
  {
    icon: "🚩",
    title: "Flag & Forward",
    body: "PowerSearch offers two actions on a found email: Flag, which writes a standard flag back to your mail server (the same one your mail app already shows), and Forward, which opens your device's own Mail app with the message pre-filled — PowerSearch never sends email itself.",
  },
  {
    icon: "👶",
    title: "Children",
    body: "PowerSearch is a productivity tool for managing existing email accounts and is not directed at children.",
  },
  {
    icon: "📝",
    title: "Changes to This Policy",
    body: "If we make material changes to this policy we will update the date at the top of this page.",
  },
];

export default function PowerSearchPage() {
  return (
    <div className="min-h-screen hero-gradient grid-bg">

      {/* ── NAV ─────────────────────────────────────────── */}
      <nav className="nav-glass sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between">
          <a href="/powersearch" className="flex items-center gap-4">
            <div className="nav-logo-icon w-11 h-11 rounded-lg flex items-center justify-center font-black text-base">
              PS
            </div>
            <span className="font-bold text-2xl tracking-tight text-cloud">
              PowerSearch
            </span>
          </a>
          <div className="hidden md:flex items-center gap-10 text-base text-cloud">
            <a href="/mailbroom" className="hover:text-white transition-colors font-medium">MailBroom for iOS</a>
            <a href="#privacy" className="hover:text-white transition-colors font-medium">Privacy</a>
            <a href="#support" className="hover:text-white transition-colors font-medium">Support</a>
          </div>
        </div>
      </nav>

      {/* ── HEADER ──────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 pt-20 pb-12 text-center">
        <div className="text-5xl mb-6">🔎</div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-cloud mb-4">
          PowerSearch
        </h1>
        <p className="text-cloud text-base max-w-xl mx-auto">
          A multi-account email finder for iPhone and Android. Sync headers from every account on-device,
          search across all of them at once, flag or forward what you find.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal/10 border border-teal/20 text-teal text-sm font-medium">
          <span>🔐</span> No server. No tracking. Bodies never stored.
        </div>
      </section>

      {/* ── GUIDE ───────────────────────────────────────── */}
      <section id="guide" className="max-w-3xl mx-auto px-6 py-16 space-y-6 scroll-mt-24">
        <h2 className="text-3xl font-black tracking-tight text-cloud text-center mb-2">
          How PowerSearch works
        </h2>
        <p className="text-cloud text-center text-sm mb-10">The same guide is in the app, under the ? button. Screens shown are from the Android app; iPhone looks very similar.</p>
        {guideSections.map((g) => (
          <div key={g.title} className="card-glass rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{g.icon}</span>
              <h3 className="text-xl font-bold text-cloud">{g.title}</h3>
            </div>
            <p className="text-cloud leading-relaxed">{g.body}</p>
            {"img" in g && g.img && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/powersearch-guide/${g.img}`}
                alt={g.title}
                loading="lazy"
                className="mx-auto mt-5 w-full max-w-[260px] rounded-2xl border border-white/10"
              />
            )}
          </div>
        ))}
      </section>

      {/* ── PRIVACY ─────────────────────────────────────── */}
      <section id="privacy" className="max-w-3xl mx-auto px-6 py-16 space-y-6 scroll-mt-24">
        <h2 className="text-3xl font-black tracking-tight text-cloud text-center mb-2">
          Privacy Policy
        </h2>
        <p className="text-cloud text-center text-sm mb-10">
          Last updated: 2 September 2026 &nbsp;·&nbsp; AIERT Ltd
        </p>
        {privacySections.map((s) => (
          <div key={s.title} className="card-glass rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{s.icon}</span>
              <h3 className="text-xl font-bold text-cloud">{s.title}</h3>
            </div>
            {s.body && (
              <p className="text-cloud leading-relaxed">{s.body}</p>
            )}
            {s.list && (
              <ul className="space-y-3 mt-2">
                {s.list.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-cloud">
                    <span className="mt-0.5 flex-shrink-0 text-teal">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </section>

      {/* ── SUPPORT ─────────────────────────────────────── */}
      <section id="support" className="section-dark py-16 scroll-mt-24">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-black tracking-tight text-cloud mb-4">Support</h2>
          <p className="text-cloud leading-relaxed mb-8">
            Questions, bug reports, or feature requests — get in touch and we&apos;ll get back to you.
          </p>
          <a
            href="mailto:enquiries@aiert.co.uk?subject=PowerSearch%20Support"
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
              <a href="/mailbroom" className="hover:text-white transition-colors">MailBroom for iOS</a>
              <a href="/powersearch#privacy" className="hover:text-white transition-colors">Privacy</a>
              <a href="/powersearch#support" className="hover:text-white transition-colors">Support</a>
            </div>
          </div>
          <div className="footer-divider mt-8 pt-8 text-center text-xs text-cloud">
            © {new Date().getFullYear()} AIERT Ltd. PowerSearch is a product of AIERT Ltd.
          </div>
        </div>
      </footer>

    </div>
  );
}
