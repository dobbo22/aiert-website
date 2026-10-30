import type { Metadata } from "next";
import SignupForm from "./SignupForm";
import JsonLd from "../JsonLd";
import { LOCATION_TIERS, MAX_LOCATIONS, PRICING_SENTENCE, STAFF_PER_LOCATION, tierLabel } from "@/lib/tapcardBizPricing";

const TITLE = "TapCard for Business";
const DESCRIPTION =
  "Roll TapCard out across your company: a locked, on-brand card template, bulk employee provisioning, and one subscription that covers everyone.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://tapcard.aiert.co.uk/business" },
};

const FEATURES = [
  {
    title: "Locked to your brand",
    body: "Logo, colours, website and social links are set once and apply to every employee's card — pick exactly which fields they can still edit themselves.",
  },
  {
    title: "Add everyone in one go",
    body: "Choose your staff list — a CSV or an Outlook, Google or iCloud contacts export — and get one invite link per person to send from your own email. The list stays on your computer.",
  },
  {
    title: "One subscription, no App Store paywall",
    body: "Employees share their card from day one — the personal lifetime-unlock paywall doesn't apply to company-provisioned cards.",
  },
  {
    title: "Priced per location",
    body: "£42 a year per location for 2 to 4 locations, £34 each for 5 to 19, £27 each from 20. Every location includes up to 10 staff cards, and Promote is included. Start with a 30-day free trial.",
  },
  {
    title: "Offers and numbers for every location",
    body: "Restaurant groups and multi-site businesses get TapCard Promote on every location card. Post special offers (each with a one-off QR code) and news from the admin page or the app, and see each location's card views, QR scans, saves and offers claimed and used in one place, with a CSV download.",
  },
];

// Each answer repeats what the page says above (prices come from lib/tapcardBizPricing); keep them in step.
const FAQ = [
  ["What is TapCard for Business?", "A way to give every employee and every location a digital business card on their phone. Logo, colours, website and social links are set once and locked to your brand, and you add your whole team in one go."],
  ["How much does TapCard for Business cost?", `${PRICING_SENTENCE} Start with a 30-day free trial.`],
  ["Does my team need to make an account or pay for the app?", "No. Employees share their card from day one. The personal lifetime-unlock paywall does not apply to company-provisioned cards, and the company pays one subscription."],
  ["How do I add all my staff at once?", "Choose your staff list (a CSV, or an Outlook, Google or iCloud contacts export) and you get one invite link per person to send from your own email. The list stays on your computer."],
  ["Can each branch post its own offers and news?", "Yes. Every location card includes TapCard Promote, so each branch can post special offers (each with a one-off QR code) and news to the people who follow it. Head office sees every location's views, scans, saves and offers claimed and used in one place, with a CSV download."],
  ["I only have one shop. Do I need TapCard for Business?", "No. Business starts at two locations. For one shop or one card, TapCard Promote in the app is £49.99 a year or £9.99 a month, with the first 3 months free."],
] as const;

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } })),
};

export default function TapCardBusinessPage() {
  return (
    <main className="min-h-screen px-4 py-12">
      <JsonLd data={FAQ_JSON_LD} />
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://www.aiert.co.uk/tapcard-icon.png" alt="" className="h-10 w-10 rounded-xl" />
          <span className="text-xl font-bold text-cloud">TapCard for Business</span>
        </header>

        <section className="mt-12 grid items-start gap-10 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-teal">For companies</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-cloud sm:text-5xl">
              TapCard, rolled out to your whole team.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-cloud">{DESCRIPTION}</p>
            <p className="mt-6">
              Already set up? <a href="/business/admin" className="text-gold underline">Sign in to your admin</a>
            </p>
            <p className="mt-3 text-cloud">
              Want to see one location first? <a href="/demo?utm_source=business-page" className="text-gold underline">Build a card in 30 seconds</a>, with nothing to install.
            </p>
          </div>
          <SignupForm />
        </section>

        <section className="mt-16 grid gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
              <h2 className="text-lg font-bold text-cloud">{f.title}</h2>
              <p className="mt-2 leading-relaxed text-cloud">{f.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-12 rounded-2xl bg-charcoal p-8 ring-1 ring-white/10">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal">Pricing</p>
          <h2 className="mt-2 text-2xl font-black text-cloud">Pay per location. The more you have, the less each one costs.</h2>
          <ul className="mt-4 max-w-md space-y-2 text-cloud">
            {LOCATION_TIERS.map((t) => (
              <li key={t.from} className="flex justify-between border-b border-slate/50 py-2">
                <span>{tierLabel(t)}</span>
                <span className="font-semibold">£{t.perYear} each a year</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-lg leading-relaxed text-cloud">
            Billed yearly. Every location includes its own card and up to {STAFF_PER_LOCATION} staff cards, and TapCard Promote (special offers and
            news) is included on every location card, so you don&apos;t also need a Promote subscription. Start with a 30-day free trial (one card).
            More than {MAX_LOCATIONS} locations? <a href="mailto:enquiries@aiert.co.uk?subject=TapCard%20for%20Business" className="text-gold underline">Get in touch</a>.
          </p>
          <p className="mt-3 leading-relaxed text-cloud">
            Just one shop or one card? You don&apos;t need TapCard for Business. <a href="/promote" className="text-gold underline">TapCard Promote</a> in the
            app is £49.99 a year or £9.99 a month, with the first 3 months free.
          </p>
        </section>

        <section className="mt-12 rounded-2xl bg-charcoal p-8 ring-1 ring-gold/40">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal">For restaurants, cafés, salons and shops</p>
          <h2 className="mt-2 text-2xl font-black text-cloud">One-touch marketing for every location</h2>
          <p className="mt-3 text-lg leading-relaxed text-cloud">
            Each branch gets its own card with its own address, phone, opening hours and booking link. From the admin page or the app you can post
            a <strong>special offer</strong> or a <strong>news flash</strong> to the people who follow that branch. They get a notification on their phone, claim
            their own one-off QR code, and your staff scan it and enter a PIN. Head office sees every location&apos;s followers, offers claimed and
            used in one place.
          </p>
          <p className="mt-4">
            <a href="/promote" className="btn-gold inline-block rounded-xl px-6 py-3 font-semibold">See what you can do with Promote</a>
          </p>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-black text-cloud">Questions about TapCard for Business</h2>
          <div className="mt-4 space-y-4">
            {FAQ.map(([q, a]) => (
              <div key={q} className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
                <h3 className="text-lg font-bold text-cloud">{q}</h3>
                <p className="mt-2 leading-relaxed text-cloud">{a}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-16 border-t border-slate pt-6 text-sm text-cloud">
          <a href="/promote" className="text-gold underline">TapCard Promote</a> ·{" "}
          <a href="/business/guide" className="text-gold underline">Admin guide</a> ·{" "}
          <a href="/business/security" className="text-gold underline">Security &amp; privacy</a> ·{" "}
          <a href="/privacy" className="text-gold underline">Privacy policy</a> · AIERT Ltd
        </footer>
      </div>
    </main>
  );
}
