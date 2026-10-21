import type { Metadata } from "next";
import Link from "next/link";
import StoreBadges from "../../StoreBadges";
import { appStoreUrl, playStoreUrl } from "@/lib/tapcardInvites";

const DESCRIPTION =
  "Keep members and supporters in the loop without chasing them: people follow your club, society or charity once, and every news item you post reaches their phone.";

export const metadata: Metadata = {
  title: "TapCard for clubs, societies and charities – AIERT Ltd",
  description: DESCRIPTION,
  openGraph: {
    title: "TapCard for clubs, societies and charities",
    description: DESCRIPTION,
    images: ["https://www.aiert.co.uk/tapcard-wallet-hero.png"],
    siteName: "TapCard",
    type: "website",
  },
};

const WHAT_YOU_CAN_DO = [
  {
    title: "News that reaches people",
    body: "“AGM moved to Thursday.” “Rehearsal cancelled tonight.” One short line, posted in seconds from your phone, with an optional Read more link to the full story on your website or newsletter. Followers get a notification.",
  },
  {
    title: "Events and perks",
    body: "Offer a first session free, early-bird tickets or a members' discount. Each person claims their own one-off code, and your steward checks it with a PIN. Or run a stamp card: attend six sessions, get the seventh free.",
  },
  {
    title: "Details that never go out of date",
    body: "Meeting times, the venue, who to contact and your social pages live on your card. Change one thing and everyone who saved it has the new version.",
  },
  {
    title: "A QR code for the noticeboard",
    body: "Print a poster headed with your group's name. Anyone who scans it can save you and follow in one tap. Put it on the hall door, the newsletter, the membership form and the programme.",
  },
  {
    title: "Private for the people who follow",
    body: "You see how many people follow you, never who. Followers choose what they hear about and get at most two notifications a week from you.",
  },
  {
    title: "Kept tidy",
    body: "Posts are checked automatically: no abusive content, no gambling offers and no money-making scams. A raffle or fundraiser is fine, and we may take a look at it. Anyone can report a card, offer or news item from its page.",
  },
];

const STEPS = [
  ["Make your card", "Type your group's name on the demo and watch TapCard build a card from your website, then get a link that opens it ready-made in the free app."],
  ["Put the QR code where people look", "On posters, the noticeboard, your newsletter and the sign-in sheet. People scan, save you and follow."],
  ["Post when there is something to say", "Open TapCard, tap Promote, write a line. That is the whole job."],
];

export default function SocietiesPage() {
  const appStore = appStoreUrl("promote", "web");
  const playStore = playStoreUrl("promote", "web");
  return (
    <main className="pitch min-h-screen px-4 py-12">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="inline-flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://www.aiert.co.uk/tapcard-icon.png" alt="" className="h-10 w-10 rounded-xl" />
          <span className="text-xl font-bold text-cloud">TapCard</span>
        </Link>

        <section className="mt-10 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal">For clubs, societies, charities and community groups</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-cloud sm:text-5xl">Keep your members in the loop without chasing them.</h1>
          <p className="mt-5 text-lg leading-relaxed text-cloud">
            People follow your group once. When you have news, you post one line from your phone and it reaches theirs. No mailing list to build, no
            group chat to run, and nothing for you to pay an agency for.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a href="/demo?utm_source=societies-page" className="btn-gold rounded-xl px-5 py-3 font-semibold">Build your group&apos;s card in 30 seconds</a>
            <span className="text-cloud">Type its name and watch it happen. Nothing to install.</span>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <StoreBadges appStoreUrl={appStore} playStoreUrl={playStore} />
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
          <ol className="mt-5 grid gap-4 sm:grid-cols-3">
            {STEPS.map(([title, body], i) => (
              <li key={title} className="card rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
                <p className="text-sm font-semibold text-gold">Step {i + 1}</p>
                <h3 className="mt-1 text-lg font-bold text-cloud">{title}</h3>
                <p className="mt-2 leading-relaxed text-cloud">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-14 rounded-2xl bg-charcoal p-8 ring-1 ring-white/10">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal">Price</p>
          <h2 className="mt-2 text-2xl font-black text-cloud">Free for 3 months, then £49.99 a year or £9.99 a month.</h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-cloud">
            That covers one card with TapCard Promote (news, events and stamp cards). Making and sharing the card is free, and people who follow you
            never pay. Run a registered charity or a small society on a tight budget? Tell us about your group at{" "}
            <a href="mailto:enquiries@aiert.co.uk?subject=TapCard%20for%20our%20group" className="text-gold underline">enquiries@aiert.co.uk</a>.
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cloud">
            Followers must have the free TapCard app to receive news and offers. People without it can still see your card and its latest news on its page.
          </p>
        </section>

        <p className="mt-10 text-center text-sm text-cloud">
          <a href="/how-it-works" className="underline">How TapCard works</a> · <a href="/promote" className="underline">TapCard Promote for businesses</a> ·{" "}
          <a href="/privacy" className="underline">Privacy</a>
        </p>
      </div>
    </main>
  );
}
