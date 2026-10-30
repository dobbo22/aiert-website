import type { Metadata } from "next";
import StoreBadges from "../../StoreBadges";
import { appStoreUrl, playStoreUrl } from "@/lib/tapcardInvites";
import JsonLd from "../JsonLd";

const DESCRIPTION =
  "One-touch marketing for your restaurant, café or shop: post a special offer or a news flash from your phone and the people who follow your card are notified on their phone.";

export const metadata: Metadata = {
  title: "TapCard Promote: one-touch marketing for your business – AIERT Ltd",
  description: DESCRIPTION,
  alternates: { canonical: "https://tapcard.aiert.co.uk/promote" },
  openGraph: {
    title: "TapCard Promote: one-touch marketing for your business",
    description: DESCRIPTION,
    images: ["https://www.aiert.co.uk/tapcard-wallet-hero.png"],
    siteName: "TapCard",
    type: "website",
  },
};

const WHAT_YOU_CAN_DO = [
  {
    title: "Special offers",
    body: "“Free dessert with any main.” Set how long it lasts and how many people can have it. Everyone who follows you gets a notification on their phone.",
  },
  {
    title: "Stamp cards",
    body: "Buy 3, get one free. You choose the number of stamps and the reward in your own words (a child's meal, a coffee, a haircut). Customers keep their stamp card on their phone, your staff add a stamp with a scan and your PIN, and the card starts again when the reward is given.",
  },
  {
    title: "News flashes",
    body: "“Fresh oysters in tonight.” “Closed Monday for a private party.” A short line, posted in seconds, that people see in the app and as a notification.",
  },
  {
    title: "Always up to date",
    body: "Change your menu, opening hours or details once and every saved copy updates itself. Booking, call, directions and reviews are one tap each.",
  },
  {
    title: "A QR sign for the window",
    body: "Print a sign headed with your business name. Customers scan it and save you in one tap. We can email it to you as a PDF, so you can print it from a computer.",
  },
];

const STEPS = [
  ["Make your card", "Try the demo on this website: type your business name and TapCard builds your card from your website, then emails you a link that opens it ready-made in the app. Or start in the free app: choose A business and it builds the card from your name and website."],
  ["Put the QR code where people look", "On the door, the till or a table. Customers scan it and save you, and with the TapCard app they can follow you for offers and news."],
  ["Post an offer or news", "Open TapCard, tap Promote, write a line and set a staff PIN. That is the whole job."],
  ["They claim it, you scan it", "Each person claims their own one-off QR code. Your staff scan it with a phone camera (or type the code on any till), enter the PIN, and it is marked as used. It can never be used twice."],
];

// Each answer repeats what the page says above; keep them in step.
const FAQ = [
  ["What is TapCard Promote?", "One-touch marketing for a restaurant, café, salon or shop. You post a special offer or a news flash from your phone, and the people who follow your card are notified on their phone."],
  ["How much does TapCard Promote cost?", "Free for the first 3 months, then £49.99 a year or £9.99 a month. One subscription covers one business card, and you can cancel any time in the App Store or Google Play. The TapCard app is free for your customers."],
  ["Do my customers need the TapCard app?", "Anyone can scan your QR code, see your card and save you. To follow you and get offers and news as notifications, they need the free TapCard app."],
  ["How does a customer claim an offer?", "Each person claims their own one-off QR code. Your staff scan it with a phone camera (or type the code on any till), enter the PIN, and it is marked as used. It can never be used twice."],
  ["Can I run a stamp card?", "Yes. You choose the number of stamps and the reward in your own words. Customers keep the stamp card on their phone, your staff add a stamp with a scan and your PIN, and the card starts again when the reward is given."],
  ["Will I be able to see who my customers are?", "No. You see numbers only: how many people claimed each offer, how many used it, how many follow you and how often your card is viewed. You never see who anyone is."],
  ["I have several locations. Which plan do I need?", "TapCard for Business. It is priced per location and billed yearly (£42 a year each for 2 to 4 locations, £34 each for 5 to 19, £27 each from 20), includes up to 10 staff cards per location and includes Promote on every card. One shop or one card? Choose Promote."],
] as const;

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } })),
};

export default function PromotePage() {
  const appStore = appStoreUrl("promote", "web");
  const playStore = playStoreUrl("promote", "web");
  return (
    <main className="pitch min-h-screen px-4 py-12">
      <JsonLd data={FAQ_JSON_LD} />
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          .pitch, .pitch * { background: #fff !important; color: #111 !important; box-shadow: none !important; }
          .pitch .card { border: 1px solid #bbb !important; }
          .pitch .no-print { display: none !important; }
          .pitch { padding: 0 !important; min-height: 0 !important; }
          .pitch h1 { font-size: 26pt !important; }
          .pitch a { text-decoration: none !important; }
        }
      `}</style>
      <div className="mx-auto max-w-5xl">
        <a href="/" className="inline-flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://www.aiert.co.uk/tapcard-icon.png" alt="" className="h-10 w-10 rounded-xl" />
          <span className="text-xl font-bold text-cloud">TapCard</span>
        </a>

        <section className="mt-10 grid items-center gap-10 md:grid-cols-[1.3fr_1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-teal">TapCard Promote · for restaurants, cafés, salons and shops</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-cloud sm:text-5xl">One-touch marketing for your business.</h1>
            <p className="mt-5 text-lg leading-relaxed text-cloud">
              Post a special offer or a news flash from your phone in under a minute. The people who follow your card get a notification on their phone, with no
              mailing list to build and no agency to pay.
            </p>
            <div className="no-print mt-6 flex flex-wrap items-center gap-3">
              <a href="/demo?utm_source=promote-page" className="btn-gold rounded-xl px-5 py-3 font-semibold">Build your card in 30 seconds</a>
              <span className="text-cloud">Type your business name and watch it happen. Nothing to install. Run a club or charity? <a href="/societies" className="underline">See TapCard for groups</a>.</span>
            </div>
            <div className="no-print mt-5 flex flex-wrap items-center gap-3">
              <StoreBadges appStoreUrl={appStore} playStoreUrl={playStore} />
            </div>
          </div>
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/api/restaurant-sample?frame=1"
              alt="A restaurant's TapCard on a phone, with a call button, book a table, menu and directions"
              className="w-56 sm:w-64"
            />
          </div>
        </section>

        <section className="mt-14 grid gap-4 sm:grid-cols-2">
          {WHAT_YOU_CAN_DO.map((f) => (
            <div key={f.title} className="card rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
              <h2 className="text-lg font-bold text-cloud">{f.title}</h2>
              <p className="mt-2 leading-relaxed text-cloud">{f.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-black text-cloud">How it works</h2>
          <ol className="mt-5 grid gap-4 sm:grid-cols-2">
            {STEPS.map(([title, body], i) => (
              <li key={title} className="card rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
                <p className="text-sm font-semibold text-gold">Step {i + 1}</p>
                <h3 className="mt-1 text-lg font-bold text-cloud">{title}</h3>
                <p className="mt-2 leading-relaxed text-cloud">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-14 grid gap-4 md:grid-cols-2">
          <div className="card rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
            <h2 className="text-lg font-bold text-cloud">You see what works</h2>
            <p className="mt-2 leading-relaxed text-cloud">
              How many people claimed each offer, how many came in and used it, how many people follow you and how often your card is viewed. Numbers
              only: you never see who anyone is.
            </p>
          </div>
          <div className="card rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
            <h2 className="text-lg font-bold text-cloud">Respectful by design</h2>
            <p className="mt-2 leading-relaxed text-cloud">
              Customers choose to follow you, choose what they get and can switch it off at any time. They get at most two notifications a week from a
              business, so your messages are welcome rather than ignored.
            </p>
          </div>
        </section>

        <section className="card mt-14 rounded-2xl bg-charcoal p-8 ring-1 ring-gold/40">
          <h2 className="text-2xl font-black text-cloud">Simple pricing</h2>
          <p className="mt-3 text-lg leading-relaxed text-cloud">
            The TapCard app is free to download and always free for your customers. Which plan you need depends on how many cards and
            people you have.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl bg-white/5 p-5 ring-1 ring-white/10">
              <p className="text-sm font-semibold uppercase tracking-wider text-teal">One business, one card</p>
              <h3 className="mt-1 text-xl font-bold text-cloud">TapCard Promote</h3>
              <p className="mt-2 leading-relaxed text-cloud">
                <strong>Free for the first 3 months</strong>, then <strong>£49.99 a year</strong> or <strong>£9.99 a month</strong>. One
                subscription covers <strong>one business card</strong>, and it includes sharing your own card. Cancel any time in the App
                Store or Google Play.
              </p>
            </div>
            <div className="rounded-xl bg-white/5 p-5 ring-1 ring-white/10">
              <p className="text-sm font-semibold uppercase tracking-wider text-teal">Several locations, or more than one person</p>
              <h3 className="mt-1 text-xl font-bold text-cloud">TapCard for Business</h3>
              <p className="mt-2 leading-relaxed text-cloud">
                A company plan instead of a Promote subscription, priced <strong>per location</strong> and billed yearly:{" "}
                <strong>£42 a year each</strong> for 2 to 4 locations, <strong>£34 each</strong> for 5 to 19, <strong>£27 each</strong> from 20.
                Every location gets its own card and up to 10 staff cards, and <strong>Promote is included on all of them</strong>. Head office sees
                one set of numbers. Try it free for 30 days. <a href="/business" className="text-gold underline">See TapCard for Business</a>.
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-cloud">
            Not sure which? One shop or one card? Choose Promote. Two or more locations? TapCard for Business works out cheaper per location
            than separate Promote subscriptions, and includes your staff cards.
          </p>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-black text-cloud">Questions about TapCard Promote</h2>
          <div className="mt-4 space-y-4">
            {FAQ.map(([q, a]) => (
              <div key={q} className="card rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
                <h3 className="text-lg font-bold text-cloud">{q}</h3>
                <p className="mt-2 leading-relaxed text-cloud">{a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 text-center">
          <h2 className="text-2xl font-black text-cloud">Try it this week.</h2>
          <p className="mt-2 text-cloud">Download TapCard, make your card, and post your first offer. Questions? We&apos;re happy to help.</p>
          <div className="no-print mt-5 flex flex-wrap items-center justify-center gap-4">
            <a href="/how-it-works" className="btn-gold rounded-xl px-6 py-3 font-semibold">See how it works</a>
            <a href="mailto:enquiries@aiert.co.uk?subject=TapCard%20Promote" className="rounded-xl px-6 py-3 font-semibold text-cloud ring-1 ring-slate hover:ring-mist">Email us</a>
          </div>
          <p className="mt-4 hidden text-cloud print:block">tapcard.aiert.co.uk/promote · enquiries@aiert.co.uk</p>
        </section>

        <footer className="mt-14 border-t border-slate pt-6 text-sm text-cloud">
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
