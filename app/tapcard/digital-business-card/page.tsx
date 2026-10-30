import type { Metadata } from "next";
import Link from "next/link";
import StoreBadges from "../../StoreBadges";
import { appStoreUrl, playStoreUrl } from "@/lib/tapcardInvites";
import JsonLd from "../JsonLd";

const DESCRIPTION =
  "A digital business card for your phone: share it with a QR code or a link, keep it in Apple Wallet or Google Wallet, and it stays up to date for everyone you've shared it with. No account to make, and nothing to install to receive one.";

export const metadata: Metadata = {
  title: "Digital business card app for the UK – TapCard",
  description: DESCRIPTION,
  alternates: { canonical: "https://tapcard.aiert.co.uk/digital-business-card" },
  openGraph: {
    title: "Digital business card app for the UK – TapCard",
    description: DESCRIPTION,
    images: ["https://www.aiert.co.uk/tapcard-wallet-hero.png"],
    siteName: "TapCard",
    type: "website",
  },
};

// Every point repeats what /how-it-works says; keep them in step.
const POINTS = [
  {
    title: "Share it with a tap of the camera",
    body: "Show your QR code and they scan it with their phone camera, or send your link by text, WhatsApp or email. You can also add it to your email signature.",
  },
  {
    title: "They don't need an app",
    body: "Your card opens in their browser and they tap Save Contact to put your details into their phone's contacts. No typing, no mistakes.",
  },
  {
    title: "Always up to date",
    body: "Change your job, number or links once and the same QR code and link show your latest details. Anyone you've sent your card to directly is kept current too, so there is nothing to resend.",
  },
  {
    title: "In Apple Wallet or Google Wallet",
    body: "Add your card to your phone's Wallet so it is always to hand. Pick a design in the app and your Wallet card matches.",
  },
  {
    title: "Works with no signal",
    body: "Tap Offline QR and your contact details are in the QR code itself, so it works with no signal and no app on their phone. You can also send your contact file by AirDrop.",
  },
  {
    title: "For you or your business",
    body: "Make a personal card, a work card, or a card for a restaurant, shop, salon or club. Business cards can carry booking, menu and review links, opening hours and offers.",
  },
];

const FAQ = [
  ["What is a digital business card?", "A business card that lives on your phone instead of paper. You share it with a QR code or a link, and the person you share it with saves your details straight into their contacts."],
  ["Does the person I share my digital business card with need an app?", "No. Your card opens in their browser and they tap Save Contact to put your details into their phone's contacts. Only people who want to receive your offers and news need the TapCard app."],
  ["Do I need an account to make a TapCard?", "No. There is nothing to sign up for. Answer what the card is for, add your details, and share it."],
  ["Can I use a digital business card with no phone signal?", "Yes. Tap Offline QR to show a QR code that holds your contact details themselves, so it works with no signal and no app on their phone."],
  ["Can I add my digital business card to Apple Wallet or Google Wallet?", "Yes. Add your card to your phone's Wallet so it is always to hand, and pick a design in the app so your Wallet card matches."],
  ["How much does TapCard cost?", "TapCard is free to download, and the first 1,000 users on each phone get it free for life. Businesses can add TapCard Promote for offers and news, which starts with 3 months free and then costs £49.99 a year or £9.99 a month."],
  ["Who makes TapCard?", "TapCard is made by AIERT Ltd, registered in England and Wales, No. 16587000."],
] as const;

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } })),
};

export default function DigitalBusinessCardPage() {
  const appStore = appStoreUrl("digital-business-card", "web");
  const playStore = playStoreUrl("digital-business-card", "web");
  return (
    <main className="min-h-screen px-4 py-12">
      <JsonLd data={FAQ_JSON_LD} />
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="inline-flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://www.aiert.co.uk/tapcard-icon.png" alt="" className="h-10 w-10 rounded-xl" />
          <span className="text-xl font-bold text-cloud">TapCard</span>
        </Link>

        <section className="mt-10 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal">Digital business card for iPhone and Android</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-cloud sm:text-5xl">Your business card, always on your phone.</h1>
          <p className="mt-5 text-lg leading-relaxed text-cloud">{DESCRIPTION}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a href="/demo?utm_source=digital-business-card" className="btn-gold rounded-xl px-5 py-3 font-semibold">Build your card in 30 seconds</a>
            <span className="text-cloud">Type your business name and watch it happen. Nothing to install.</span>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <StoreBadges appStoreUrl={appStore} playStoreUrl={playStore} />
          </div>
          <p className="mt-3 text-sm text-cloud">Free to download. The first 1,000 users on each phone get TapCard free for life.</p>
        </section>

        <section className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {POINTS.map((p) => (
            <div key={p.title} className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
              <h2 className="text-lg font-bold text-cloud">{p.title}</h2>
              <p className="mt-2 leading-relaxed text-cloud">{p.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-black text-cloud">Questions about digital business cards</h2>
          <div className="mt-4 space-y-4">
            {FAQ.map(([q, a]) => (
              <div key={q} className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
                <h3 className="text-lg font-bold text-cloud">{q}</h3>
                <p className="mt-2 leading-relaxed text-cloud">{a}</p>
              </div>
            ))}
          </div>
        </section>

        <p className="mt-10 text-center text-sm text-cloud">
          <a href="/how-it-works" className="underline">How TapCard works</a> · <a href="/business" className="underline">TapCard for business</a> ·{" "}
          <a href="/promote" className="underline">TapCard Promote</a> · <a href="/societies" className="underline">For clubs and charities</a> ·{" "}
          <a href="/privacy" className="underline">Privacy</a>
        </p>
      </div>
    </main>
  );
}
