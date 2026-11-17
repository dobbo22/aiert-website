import type { Metadata } from "next";
import JsonLd from "../JsonLd";

const DESCRIPTION =
  "TapCard for investor relations: a QR code on your results slides, annual report or AGM notice lets shareholders follow your company and get your RNS headlines on their phone. Following is free for shareholders, and you see only the details people choose to share. Set up by us.";

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

const PRICING_MAILTO = "mailto:enquiries@aiert.co.uk?subject=" + encodeURIComponent("TapCard for investor relations: pricing") + "&body=" + encodeURIComponent("Company:\nWebsite:\nYour role:\n\nPlease send pricing for TapCard for investor relations.");

const STEPS = [
  ["Put a QR code on what shareholders already read", "Your investor presentation, results slides, annual report, AGM notice or website. One code for the company, one for each event, and one for each person who speaks for it."],
  ["A shareholder scans it", "They land on your company's card: your latest headline, your contacts, and one-tap links to your investor pages (RNS, reports, shareholder information, share price) where your website has them. They can read it in their browser, with nothing to install."],
  ["They follow you in the TapCard app", "Following is their choice, it is free for them, and they can stop at any time. They need the app to receive notifications; without it they can still read the card."],
  ["You post a headline when you announce", "A one-line headline with a link to the full RNS, posted from the web by your administrators. Followers with notifications on are told. You decide what goes out and when."],
];

const POINTS = [
  { title: "It doesn't replace the RNS", body: "The announcement still goes out through your normal channels. TapCard is for telling people it has happened and pointing them to it. We suggest a post goes out only after an announcement is public and says nothing that is not in it. What you may and may not say, and when, is for you and your advisers." },
  { title: "Followers who choose to share", body: "You see how many people follow and how many can receive a notification. A shareholder can also choose to share their name and email with you when they follow; you see only those who do, and they can withdraw at any time. Followers who don't share stay anonymous." },
  { title: "Your investor pages, in one tap", body: "RNS announcements, reports and results, shareholder information, investor presentations and share price all sit on the card as one-tap links to your own website, found automatically where your site has them. Nothing is copied; change your website and the links still work." },
  { title: "Several voices", body: "Cards for the chair, CEO, CFO and IR contact, all in the company's branding, on one account. Anyone who follows one of them follows the company. Only your administrators can post, and you choose who they are." },
];

const FEATURES = [
  { title: "A QR code for every event", body: "Make one for the AGM, a roadshow or a results presentation. For a day of visits, add a time slot for each firm. You see how many scanned it (counted even without the app, anonymously) and how many registered, and who they are if they chose to share their details." },
  { title: "Insights for your IR team", body: "Followers over time, how many each headline was sent to and how many tapped through, when people read, how many go from scan to follow to sharing their details, and what kind of investor is following (organisations or private)." },
  { title: "A monthly report", body: "A one-page summary of the last 30 days to print or save as a PDF, for your board or your adviser." },
  { title: "The details people share", body: "Download the followers who chose to share their name and email as a spreadsheet, with how they followed and the event they came through." },
];

const FAQ: [string, string][] = [
  ["What does a shareholder need?", "To scan the QR code they need only their phone's camera, and the card opens in the browser. To follow the company and receive its headlines as notifications they install the TapCard app (iPhone and Android) and choose to follow."],
  ["Do we see who follows us?", "By default, no: you see a count of followers and of how many can receive a notification. A shareholder who follows your investor relations card can choose Follow and share my details, which gives you their name and email. You see only the people who chose to, and they can withdraw at any time. What you do with those details is your responsibility."],
  ["Does this replace RNS or our investor relations website?", "No. It sits beside them. The card links to your own investor pages and to the RNS list, and a post is a short headline with a link."],
  ["Can we post before the announcement is public?", "We recommend not, and the service is built around posting after the announcement. Whatever you post is your decision and your responsibility; please take your own advice on market abuse and disclosure rules."],
  ["How is it priced?", "We agree a yearly plan with you, plus VAT for UK companies, based on the size of the company and how you use it. Email us and we will send pricing."],
  ["Can we see who came to an event?", "Each event has its own QR code and optional time slots. Everyone who scans it is counted, even without the app, as an anonymous number, and the page they land on encourages them to download TapCard so they can follow you. People who register in the app, or share their details on the card page, are counted as attending against the event and time slot, and you see names and emails only for those who chose to share them."],
  ["How do we start?", "Email us the company name and website. We build the company's card from your website, add your RNS and investor links, and send you a link to see it before anything goes live."],
  ["We are an investor relations adviser. Can we offer this to our clients?", "Yes. We have a partner arrangement for advisers: email us for the terms. Depending on your regulatory position you may need to tell your client about a referral fee; please take your own advice on that."],
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
            phone when you announce, with a link to the full announcement. No mailing list to build, and you see only the details a shareholder chooses to share.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a href="mailto:enquiries@aiert.co.uk?subject=TapCard%20for%20investor%20relations" className="btn-gold rounded-xl px-5 py-3 font-semibold">Ask for a card built from your website</a>
            <a href={PRICING_MAILTO} className="rounded-xl px-5 py-3 font-semibold text-cloud ring-1 ring-white/30">Ask for pricing</a>
            <span className="text-cloud">We make it from your site and show you before anything goes live.</span>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-black text-cloud">See it on a phone</h2>
          <p className="mt-2 max-w-3xl leading-relaxed text-cloud">
            Two things an investor relations team does most: meeting investors at an AGM or roadshow, and telling shareholders when you announce. An example company, recorded in the TapCard app.
          </p>
          <video
            className="mt-5 w-full max-w-4xl rounded-2xl ring-1 ring-white/10"
            src="https://www.aiert.co.uk/tapcard-ir-demo.mp4"
            poster="https://www.aiert.co.uk/tapcard-ir-demo-poster.jpg"
            width={1280}
            height={720}
            controls
            playsInline
            preload="metadata"
            aria-label="Demo of TapCard for investor relations: an investor scans an event QR code and registers, then a results announcement arrives as a notification"
          />
          <details className="mt-3 max-w-4xl text-cloud">
            <summary className="cursor-pointer font-semibold">What the video shows</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5 leading-relaxed">
              <li>At an AGM or roadshow, an investor scans the QR code on a slide, notice or website with their camera.</li>
              <li>In the TapCard app they choose to follow, and whether to share their name and email.</li>
              <li>Their attendance is registered against the event and its time slot, and the app names the company.</li>
              <li>When the company announces, a one-line headline arrives as a notification.</li>
              <li>Tapping it opens the headline, with a link to the full announcement.</li>
            </ol>
          </details>
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

        <section className="mt-14">
          <h2 className="text-2xl font-black text-cloud">What your team gets</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="card rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
                <h3 className="text-lg font-bold text-cloud">{f.title}</h3>
                <p className="mt-2 leading-relaxed text-cloud">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="card mt-14 rounded-2xl bg-charcoal p-8 ring-1 ring-gold/40">
          <h2 className="text-2xl font-black text-cloud">Pricing</h2>
          <p className="mt-3 text-lg leading-relaxed text-cloud">
            <strong>Following is free for shareholders.</strong> For the company, we agree a yearly plan with you when we set things up, based on the size of
            the company and how you use it. There is no self-service sign-up for investor relations yet: ask us for pricing and we will come back to you.
          </p>
          <div className="mt-5">
            <a href={PRICING_MAILTO} className="btn-gold rounded-xl px-5 py-3 font-semibold">Ask for pricing</a>
          </div>
        </section>

        <section className="card mt-14 rounded-2xl bg-charcoal p-8 ring-1 ring-white/10">
          <h2 className="text-2xl font-black text-cloud">For investor relations advisers</h2>
          <p className="mt-3 leading-relaxed text-cloud">
            If you look after the investor relations of listed companies, you can offer TapCard to your clients. We have a partner arrangement for advisers and will send you the terms. We set the card up for the client; you keep the relationship. Depending on your regulatory
            position you may need to tell your client about a referral fee, so please take your own advice on that.
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
