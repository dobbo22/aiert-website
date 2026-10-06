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

        <footer className="mt-16 border-t border-slate pt-6 text-sm text-cloud">
          <a href="/business/guide" className="text-gold underline">Admin guide</a> ·{" "}
          <a href="/business/security" className="text-gold underline">Security &amp; privacy</a> ·{" "}
          <a href="/privacy" className="text-gold underline">Privacy policy</a> · AIERT Ltd
        </footer>
      </div>
    </main>
  );
}
