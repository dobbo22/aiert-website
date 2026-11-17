import type { Metadata } from "next";
import DocPage from "../../DocPage";

export const metadata: Metadata = {
  title: "Investor Relations Guide – TapCard | AIERT Ltd",
  description:
    "How to use TapCard for investor relations: put your QR code where shareholders look, run an AGM or roadshow, post headlines after your RNS, see who registered, and answers to common questions.",
};

// Help for the investor relations admin (listed companies). Describes the admin pages as they are
// (app/tapcard/business/admin/*) and the app screens shareholders see: update it alongside them.
const FAQS: [string, React.ReactNode][] = [
  ["Do shareholders need the TapCard app?", "To follow you, register their attendance and get your headlines, yes. Anyone can open your card in a browser, but nothing is registered there. The page tells them to get the app, then come back and tap Open in TapCard to finish (Android finishes by itself)."],
  ["What does a shareholder see when they scan?", "Your card opens in the TapCard app. A new follower gets one screen with your company name, the event if the code is an event code, name and email filled in from their own card, and two choices: Register and follow (shares name and email with you) or Follow only (shares nothing). Someone who already follows is registered at the scan and thanked."],
  ["Why is the number following bigger than the list on Followers?", "The list shows only people who chose to share their name and email. Everyone else who followed without sharing is counted on the Overview and Insights pages, but never named."],
  ["How do I see which company someone works for?", "Open Followers and stay on By company. Each company shows its logo, a name worked out from the email domain, and a count. Click it to see the names and emails. People using Gmail, Hotmail, Outlook and other personal addresses are grouped as Private / retail investors."],
  ["When does a phone number appear?", "Only for people who also shared their own TapCard with you, because the number comes with that card. We do not ask for a phone number when someone follows."],
  ["What happens if someone scans an event code twice, or two events?", "Each event is recorded once for that person. A person can have several events, such as the AGM and then a roadshow. Their name appears beside each event only if they chose to share their details."],
  ["What is an event window?", "If an event has a day or a time, anyone who newly follows during that time through any of your cards is tagged with it, even without scanning the code. The list says event window. People who already followed are not tagged by time alone."],
  ["A scan fell outside my time slots. Where does it go?", "It is recorded against the event as a whole, with no slot. If slots overlap, the one that started last wins."],
  ["Can I change a slot or its time after printing the QR code?", "Yes. The code belongs to the event, not the slot. Add, change or remove slots under Cards & QR, Events, and the printed code keeps working."],
  ["How often does News & RNS check my announcements page?", "When you open the page, when you press Refresh now, and every three minutes while the page stays open. Opening the page checks at most once a minute, and Refresh now at most once every 10 seconds. If your page changes layout and many items look new at once, they are treated as earlier items so they do not flood the list."],
  ["Someone asks to be removed. What do I do?", "They can stop following, or switch to Follow only, in the app, which removes their details from your list. If they email you instead, ask them to do that, or email enquiries@aiert.co.uk and we will remove them."],
  ["What happens to the details when someone stops following?", "Their name, email and event records are removed when they stop following, withdraw their sharing, or when the card is deleted."],
  ["Who can sign in to the admin?", "The admins you add under Settings, Admins, up to five. Each gets a sign-in link by email. There are no passwords."],
  ["Is TapCard a substitute for the RNS?", "No, and TapCard does not provide RNS. Your announcements and your data are yours, published and distributed only from your own website and your regulatory news service. TapCard never hosts or copies them: it sends a headline and a link to the announcement on your own website. Post a headline only after the announcement is public on the market, and say nothing that is not in it. Check the rules that apply to you with your adviser."],
];

export default function InvestorGuidePage() {
  return (
    <DocPage title="TapCard for investor relations: Guide and FAQs" updated="16 November 2026">
      <section>
        <h2>What it does</h2>
        <p>
          A shareholder scans your QR code from a slide, the annual report or an AGM notice, follows you in the TapCard app, and from then on gets your headlines on their phone with a link to
          the announcement on your own website. They can choose to share their name and email with you, and nothing is shared unless they tap the button that says so.
        </p>
        <p className="mt-2">Your admin area is at <a href="/business/admin">tapcard.aiert.co.uk/business/admin</a>. Sign in with your email: we send a link, there are no passwords.</p>
      </section>

      <section>
        <h2>Getting started in five steps</h2>
        <ol className="ml-5 mt-2 space-y-1.5 [&>li]:list-decimal!">
          <li><strong>Check your company card</strong> (Overview, then Open the card). This is what a shareholder sees after scanning: your logo, investor pages and the follow button.</li>
          <li><strong>Put the QR code where shareholders already look</strong>: results slides, the annual report, the AGM notice and your website. Download it on Cards &amp; QR, then Company card.</li>
          <li><strong>Add your people</strong> under Cards &amp; QR, Team cards: chair, CEO, CFO and IR contact each get a card and QR code. A shareholder who follows through a person follows the company.</li>
          <li><strong>Make an event code</strong> for your AGM or a roadshow under Cards &amp; QR, Events (see below).</li>
          <li><strong>Post a headline after your next RNS</strong> on News &amp; RNS.</li>
        </ol>
      </section>

      <section>
        <h2>The admin tabs</h2>
        <ul>
          <li><strong>Overview</strong>: following, how many can be notified, how many shared their details, card views and QR scans, your latest headline and a getting-started checklist.</li>
          <li><strong>Followers</strong>: people who shared their name and email. <em>By company</em> groups them by email domain with a logo and a count; click a company for its names and emails. <em>Everyone</em> is a table you can filter by company, by private investors, by event, or search. Download CSV exports the whole list.</li>
          <li><strong>Insights</strong>: counts only, never a named person: followers over time (with events and announcements marked), each announcement's taps and the joins and leaves in the 48 hours after it, the hours of day announcements get read, the path from QR scan to shared details, who is following (organisations versus private investors), and opens and registrations for each event and slot. <em>Monthly report</em> makes a one-page print or PDF of the last 30 days.</li>
          <li><strong>News &amp; RNS</strong>: your announcements page is watched for new items, and each is one tap to post as a headline. You can also write your own.</li>
          <li><strong>Cards &amp; QR</strong>: Company card, Team cards (add people, their QR codes and removing a card), Events (one QR code per AGM, roadshow or meeting, with time slots and a list of who registered).</li>
          <li><strong>Settings</strong>: Admins (who can sign in), Billing (your plan) and the Privacy notice link.</li>
        </ul>
      </section>

      <section>
        <h2>Running an AGM or a roadshow</h2>
        <ol className="ml-5 mt-2 space-y-1.5 [&>li]:list-decimal!">
          <li>Under <strong>Cards &amp; QR</strong>, choose <strong>Events</strong>, name the event (for example AGM 2026 or Roadshow 20 Nov) and choose <em>Any time</em>, <em>All day</em> or <em>Timed slot</em>. Press Create QR code.</li>
          <li>Press <strong>Download QR code with wording</strong>. The picture has &ldquo;Please scan to register your attendance and follow your company&rdquo; printed under the code, ready for a slide or a printed sign.</li>
          <li>For a day of visits, keep <strong>one</strong> event and add a <strong>time slot</strong> for each firm (name, day, from, to). Print one code. A scan is recorded against the slot it was made in, and you can edit slots later without reprinting.</li>
          <li>Open <strong>Registered</strong> under the event to see who registered. People who shared their details appear by name with their slot; the rest are counted. Download list gives a CSV for that event.</li>
        </ol>
      </section>

      <section>
        <h2>How a shareholder registers</h2>
        <ul>
          <li>With the camera they scan your code. If they have TapCard, it opens the app on your card.</li>
          <li>A new follower sees <strong>Register and follow</strong> (shares name and email) and, underneath, <strong>Follow only</strong> (shares nothing). Both record the event; only the first shares details.</li>
          <li>Someone who already follows is registered straight away and sees a thank-you.</li>
          <li>Without the app, the page says to use the app to register and follow. On Android the event carries through the install. On iPhone they come back to the page after installing and tap <strong>Open in TapCard</strong>. Anyone who scans without the app is still counted as an anonymous open, and the page encourages them to get the app. Someone who shares their details on the page instead is counted as attending that event (and appears to the card owner as a new contact), but is not a follower.</li>
        </ul>
      </section>

      <section>
        <h2>Posting a headline</h2>
        <ul>
          <li>Never post an RNS, or anything that is inside information, before it is public: wait until it has been released through your regulatory news service and is on your website. Keep it to the headline and a link to the announcement.</li>
          <li>A meeting invitation or an event that does not need disclosure is a different case: check with your adviser before you post it.</li>
          <li>On <strong>News &amp; RNS</strong>, new items from your announcements page appear with a Post button. The page shows when it was last checked, and Refresh now reads it again.</li>
          <li>Followers get the headline as a notification and can open the link.</li>
        </ul>
      </section>

      <section>
        <h2>Their details and your responsibilities</h2>
        <ul>
          <li>Shareholders choose to share; they can withdraw at any time, and stopping following removes their details from your list.</li>
          <li>You decide how the details are used, and you are responsible for that. They were given so you can contact the person about your news and shareholder information. Anything promotional needs the usual consent and an unsubscribe.</li>
          <li>Add the link to <strong>your own privacy notice</strong> under Settings, Privacy notice. The app shows it next to the name and email form.</li>
          <li>More in <a href="/business/security">Security &amp; privacy</a> and the <a href="/privacy">privacy policy</a>.</li>
        </ul>
      </section>

      <section>
        <h2>FAQs</h2>
        <div className="mt-3 space-y-2">
          {FAQS.map(([q, a]) => (
            <details key={q} className="rounded-xl bg-white/[0.06] px-4 py-3 ring-1 ring-white/10">
              <summary className="cursor-pointer font-semibold">{q}</summary>
              <p className="mt-2">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section>
        <h2>Need a hand?</h2>
        <p>Email <a href="mailto:enquiries@aiert.co.uk">enquiries@aiert.co.uk</a> and we will help. For other companies, the general <a href="/business/guide">admin guide</a> covers shops and teams.</p>
      </section>
    </DocPage>
  );
}
