import type { Metadata } from "next";
import JsonLd from "../JsonLd";
import InvestorTabs from "./InvestorTabs";
import TrackedVideo from "./TrackedVideo";

const DESCRIPTION =
  "TapCard for investor relations: a QR code on your results slides, annual report or AGM notice lets shareholders follow your company and get a headline on their phone, with a link to the announcement on your own website. TapCard does not provide RNS. Following is free for shareholders, and you see only the details people choose to share. Set up by us.";

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

// Each email button opens a message already set up with what we need to reply, so nobody starts from a blank page.
const mailto = (subject: string, lines: string[]) =>
  "mailto:enquiries@aiert.co.uk?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(lines.join("\n"));

const CARD_MAILTO = mailto("TapCard for investor relations: build our card", [
  "Hello,",
  "",
  "Please build a TapCard for investor relations from our website, and send us a link to see it before anything goes live.",
  "",
  "Company name:",
  "Website:",
  "Stock exchange and ticker (for example AIM: ABC):",
  "Your name and role:",
  "Who else should have a card (chair, CEO, CFO, investor relations contact)?",
  "Any events coming up (AGM, roadshow) and their dates:",
  "",
  "Thank you",
]);

const PRICING_MAILTO = mailto("TapCard for investor relations: pricing", [
  "Hello,",
  "",
  "Please send pricing for TapCard for investor relations.",
  "",
  "Company name:",
  "Website:",
  "Stock exchange and ticker (for example AIM: ABC):",
  "Your name and role (company, or adviser to the company):",
  "Roughly how many events a year (AGM, roadshows, results presentations):",
  "Anything you would want in a report (for the board, broker or adviser):",
  "",
  "Thank you",
]);

const REPORTS_MAILTO = mailto("TapCard for investor relations: reports", [
  "Hello,",
  "",
  "We would like to talk about reports built around our company.",
  "",
  "Company name:",
  "Website:",
  "Your name and role:",
  "Who would read the report (board, broker, adviser) and how often:",
  "What you want to see in it:",
  "",
  "Thank you",
]);

const PARTNER_MAILTO = mailto("TapCard partner for investor relations", [
  "Hello,",
  "",
  "We are an investor relations adviser and would like the partner terms.",
  "",
  "Firm name:",
  "Website:",
  "Your name and role:",
  "Roughly how many listed clients you look after:",
  "",
  "Thank you",
]);

const STEPS = [
  ["Put a QR code on what shareholders already read", "Your investor presentation, results slides, annual report, AGM notice or website. One code for the company, one for each event, and one for each person who speaks for it."],
  ["A shareholder scans it", "They land on your company's card: your latest headline, your contacts, and one-tap links to your investor pages (RNS, reports, shareholder information, share price) where your website has them. They can read it in their browser, with nothing to install."],
  ["They follow you in the TapCard app", "Following is their choice, it is free for them, and they can stop at any time. They need the app to receive notifications; without it they can still read the card."],
  ["You post a headline when you announce", "A one-line headline with a link to the full announcement on your own website, posted from the web by your administrators. Followers with notifications on are told. You decide what goes out and when."],
];

const POINTS = [
  { title: "TapCard does not provide RNS", body: "TapCard is not a regulatory news service. Your announcements and your data stay yours: they are published and distributed only from your own website and your normal channels. TapCard never hosts, copies or sends the announcement itself. It tells followers that an announcement has happened and links them to it on your website. Never post an RNS before it is public, and say nothing that is not in it. A meeting invitation or an event that does not need disclosure is different: check with your adviser first. What you may and may not say, and when, is for you and your advisers." },
  { title: "Followers who choose to share", body: "You see how many people follow and how many can receive a notification. A shareholder can also choose to share their name and email with you when they follow; you see only those who do, and they can withdraw at any time. Followers who don't share stay anonymous." },
  { title: "Your investor pages, in one tap", body: "RNS announcements, reports and results, shareholder information, investor presentations and share price all sit on the card as one-tap links to your own website, found automatically where your site has them. Nothing is copied; change your website and the links still work." },
  { title: "Several voices", body: "Cards for the chair, CEO, CFO and IR contact, all in the company's branding, on one account. Anyone who follows one of them follows the company. Only your administrators can post, and you choose who they are." },
];

const FEATURES = [
  { title: "A QR code for every event", body: "Make one for the AGM, a roadshow or a results presentation. For a day of visits, add a time slot for each firm. You see how many scanned it (counted even without the app, anonymously) and how many registered, and who they are if they chose to share their details. It works alongside the webcast or events platform you already use." },
  { title: "Insights for your IR team", body: "Followers over time, how many each headline was sent to and how many tapped through, when people read, how many go from scan to follow to sharing their details, and what kind of investor is following (organisations or private)." },
  { title: "Reports built for you", body: "A one-page summary of the last 30 days to print or save as a PDF, for your board or your adviser. We can adapt reports to suit your company and build them with you: tell us what you want to see." },
  { title: "The details people share", body: "Download the followers who chose to share their name and email as a spreadsheet, with how they followed and the event they came through." },
];

const ADMIN_SHOTS = [
  { file: "overview", title: "Overview", body: "Who follows you, your latest headline, who shared their details and your events, at a glance." },
  { file: "insights", title: "Insights", body: "Followers over time with your events and announcements marked, how each headline performed, and what kind of investors follow." },
  { file: "followers", title: "Followers", body: "The people who chose to share their name and email, how they followed and the event they came through, ready to download." },
  { file: "events", title: "Events", body: "A QR code for each AGM or roadshow, with a time slot for each firm on a day of visits, and who registered." },
  { file: "report", title: "Monthly report", body: "A one-page summary to print or save as a PDF. We can adapt reports to suit your company, your board and your adviser." },
];

const FAQ: [string, string][] = [
  ["What does a shareholder need?", "To scan the QR code they need only their phone's camera, and the card opens in the browser. To follow the company and receive its headlines as notifications they install the TapCard app (iPhone and Android) and choose to follow."],
  ["Do we see who follows us?", "By default, no: you see a count of followers and of how many can receive a notification. A shareholder who follows your investor relations card can choose Follow and share my details, which gives you their name and email. You see only the people who chose to, and they can withdraw at any time. What you do with those details is your responsibility."],
  ["Does this replace RNS or our investor relations website?", "No, and TapCard does not provide RNS. Your announcements and your data are yours: they are published and distributed only from your own website and your regulatory news service, and TapCard never hosts, copies or sends the announcement itself. It sits beside them. A post is a short headline with a link back to the announcement on your website, and the card links to your own investor pages and RNS list."],
  ["Can we post before the announcement is public?", "No. Never post an RNS, or anything that is inside information, before it is public: wait until it has been released through your regulatory news service and is on your own website. If the post is a meeting invitation or an event that does not need disclosure, check with your adviser first. Whatever you post is your decision and your responsibility."],
  ["How is it priced?", "We agree a yearly plan with you, plus VAT for UK companies, based on the size of the company and how you use it. Email us and we will send pricing."],
  ["Does this replace the webcast or events platform we already use?", "No. Keep using it. Your company can post the link to its webcast page (on SparkLive or any other platform) as a headline, and followers are notified. TapCard also records who scanned in at the AGMs and roadshows you hold in person. An invitation to an event that does not need disclosure is something to check with your adviser before you post it."],
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
  const seeIt = (
    <>
      <h2 className="text-2xl font-black text-cloud">See it on a phone</h2>
      <p className="mt-2 max-w-3xl leading-relaxed text-cloud">
        Two things an investor relations team does most: meeting investors at an AGM or roadshow, and telling shareholders when you announce. An example company, recorded in the TapCard app.
      </p>
      <TrackedVideo
        src="https://www.aiert.co.uk/tapcard-ir-demo-v3.mp4"
        poster="https://www.aiert.co.uk/tapcard-ir-demo-poster-v3.jpg"
        label="Demo of TapCard for investor relations: an investor scans an event QR code and registers, then a results announcement arrives as a notification"
      />
      <details className="mt-3 max-w-4xl text-cloud">
        <summary className="cursor-pointer font-semibold">What the video shows</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5 leading-relaxed">
          <li>At an AGM or roadshow, an investor scans the QR code on a slide, notice or website with their camera.</li>
          <li>In the TapCard app they choose to follow, and whether to share their name and email.</li>
          <li>Their attendance is registered against the event and its time slot, and the app names the company.</li>
          <li>When the company announces, a one-line headline arrives as a notification.</li>
          <li>Tapping it opens the headline, with a link to the full announcement on the company&apos;s own website. TapCard does not provide RNS: the announcement stays on the company&apos;s website.</li>
        </ol>
      </details>
      <h2 className="mt-12 text-2xl font-black text-cloud">How it works</h2>
      <ol className="mt-5 grid gap-4 sm:grid-cols-2">
        {STEPS.map(([title, body], i) => (
          <li key={title} className="card rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
            <p className="text-sm font-semibold text-gold">Step {i + 1}</p>
            <h3 className="mt-1 text-lg font-bold text-cloud">{title}</h3>
            <p className="mt-2 leading-relaxed text-cloud">{body}</p>
          </li>
        ))}
      </ol>
    </>
  );

  const whatYouGet = (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {POINTS.map((p) => (
          <div key={p.title} className="card rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
            <h2 className="text-lg font-bold text-cloud">{p.title}</h2>
            <p className="mt-2 leading-relaxed text-cloud">{p.body}</p>
          </div>
        ))}
      </div>
      <h2 className="mt-12 text-2xl font-black text-cloud">What your team gets</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div key={f.title} className="card rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
            <h3 className="text-lg font-bold text-cloud">{f.title}</h3>
            <p className="mt-2 leading-relaxed text-cloud">{f.body}</p>
          </div>
        ))}
      </div>
    </>
  );

  const admin = (
    <>
      <h2 className="text-2xl font-black text-cloud">The admin your team uses</h2>
      <p className="mt-2 max-w-3xl leading-relaxed text-cloud">
        A simple website for your investor relations team, with a tab for each job: Overview, Followers, Insights, News, Cards &amp; QR and Settings. These screens show an example company with made-up
        figures. You choose who the administrators are, and they sign in by an emailed link, with no passwords.
      </p>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {ADMIN_SHOTS.map((a) => (
          <figure key={a.file} className="card rounded-2xl bg-charcoal p-4 ring-1 ring-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://www.aiert.co.uk/tapcard-ir-admin-${a.file}.jpg`}
              alt={`${a.title} screen of the TapCard investor relations admin, showing an example company`}
              width={1000}
              height={900}
              loading="lazy"
              className="w-full rounded-xl ring-1 ring-white/10"
            />
            <figcaption className="mt-3">
              <h3 className="text-lg font-bold text-cloud">{a.title}</h3>
              <p className="mt-1 leading-relaxed text-cloud">{a.body}</p>
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="card mt-8 rounded-2xl bg-charcoal p-6 ring-1 ring-gold/40">
        <h3 className="text-lg font-bold text-cloud">Reports built around your team</h3>
        <p className="mt-2 leading-relaxed text-cloud">
          The monthly report is a starting point. We can adapt reports to suit your company, your board and your adviser, and build them with you: tell us what you want to see.
        </p>
        <div className="mt-4">
          <a href={REPORTS_MAILTO} className="btn-gold rounded-xl px-5 py-3 font-semibold">Tell us what you need in a report</a>
        </div>
      </div>
    </>
  );

  const pricing = (
    <>
      <section className="card rounded-2xl bg-charcoal p-8 ring-1 ring-gold/40">
        <h2 className="text-2xl font-black text-cloud">Pricing</h2>
        <p className="mt-3 text-lg leading-relaxed text-cloud">
          <strong>Following is free for shareholders.</strong> For the company, we agree a yearly plan with you when we set things up, based on the size of
          the company and how you use it. There is no self-service sign-up for investor relations yet: ask us for pricing and we will come back to you.
        </p>
        <div className="mt-5">
          <a href={PRICING_MAILTO} className="btn-gold rounded-xl px-5 py-3 font-semibold">Ask for pricing</a>
        </div>
      </section>
      <section className="card mt-8 rounded-2xl bg-charcoal p-8 ring-1 ring-white/10">
        <h2 className="text-2xl font-black text-cloud">For investor relations advisers</h2>
        <p className="mt-3 leading-relaxed text-cloud">
          If you look after the investor relations of listed companies, you can offer TapCard to your clients. We have a partner arrangement for advisers and will send you the terms. We set the card up for the client; you keep the relationship. Depending on your regulatory
          position you may need to tell your client about a referral fee, so please take your own advice on that.
        </p>
        <div className="mt-5">
          <a href={PARTNER_MAILTO} className="btn-gold rounded-xl px-5 py-3 font-semibold">Talk to us about partnering</a>
        </div>
      </section>
    </>
  );

  const questions = (
    <>
      <h2 className="text-2xl font-black text-cloud">Questions about TapCard for investor relations</h2>
      <div className="mt-4 space-y-4">
        {FAQ.map(([q, a]) => (
          <div key={q} className="card rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
            <h3 className="text-lg font-bold text-cloud">{q}</h3>
            <p className="mt-2 leading-relaxed text-cloud">{a}</p>
          </div>
        ))}
      </div>
    </>
  );

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
            Put a QR code on your results slides, annual report or AGM notice. Shareholders scan it, follow your company, and get a headline on their
            phone when you announce, with a link to the full announcement on your own website. No mailing list to build, and you see only the details a shareholder chooses to share.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a href={CARD_MAILTO} className="btn-gold rounded-xl px-5 py-3 font-semibold">Ask for a card built from your website</a>
            <a href={PRICING_MAILTO} className="rounded-xl px-5 py-3 font-semibold text-cloud ring-1 ring-white/30">Ask for pricing</a>
          </div>
          <p className="mt-3 text-cloud">We make it from your site and show you before anything goes live.</p>
        </section>

        <InvestorTabs
          tabs={[
            { id: "see", label: "See it", node: seeIt },
            { id: "features", label: "What you get", node: whatYouGet },
            { id: "admin", label: "Your admin", node: admin },
            { id: "pricing", label: "Pricing and advisers", node: pricing },
            { id: "questions", label: "Questions", node: questions },
          ]}
        />

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
