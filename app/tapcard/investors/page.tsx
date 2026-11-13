import type { Metadata } from "next";
import JsonLd from "../JsonLd";

const DESCRIPTION =
  "TapCard for investor relations: a QR code on your results slides, annual report or AGM notice lets shareholders follow your company and get your RNS headlines on their phone. Anonymous, free for shareholders, set up by us.";

export const metadata: Metadata = {
  title: "TapCard for investor relations: reach shareholders on their phone – AIERT Ltd",
  description: DESCRIPTION,
  alternates: { canonical: "https://tapcard.aiert.co.uk/investors" },
  openGraph: {
    title: "TapCard for investor relations",
    description: DESCRIPTION,
    images: ["https://www.aiert.co.uk/tapcard-wallet-hero.png"],
    siteName: "TapCard",
    type: "website",
  },
};

const STEPS = [
  ["Put a QR code on what shareholders already read", "Your investor presentation, results slides, annual report, AGM notice or website. One code for the company, and one for each person who speaks for it."],
  ["A shareholder scans it", "They land on your company's card: latest news, contacts, and links to your investor pages, RNS list, reports and share price. They can read it in their browser, with nothing to install."],
  ["They follow you in the TapCard app", "Following is their choice, it is free for them, and they can stop at any time. They need the app to receive notifications; without it they can still read the card."],
  ["You post a headline when you announce", "A one-line headline with a link to the full RNS, posted from a phone or the web. Followers are notified. You decide what goes out and when."],
];

const POINTS = [
  { title: "It doesn't replace the RNS", body: "The announcement still goes out through your normal channels. TapCard is for telling people it has happened and pointing them to it. We suggest a post goes out only after an announcement is public and says nothing that is not in it. What you may and may not say, and when, is for you and your advisers." },
  { title: "Followers who choose to share", body: "You see how many people follow and how many can receive a notification. A shareholder can also choose to share their name and email with you when they follow; you see only those who do, and they can withdraw at any time. Followers who don't share stay anonymous." },
  { title: "Your investor pages, in one tap", body: "RNS announcements, reports and results, shareholder information, investor presentations and share price all sit on the card as one-tap links to your own website. Nothing is copied; change your website and the links still work." },
  { title: "Several voices", body: "Cards for the chair, CEO, CFO and IR contact, all in the company's branding, on one account. The company decides who may post." },
];

const TIERS = [
  { name: "Small listed", who: "AIM and smaller quoted companies", price: "£600", per: "a year", points: ["The company card plus up to 5 more cards (CEO, CFO, IR contact and others)", "RNS headline posting from a phone or the web", "Follower and view numbers, with a CSV", "Set up by us from your website"] },
  { name: "Standard", who: "Mid-sized listed companies", price: "£1,500", per: "a year", points: ["Everything in Small listed, with up to 10 more cards", "A posting allowance agreed with you for results season", "QR sign files (PDF) for presentations and the AGM", "Priority support"] },
  { name: "Large", who: "FTSE and larger groups", price: "From £3,500", per: "a year, quoted", points: ["Several brands or divisions on one account", "Allowance and set-up agreed with you", "A named contact"] },
];

const FAQ: [string, string][] = [
  ["What does a shareholder need?", "To scan the QR code they need only their phone's camera, and the card opens in the browser. To follow the company and receive its headlines as notifications they install the free TapCard app (iPhone and Android) and choose to follow."],
  ["Do we see who follows us?", "By default, no: you see a count of followers and of how many can receive a notification. A shareholder who follows your investor relations card can choose Follow and share my details, which gives you their name and email. You see only the people who chose to, and they can withdraw at any time. What you do with those details is your responsibility."],
  ["Does this replace RNS or our investor relations website?", "No. It sits beside them. The card links to your own investor pages and to the RNS list, and a post is a short headline with a link."],
  ["Can we post before the announcement is public?", "We recommend not, and the service is built around posting after the announcement. Whatever you post is your decision and your responsibility; please take your own advice on market abuse and disclosure rules."],
  ["How is it priced?", "Yearly, in pounds, plus VAT, for UK companies. The three plans above are a guide: we agree the plan with you when we set the company up. The first five companies get a founding price of £395 for the first year."],
  ["How do we start?", "Email us the company name and website. We build the company's card from your website, add your RNS and investor links, and send you a link to see it before anything goes live."],
  ["We are an investor relations adviser. Can we offer this to our clients?", "Yes. Advisers who introduce clients earn 20% of the annual fee for as long as the client stays, paid yearly. Depending on your regulatory position you may need to tell your client about a referral fee; please take your own advice on that."],
];

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } })),
};

export default function InvestorsPage() {
  return (
    <main className="pitch min-h-screen px-4 py-12">
      <JsonLd data={FAQ_JSON_LD} />
      <div className="mx-auto max-w-5xl">
        <a href="/" className="inline-flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://www.aiert.co.uk/tapcard-icon.png" alt="" className="h-10 w-10 rounded-xl" />
          <span className="text-xl font-bold text-cloud">TapCard</span>
        </a>

        <section className="mt-10">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal">TapCard for investor relations · for listed companies and their advisers</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-cloud sm:text-5xl">Reach your shareholders on their phone.</h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-cloud">
            Put a QR code on your results slides, annual report or AGM notice. Shareholders scan it, follow your company, and get your RNS headline on their
            phone when you announce, with a link to the full announcement. No mailing list to build, and no shareholder data to look after.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a href="mailto:enquiries@aiert.co.uk?subject=TapCard%20for%20investor%20relations" className="btn-gold rounded-xl px-5 py-3 font-semibold">Ask for a card built from your website</a>
            <span className="text-cloud">We make it from your site and show you before anything goes live.</span>
          </div>
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

        <section className="mt-14 grid gap-4 sm:grid-cols-2">
          {POINTS.map((p) => (
            <div key={p.title} className="card rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
              <h2 className="text-lg font-bold text-cloud">{p.title}</h2>
              <p className="mt-2 leading-relaxed text-cloud">{p.body}</p>
            </div>
          ))}
        </section>

        <section className="card mt-14 rounded-2xl bg-charcoal p-8 ring-1 ring-gold/40">
          <h2 className="text-2xl font-black text-cloud">Pricing</h2>
          <p className="mt-3 text-lg leading-relaxed text-cloud">
            Yearly, in pounds, plus VAT, for UK companies. <strong>Following is free for shareholders.</strong> The first five companies get a{" "}
            <strong>founding price of £395 for the first year</strong>.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {TIERS.map((t) => (
              <div key={t.name} className="rounded-xl bg-white/5 p-5 ring-1 ring-white/10">
                <p className="text-sm font-semibold uppercase tracking-wider text-teal">{t.who}</p>
                <h3 className="mt-1 text-xl font-bold text-cloud">{t.name}</h3>
                <p className="mt-2 text-cloud"><span className="text-3xl font-black">{t.price}</span> <span>{t.per}</span></p>
                <ul className="mt-3 list-disc space-y-1 pl-5 leading-relaxed text-cloud">
                  {t.points.map((x) => <li key={x}>{x}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm leading-relaxed text-cloud">
            The plan is agreed with you when we set the company up. There is no self-service sign-up for investor relations yet: email us and we do it with you.
          </p>
        </section>

        <section className="card mt-14 rounded-2xl bg-charcoal p-8 ring-1 ring-white/10">
          <h2 className="text-2xl font-black text-cloud">For investor relations advisers</h2>
          <p className="mt-3 leading-relaxed text-cloud">
            If you look after the investor relations of listed companies, you can offer TapCard to your clients. You earn <strong>20% of the annual fee for as long as
            the client stays</strong>, paid yearly. We set the card up for the client; you keep the relationship. Depending on your regulatory position you may need to
            tell your client about a referral fee, so please take your own advice on that.
          </p>
          <div className="mt-5">
            <a href="mailto:enquiries@aiert.co.uk?subject=TapCard%20partner%20for%20investor%20relations" className="btn-gold rounded-xl px-5 py-3 font-semibold">Talk to us about partnering</a>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-black text-cloud">Questions about TapCard for investor relations</h2>
          <div className="mt-4 space-y-4">
            {FAQ.map(([q, a]) => (
              <div key={q} className="card rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
                <h3 className="text-lg font-bold text-cloud">{q}</h3>
                <p className="mt-2 leading-relaxed text-cloud">{a}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-14 border-t border-slate pt-6 text-sm text-cloud">
          <p>
            TapCard is made by AIERT Ltd, registered in England &amp; Wales, No. 16587000.{" "}
            <a href="/how-it-works" className="text-gold underline">How it works</a> ·{" "}
            <a href="/business" className="text-gold underline">TapCard for Business</a> ·{" "}
            <a href="/support" className="text-gold underline">Support</a> ·{" "}
            <a href="/privacy" className="text-gold underline">Privacy</a> ·{" "}
            <a href="mailto:enquiries@aiert.co.uk" className="text-gold underline">enquiries@aiert.co.uk</a>
          </p>
        </footer>
      </div>
    </main>
  );
}
