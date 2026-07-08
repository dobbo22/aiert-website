import type { Metadata } from "next";
import { Suspense } from "react";
import TrialRequestForm from "./TrialRequestForm";

export const metadata: Metadata = {
  title: "Start Your Free 30-Day IT Assessment | MailBroom for Business",
  description:
    "No commitment, no payment details. Request a 30-day evaluation of MailBroom for Business for your Microsoft 365 tenant.",
  metadataBase: new URL("https://aiert.co.uk"),
  openGraph: {
    title: "Start Your Free 30-Day IT Assessment — MailBroom for Business",
    description: "No commitment, no payment details. See the savings for yourself.",
    url: "https://aiert.co.uk/mailbroom/webapp/trial",
    siteName: "AIERT Ltd",
    locale: "en_GB",
    type: "website",
  },
};

export default function TrialRequestPage() {
  return (
    <div className="min-h-screen hero-gradient grid-bg">

      {/* ── NAV ─────────────────────────────────────────── */}
      <nav className="nav-glass sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between">
          <a href="/mailbroom/webapp" className="flex items-center gap-4">
            <div className="nav-logo-icon w-11 h-11 rounded-lg flex items-center justify-center font-black text-base">
              AI
            </div>
            <span className="font-bold text-2xl tracking-tight text-cloud">
              AIERT<span className="text-sm font-normal ml-1 text-mist">Ltd</span>
            </span>
          </a>
          <div className="hidden md:flex items-center gap-10 text-base text-mist">
            <a href="/mailbroom/webapp" className="hover:text-white transition-colors font-medium">MailBroom for Business</a>
            <a href="/mailbroom/webapp/roi" className="hover:text-white transition-colors font-medium">Business Case</a>
          </div>
        </div>
      </nav>

      {/* ── HERO + FORM ─────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-24">
        <div className="grid md:grid-cols-2 gap-14 items-start">
          <div>
            <div className="badge-live inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-gold animate-pulse inline-block" />
              For IT Directors
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight mb-6 text-cloud">
              Start your free<br /><span className="gold-text">30-day IT assessment.</span>
            </h1>
            <p className="text-lg text-mist leading-relaxed mb-8">
              No commitment. No payment details. Tell us a little about your organisation and
              we&apos;ll set up a time-limited evaluation login so you can run MailBroom for
              Business against your own Microsoft 365 tenant.
            </p>
            <ul className="space-y-4">
              {[
                "No credit card, ever, for the assessment itself",
                "Full access to Smart Sweep, Storage Cleanup, and Power Search",
                "Set up by a person, usually within one business day",
                "Expires automatically at the end of the evaluation period",
              ].map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm text-mist">
                  <span className="mt-0.5 flex-shrink-0 text-gold">✓</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>

          <Suspense fallback={<div className="card-glass rounded-3xl p-8 md:p-10 h-96" />}>
            <TrialRequestForm />
          </Suspense>
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
                <div className="text-xs text-mist">Registered in England &amp; Wales · No. 16587000</div>
              </div>
            </div>
            <div className="flex gap-6 text-sm text-mist flex-wrap justify-center">
              <a href="/mailbroom/webapp" className="hover:text-white transition-colors">MailBroom for Business</a>
              <a href="/mailbroom/webapp/roi" className="hover:text-white transition-colors">Business Case</a>
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
