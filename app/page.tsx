export default function Home() {
  return (
    <div className="min-h-screen hero-gradient grid-bg">

      {/* ── NAV ───────────────────────────────────────────── */}
      <nav className="nav-glass sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="nav-logo-icon w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm">
              AI
            </div>
            <span className="font-bold text-xl tracking-tight text-cloud">
              AIERT<span className="text-xs font-normal ml-1 text-mist">Ltd</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-mist">
            <a href="#about" className="hover:text-white transition-colors">About</a>
            <a href="#products" className="hover:text-white transition-colors">Products</a>
            <a href="#technology" className="hover:text-white transition-colors">Technology</a>
            <a href="#contact" className="hover:text-white transition-colors">Contact</a>
          </div>
          <a
            href="https://sharequest.co.uk"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-gold px-5 py-2 rounded-full text-sm hidden md:block"
          >
            Visit ShareQuest
          </a>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="badge-live inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium mb-8">
          <span className="w-2 h-2 rounded-full bg-gold animate-pulse inline-block" />
          Registered in England &amp; Wales · Company No. 16253779
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-tight mb-6">
          <span className="text-cloud">Artificial Intelligence</span>
          <br />
          <span className="gold-text">meets Financial Markets</span>
        </h1>

        <p className="text-lg md:text-xl max-w-2xl mx-auto mb-10 text-mist leading-relaxed">
          AIERT Ltd is a UK-based AI and financial technology company building intelligent platforms
          that empower everyday investors with professional-grade insights.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="https://sharequest.co.uk"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-gold px-8 py-4 rounded-full text-base inline-block"
          >
            Explore ShareQuest →
          </a>
          <a href="#about" className="btn-outline px-8 py-4 rounded-full text-base inline-block">
            Learn About AIERT
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto mt-20">
          {[
            { value: "2024", label: "Founded" },
            { value: "UK", label: "Registered" },
            { value: "AI+", label: "Powered" },
          ].map((s) => (
            <div key={s.label} className="card-glass rounded-2xl p-6 glow-gold">
              <div className="text-3xl font-black gold-text mb-1">{s.value}</div>
              <div className="text-sm text-mist">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── ABOUT ─────────────────────────────────────────── */}
      <section id="about" className="max-w-6xl mx-auto px-6 py-24">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-gold">About AIERT Ltd</p>
            <h2 className="text-4xl font-black leading-tight mb-6 text-cloud">
              Building the future of<br />
              <span className="teal-text">intelligent investing</span>
            </h2>
            <p className="mb-4 text-mist leading-relaxed">
              AIERT Ltd (AI Enhanced Research &amp; Technology) is a London-based technology company focused on
              applying artificial intelligence to financial markets. Our team combines deep expertise in machine
              learning, data engineering, and capital markets.
            </p>
            <p className="text-mist leading-relaxed">
              We believe cutting-edge financial tools should be accessible to everyone — not just institutional
              investors. Our platforms level the playing field by turning complex market data into clear,
              actionable intelligence.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: "🧠", title: "AI Research", desc: "Proprietary machine learning models trained on UK equity market data" },
              { icon: "📊", title: "Real-time Data", desc: "Live price feeds and fundamental analysis updated continuously" },
              { icon: "🏆", title: "Gamification", desc: "Competitive trading platforms that make learning engaging and rewarding" },
              { icon: "🔒", title: "Regulated Tech", desc: "Built with compliance and data security at its core" },
            ].map((item) => (
              <div key={item.title} className="card-glass rounded-2xl p-5">
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="font-bold mb-2 text-cloud">{item.title}</h3>
                <p className="text-sm text-mist">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRODUCTS ──────────────────────────────────────── */}
      <section id="products" className="section-dark py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-teal">Our Products</p>
            <h2 className="text-4xl font-black text-cloud">Platforms built for performance</h2>
          </div>

          {/* ShareQuest */}
          <div className="card-gold-accent rounded-3xl p-8 md:p-12 mb-8 glow-gold">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <div className="badge-gold inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-6">
                  ★ Flagship Product
                </div>
                <h3 className="text-3xl font-black mb-4 text-cloud">ShareQuest</h3>
                <p className="mb-6 text-mist leading-relaxed">
                  The UK&apos;s premier virtual stock trading competition platform. Users trade real UK stocks
                  with virtual funds in weekly, monthly, and annual competitions — competing for real cash prizes.
                  ShareQuest combines the excitement of competitive gaming with genuine financial education.
                </p>
                <ul className="space-y-3 mb-8">
                  {[
                    "Live FTSE 100 & 250 stock prices",
                    "AI-powered AIERT Index stock scoring",
                    "Weekly, monthly & annual competitions",
                    "Real cash prizes for top performers",
                    "iOS & Android mobile app",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm text-mist">
                      <span className="text-gold">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="https://sharequest.co.uk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-gold px-7 py-3 rounded-full text-sm inline-block"
                >
                  Visit sharequest.co.uk →
                </a>
              </div>
              <div className="flex flex-col gap-4">
                {[
                  { label: "Asset Universe", value: "FTSE 100 & 250" },
                  { label: "Competition Types", value: "Weekly · Monthly · Annual" },
                  { label: "Platform", value: "Web + iOS + Android" },
                  { label: "Analysis Engine", value: "AIERT AI Index" },
                ].map((stat) => (
                  <div key={stat.label} className="stat-gold rounded-xl px-5 py-4">
                    <div className="text-xs mb-1 text-mist">{stat.label}</div>
                    <div className="font-semibold text-gold">{stat.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AIERT Index */}
          <div className="card-teal-accent rounded-3xl p-8 md:p-12 glow-teal">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <div className="badge-teal inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-6">
                  AI Technology
                </div>
                <h3 className="text-3xl font-black mb-4 text-cloud">AIERT Index</h3>
                <p className="mb-6 text-mist leading-relaxed">
                  Our proprietary AI scoring engine analyses hundreds of data points across UK-listed equities —
                  including price momentum, fundamental strength, technical signals, and sector dynamics —
                  to produce a single composite score for each stock.
                </p>
                <ul className="space-y-3">
                  {[
                    "Multi-factor quantitative model",
                    "Fundamental & technical signal fusion",
                    "Real-time recalculation on market data",
                    "Sector-relative normalisation",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm text-mist">
                      <span className="text-teal">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col gap-4">
                {[
                  { label: "Model Type", value: "Multi-Factor AI" },
                  { label: "Coverage", value: "FTSE 100 & 250 Stocks" },
                  { label: "Output", value: "0–100 Composite Score" },
                  { label: "Refresh Rate", value: "Real-time" },
                ].map((stat) => (
                  <div key={stat.label} className="stat-teal rounded-xl px-5 py-4">
                    <div className="text-xs mb-1 text-mist">{stat.label}</div>
                    <div className="font-semibold text-teal">{stat.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TECHNOLOGY ────────────────────────────────────── */}
      <section id="technology" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-gold">Technology Stack</p>
          <h2 className="text-4xl font-black text-cloud">Built for scale &amp; reliability</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: "⚡", title: "Cloud Native", desc: "Deployed on globally distributed infrastructure with 99.9% uptime SLA, automatic scaling, and edge delivery." },
            { icon: "🤖", title: "Machine Learning", desc: "Custom ML pipelines process market data continuously, generating real-time insights and scoring updates." },
            { icon: "📱", title: "Cross-Platform", desc: "Native iOS and Android apps alongside a responsive web platform, all sharing a unified API layer." },
            { icon: "🔐", title: "Security First", desc: "End-to-end encryption, secure authentication, and regular third-party security audits protect user data." },
            { icon: "📈", title: "Real-time Data", desc: "Live market data integration with sub-second latency for price feeds across all UK-listed securities." },
            { icon: "🌍", title: "UK Focused", desc: "Purpose-built for UK equities, UK regulations, and UK investors — with GBP-native accounting throughout." },
          ].map((item) => (
            <div key={item.title} className="card-glass rounded-2xl p-6 hover:border-gold/30 transition-colors">
              <div className="text-4xl mb-4">{item.icon}</div>
              <h3 className="font-bold text-lg mb-3 text-cloud">{item.title}</h3>
              <p className="text-sm text-mist leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CONTACT ───────────────────────────────────────── */}
      <section id="contact" className="section-dark py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-teal">Get in Touch</p>
            <h2 className="text-4xl font-black text-cloud">Contact AIERT Ltd</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {[
              { icon: "✉️", title: "General Enquiries", detail: "info@aiert.co.uk", href: "mailto:info@aiert.co.uk", isExternal: false },
              { icon: "🏢", title: "Registered Address", detail: "England & Wales\nCompany No. 16253779", href: null, isExternal: false },
              { icon: "🌐", title: "ShareQuest Platform", detail: "sharequest.co.uk", href: "https://sharequest.co.uk", isExternal: true },
              { icon: "🤝", title: "Business Development", detail: "partnerships@aiert.co.uk", href: "mailto:partnerships@aiert.co.uk", isExternal: false },
            ].map((item) => (
              <div key={item.title} className="card-glass rounded-2xl p-6">
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="font-bold mb-2 text-cloud">{item.title}</h3>
                {item.href ? (
                  <a
                    href={item.href}
                    className="text-sm text-gold hover:underline"
                    target={item.isExternal ? "_blank" : undefined}
                    rel={item.isExternal ? "noopener noreferrer" : undefined}
                  >
                    {item.detail}
                  </a>
                ) : (
                  <p className="text-sm text-mist whitespace-pre-line">{item.detail}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────── */}
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
            <div className="flex gap-6 text-sm text-mist">
              <a href="#about" className="hover:text-white transition-colors">About</a>
              <a href="#products" className="hover:text-white transition-colors">Products</a>
              <a href="#contact" className="hover:text-white transition-colors">Contact</a>
              <a href="https://sharequest.co.uk/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Privacy</a>
              <a href="https://sharequest.co.uk/terms" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Terms</a>
            </div>
          </div>
          <div className="footer-divider mt-8 pt-8 text-center text-xs text-mist">
            © {new Date().getFullYear()} AIERT Ltd. All rights reserved. ShareQuest is a trading name of AIERT Ltd.
            AIERT Ltd does not provide financial advice. Past performance is not indicative of future results.
          </div>
        </div>
      </footer>

    </div>
  );
}
