import type { Metadata } from "next";
import StoreBadges from "../StoreBadges";
import DemoVideo from "./DemoVideo";

const TITLE = "TapCard – your business card on your phone";
const DESCRIPTION =
  "Always be prepared, always up to date. Share your business card with a QR code or a link, and it stays in sync with everyone you've shared it with — even after they're saved. Free on iPhone and Android.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://tapcard.aiert.co.uk/" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://tapcard.aiert.co.uk/",
    images: ["https://www.aiert.co.uk/tapcard-email-card.png"],
    siteName: "TapCard",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["https://www.aiert.co.uk/tapcard-email-card.png"],
  },
};

const APP_STORE_URL = "https://apps.apple.com/app/id6816003159";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.mailbroom.tapcard";

const FEATURES = [
  {
    title: "Always in sync",
    body: "Change your job, number or links once and it updates everywhere — the same QR code and link always show your latest details, and anyone you've sent your card to directly is quietly kept current too.",
  },
  {
    title: "Share in seconds",
    body: "Show your QR code, send your link by text, WhatsApp or email, or keep your card in Apple Wallet.",
  },
  {
    title: "Send it straight to a contact",
    body: "Pick people from your phone's contacts and TapCard sends your card to each of them directly — over WhatsApp if they're on it, by email or text otherwise.",
  },
  {
    title: "They can share back, too",
    body: "Whoever you send your card to can share their own details back in one tap, with a live preview of their card as they type — no account or app needed on their end.",
  },
  {
    title: "No app needed to receive",
    body: "Your card opens in their browser. One tap on Save Contact and you're in their phone. No typing, no mistakes.",
  },
  {
    title: "Manage who's got your card",
    body: "See everyone you've shared your card with, who's accepted, and edit someone's details right up until you send — all from one list in the app.",
  },
];

// Home page for tapcard.aiert.co.uk (proxy.ts rewrites "/" to /tapcard).
export default function TapCardHomePage() {
  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://www.aiert.co.uk/tapcard-icon.png" alt="" className="h-10 w-10 rounded-xl" />
          <span className="text-xl font-bold text-cloud">TapCard</span>
        </header>

        <section className="mt-12 grid items-center gap-10 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-teal">The business card swapper</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-cloud sm:text-5xl">
              Your business card, always on you.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-cloud">
              Someone asks for your card and you&apos;ve run out, or left them at the office. With TapCard your card
              lives on your phone: share it with a QR code or a link, and swap details with anyone in one tap.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-cloud">
              Change your number or job title later and there&apos;s nothing to resend — everyone with your card,
              including the people you&apos;ve shared it with directly, is kept in sync automatically.
            </p>
            <p className="mt-4 text-lg font-semibold text-cloud">Always be prepared. Always current.</p>

            <StoreBadges appStoreUrl={APP_STORE_URL} playStoreUrl={PLAY_STORE_URL} className="mt-8" />
            <p className="mt-3 text-sm text-mist">Free to download on iPhone and Android.</p>
          </div>

          <DemoVideo />
        </section>

        <section className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
              <h2 className="text-lg font-bold text-cloud">{f.title}</h2>
              <p className="mt-2 leading-relaxed text-cloud">{f.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-12 flex flex-wrap gap-4">
          <a href="/how-it-works" className="btn-gold rounded-xl px-6 py-3 font-semibold">
            See how it works
          </a>
          <a
            href="/support"
            className="rounded-xl px-6 py-3 font-semibold text-cloud ring-1 ring-slate hover:ring-mist"
          >
            Help &amp; support
          </a>
        </section>

        <footer className="mt-16 border-t border-slate pt-6 text-sm text-cloud">
          <p>
            TapCard is made by AIERT Ltd, registered in England &amp; Wales, No. 16587000.{" "}
            <a href="/how-it-works" className="text-gold underline">How it works</a> ·{" "}
            <a href="/support" className="text-gold underline">Support</a> ·{" "}
            <a href="/privacy" className="text-gold underline">Privacy</a> ·{" "}
            <a href="mailto:enquiries@aiert.co.uk" className="text-gold underline">enquiries@aiert.co.uk</a>
          </p>
        </footer>
      </div>
    </main>
  );
}
