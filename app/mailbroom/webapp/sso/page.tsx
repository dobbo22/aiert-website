import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Single Sign-On & Permissions – MailBroom for Business | AIERT Ltd",
  description: "How Microsoft Entra ID sign-in works in MailBroom for Business, exactly which Microsoft Graph permissions are requested, and why each one is needed.",
  metadataBase: new URL("https://aiert.co.uk"),
};

const permissions = [
  {
    scope: "openid, email, profile",
    kind: "Standard OpenID Connect scopes",
    why: "Confirms who's signing in — your name, email, and that you have a valid Microsoft account. Included automatically with every Microsoft sign-in.",
  },
  {
    scope: "offline_access",
    kind: "Delegated · Microsoft Graph",
    why: "Lets MailBroom refresh its own access token quietly in the background, so you're not prompted to sign in again every hour during a long cleanup session.",
  },
  {
    scope: "Mail.ReadWrite",
    kind: "Delegated · Microsoft Graph",
    why: "The core permission Smart Sweep, Storage Cleanup, and Power Search all depend on — reading mailbox contents to rank senders and size, and performing the bulk delete/move actions you choose.",
  },
  {
    scope: "Mail.Send",
    kind: "Delegated · Microsoft Graph",
    why: "Used for exactly one feature: notifying your organisation's admin by email the moment a seat-limit is reached, sent on the signed-in admin's own behalf. Not used anywhere else.",
  },
];

const sections = [
  {
    icon: "🔑",
    title: "Protocol",
    body: "MailBroom for Business uses OpenID Connect and OAuth 2.0 (the Authorization Code flow) against the Microsoft identity platform's v2.0 endpoint, via Microsoft Entra ID. It does not support SAML, and does not support any identity provider other than Microsoft Entra ID — this is a Microsoft 365-only product.",
  },
  {
    icon: "🏢",
    title: "Publisher",
    body: "MailBroom for Business is published by AIERT Ltd (Companies House No. 16587000) and is a Microsoft Publisher Verified application (MPN ID 7106038) — the sign-in consent screen shows AIERT Ltd's verified badge.",
  },
  {
    icon: "⚙️",
    title: "Configuration required",
    body: "None. There's no SAML metadata to exchange, no certificate to upload, and no SSO setup screen in the app. Sign-in uses Microsoft's own native OAuth flow — a user clicks \"Sign in with Microsoft\" and authenticates exactly as they would for Outlook or Teams. The only thing that can require IT action once is a one-time admin consent grant, described below.",
  },
  {
    icon: "🛡️",
    title: "Permissions requested",
    body: null,
    permissionsTable: true,
  },
  {
    icon: "✅",
    title: "One-time admin consent",
    body: "Some Microsoft 365 tenants are configured to require an administrator to approve a new application's permissions before any user in that tenant can sign in to it. If your tenant is configured this way, the first person to sign in will see a message asking an admin to grant consent — any Global Administrator or Cloud Application Administrator can do this in one click from that same screen, and it only needs doing once per organisation.",
  },
  {
    icon: "🧪",
    title: "Testing before you commit",
    body: "IT Directors evaluating MailBroom for Business can request a free 30-day trial — a time-limited login with full feature access, no card required, no company-wide licence purchase needed to test it against your own tenant.",
    link: { href: "/mailbroom/webapp/trial", label: "Request a trial →" },
  },
  {
    icon: "🚦",
    title: "Troubleshooting",
    list: [
      "\"Need admin approval\" on sign-in — your tenant requires admin consent for new apps. Any Global Administrator or Cloud Application Administrator can approve this once, from the same screen.",
      "Access revoked or lost — you or your IT admin can revoke MailBroom's Graph access at any time from your organisation's Microsoft Entra ID enterprise applications list, independent of anything in MailBroom itself.",
      "Personal email accounts (Gmail, Outlook.com, etc.) cannot use company licensing — access is scoped to verified business email domains only.",
    ],
  },
  {
    icon: "✉️",
    title: "Engineering & support contact",
    body: "For SSO onboarding, integration questions, or anything gallery/marketplace-review related, contact AIERT Ltd directly.",
    contact: true,
  },
];

export default function MailBroomSsoPage() {
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
            <a href="/mailbroom/webapp/privacy" className="hover:text-white transition-colors font-medium">Privacy</a>
            <a href="/#contact" className="hover:text-white transition-colors font-medium">Contact</a>
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
        <div className="text-5xl mb-6">🔑</div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-cloud mb-4">
          Single Sign-On &amp; Permissions
        </h1>
        <p className="text-mist text-base">
          MailBroom for Business &nbsp;·&nbsp; Last updated: 8 July 2026 &nbsp;·&nbsp; AIERT Ltd
        </p>
        <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal/10 border border-teal/20 text-teal text-sm font-medium">
          <span>✅</span> Microsoft Publisher Verified
        </div>
      </section>

      {/* ── HIGHLIGHTS ──────────────────────────────────── */}
      <section className="section-dark py-12">
        <div className="max-w-3xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {[
              { icon: "🔑", label: "OAuth 2.0 / OpenID Connect" },
              { icon: "🏢", label: "Microsoft Entra ID only" },
              { icon: "⚙️", label: "Zero SSO setup required" },
              { icon: "✅", label: "Publisher Verified · AIERT Ltd" },
            ].map((item) => (
              <div key={item.label} className="stat-teal rounded-xl p-4 text-center">
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="text-teal font-semibold text-xs">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTIONS ────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-16 space-y-6">
        {sections.map((s) => (
          <div key={s.title} className="card-glass rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{s.icon}</span>
              <h2 className="text-xl font-bold text-cloud">{s.title}</h2>
            </div>
            {s.body && (
              <p className="text-mist leading-relaxed">{s.body}</p>
            )}
            {s.list && (
              <ul className="space-y-3 mt-2">
                {s.list.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-mist">
                    <span className="mt-0.5 flex-shrink-0 text-teal">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
            {s.permissionsTable && (
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-sm mt-2">
                  <thead>
                    <tr className="border-b border-white/10 text-left">
                      <th className="px-2 py-2 text-mist font-semibold">Scope</th>
                      <th className="px-2 py-2 text-mist font-semibold">Type</th>
                      <th className="px-2 py-2 text-mist font-semibold">Why it's needed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {permissions.map((p) => (
                      <tr key={p.scope} className="border-b border-white/5 align-top">
                        <td className="px-2 py-3 font-mono text-xs text-gold whitespace-nowrap">{p.scope}</td>
                        <td className="px-2 py-3 text-xs text-mist whitespace-nowrap">{p.kind}</td>
                        <td className="px-2 py-3 text-mist">{p.why}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {s.link && (
              <a href={s.link.href} className="inline-block mt-4 text-gold font-semibold hover:underline">
                {s.link.label}
              </a>
            )}
            {s.contact && (
              <p className="text-mist leading-relaxed">
                Email AIERT Ltd at{" "}
                <a href="mailto:support@aiert.co.uk" className="text-gold underline hover:text-gold/80 transition-colors">
                  support@aiert.co.uk
                </a>
                {" "}— this is our named engineering and support contact for SSO onboarding and integration queries.
              </p>
            )}
          </div>
        ))}
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
              <a href="/mailbroom/webapp/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="/mailbroom/webapp/terms" className="hover:text-white transition-colors">Terms of Use</a>
              <a href="/mailbroom/webapp/security" className="hover:text-white transition-colors">Security &amp; Access</a>
              <a href="/mailbroom/webapp/support" className="hover:text-white transition-colors">Support</a>
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
