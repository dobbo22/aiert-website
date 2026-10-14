import type { Metadata } from "next";
import SignupForm from "./SignupForm";

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
    title: "Offers and numbers for every location",
    body: "Restaurant groups and multi-site businesses get TapCard Promote on every location card. Post special offers (each with a one-off QR code) and news from the admin page or the app, and see each location's card views, QR scans, saves and offers claimed and used in one place, with a CSV download.",
  },
];

export default function TapCardBusinessPage() {
  return (
    <main className="min-h-screen px-4 py-12">
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

        <section className="mt-12 rounded-2xl bg-charcoal p-8 ring-1 ring-gold/40">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal">For restaurants, cafés, salons and shops</p>
          <h2 className="mt-2 text-2xl font-black text-cloud">One-touch marketing for every location</h2>
          <p className="mt-3 text-lg leading-relaxed text-cloud">
            Each branch gets its own card with its own address, phone, opening hours and booking link. From the admin page or the app you can post
            a <strong>special offer</strong> or a <strong>news flash</strong> to the people who follow that branch. They are told straight away, claim
            their own one-off QR code, and your staff scan it and enter a PIN. Head office sees every location&apos;s followers, offers claimed and
            used in one place.
          </p>
          <p className="mt-4">
            <a href="/promote" className="btn-gold inline-block rounded-xl px-6 py-3 font-semibold">See what you can do with Promote</a>
          </p>
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
