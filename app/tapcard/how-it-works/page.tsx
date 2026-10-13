import type { Metadata } from "next";
import DocPage from "../DocPage";

const DESCRIPTION =
  "Your business card on your phone: share it with a QR code or a link, swap details in seconds, and stay in sync automatically — even after it's saved.";

export const metadata: Metadata = {
  title: "How TapCard works – AIERT Ltd",
  description: DESCRIPTION,
  openGraph: {
    title: "How TapCard works",
    description: DESCRIPTION,
    images: ["https://www.aiert.co.uk/tapcard-wallet-hero.png"],
    siteName: "TapCard",
    type: "website",
  },
};

const APP_STORE_URL = "https://apps.apple.com/app/id6816003159";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.mailbroom.tapcard";

// Linked from the invite email ("See exactly how it works") —
// tapcard.aiert.co.uk/how-it-works.
export default function HowItWorksPage() {
  return (
    <DocPage title="How TapCard works">
      <section>
        <p>
          Someone asks for your business card and you haven&apos;t got one on you, or you&apos;ve run out. TapCard
          fixes that: your card lives on your phone, ready to share in seconds. Always be prepared.
        </p>
      </section>

      <section>
        <h2>1. Make your card</h2>
        <p>
          Download TapCard and fill in your name, job title, company, phone, email, website and social links
          (LinkedIn, X, Instagram and more). Add a photo if you like. It takes a couple of minutes.
        </p>
      </section>

      <section>
        <h2>2. Share it</h2>
        <ul>
          <li><strong>QR code:</strong> open TapCard and let them scan the code with their phone camera.</li>
          <li><strong>Link:</strong> send your card&apos;s link by text, WhatsApp or email, or add it to your email signature.</li>
          <li>
            <strong>Send it straight to a contact:</strong> pick one or several people from your phone&apos;s contacts
            (Apple or Google) and TapCard sends each of them your card directly — over WhatsApp if they&apos;re on it,
            by email or text otherwise, already written and addressed, nothing to type yourself.
          </li>
          <li>
            <strong>Apple Wallet and Google Wallet:</strong> add your card to your phone&apos;s Wallet so it&apos;s always
            to hand. Pick a design in the app and your Wallet card updates to match.
          </li>
          <li>
            <strong>Print a QR sign:</strong> make a poster for a reception desk, till or window. Use a separate card
            for it, so only the details you want to be public are shown.
          </li>
          <li>
            <strong>No signal?</strong> Tap <strong>Offline QR</strong>. It shows a QR code that holds your contact
            details themselves, so it works with no signal and no app on their phone. You can also send your contact
            file by AirDrop.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. They save you in one tap</h2>
        <p>
          They don&apos;t need the app. Your card opens in their browser, they tap <strong>Save Contact</strong>, and your
          details go straight into their phone&apos;s contacts. No typing, no mistakes.
        </p>
        <p>
          If you sent it to them directly, they can also share their own details back in one tap — they see a live
          preview of their own TapCard as they type, then choose to get the app or just save their contact straight
          away. Either way, you get their details back automatically.
        </p>
      </section>

      <section>
        <h2>4. Swap details</h2>
        <p>
          If they have TapCard too, scan each other&apos;s codes and both cards save straight into your contacts. No more
          collecting paper cards and typing them in later.
        </p>
      </section>

      <section>
        <h2>5. Manage who&apos;s got your card</h2>
        <p>
          Everyone you&apos;ve sent your card to directly shows up in one list in the app, with their status — <strong>Pending</strong> while
          you wait for them to accept, <strong>Accepted</strong> once they&apos;ve shared their details back. You can edit someone&apos;s
          name or number right up until you send; after that it&apos;s locked in, so there&apos;s no mix-up with what was
          actually sent.
        </p>
      </section>

      <section>
        <h2>6. Organise your contacts</h2>
        <p>
          Give contacts categories of your own, such as <strong>Restaurants</strong>, <strong>Shops</strong> or{" "}
          <strong>Clubs</strong>, using #tags. A contact can be in more than one category. Filter by category or
          search to find people fast. Categories stay on your phone.
        </p>
        <p>
          Meeting someone in person? Tap the camera button at the top left of the main screen and scan their TapCard QR
          code to add them straight to your contacts.
        </p>
        <p>
          Want to stop sharing with one person? Open them in your contacts and choose <strong>Stop sharing with</strong>{" "}
          them. Their copy of your card is removed and nobody else is affected.
        </p>
        <p>
          Got PowerSearch too? Open any contact and tap <strong>Find emails in PowerSearch</strong> to see every email
          from them, across all your accounts.
        </p>
      </section>

      <section>
        <h2>7. Add people from your phone, and add your own details</h2>
        <p>
          Tap the add-contact button on the Contacts tab and pick one person from your phone&apos;s contacts. TapCard
          uses their contact photo if they have one and opens their page, which looks like a proper TapCard. If the same person is in your contacts twice, TapCard marks them Possible duplicate and offers to merge them into one, keeping all their numbers and emails.
        </p>
        <p>
          Open any contact and add your own details: where you met, notes, another phone or email, their job title,
          company, website, social links or address. They appear in the card&apos;s normal tiles, marked with a small{" "}
          <strong>A</strong> so you know you added them. Tap one to use it, or the x under it to remove it. They stay
          on your phone, and are kept even if the person later stops sharing their card.
        </p>
        <p>
          <strong>Enhance this contact</strong> finds the missing details for you. It opens PowerSearch, which reads the
          signature in their latest emails on your phone and lists what it found. You tick what to keep. It needs
          PowerSearch, which is free for 7 days and then a one-off purchase.
        </p>
      </section>

      <section>
        <h2>8. Business cards</h2>
        <p>
          On any card except Personal, tap <strong>Edit</strong> and add <strong>Bookings &amp; links</strong>: Book a table,
          Book a room, Book an appointment, View our menu, Order online, Shop online, Opening hours, Leave a review,
          or your own rows such as a price list. <strong>Start from my type of business</strong> fills in a sensible set
          for a restaurant, hotel, shop, salon or trades. They show as tappable rows on your card and web page.
        </p>
      </section>

      <section>
        <h2>What does it cost?</h2>
        <p>
          TapCard is free to download. The first 1,000 people on iPhone, and the first 1,000 on Android, get it free for
          life. After that, sharing your card needs a small one-off unlock (from £0.99). There is no subscription, and
          the people you share with never pay or need the app.
        </p>
      </section>

      <section>
        <h2>Always in sync</h2>
        <ul>
          <li>
            <strong>Your link and QR code never go stale:</strong> when you edit your card, the same link and QR code
            show the update immediately — nothing to resend, nothing for anyone to re-scan.
          </li>
          <li>
            <strong>People you&apos;ve sent your card to directly stay current too:</strong> change your job title,
            company, phone or email and TapCard asks if you&apos;d like to let them know — say yes and they get a short,
            quiet email; the app opening their own copy of your card picks up the change automatically either way.
          </li>
          <li>
            <strong>Cards you&apos;ve received stay current, too:</strong> open the Contacts tab and TapCard checks
            whether anyone&apos;s details have changed since you saved them, flagging updates with a badge — so a card you
            saved months ago doesn&apos;t quietly go out of date.
          </li>
        </ul>
      </section>

      <section>
        <h2>What they can do with your card</h2>
        <ul>
          <li><strong>Tap to call</strong> or email you direct.</li>
          <li><strong>Tap through to your links</strong>: your website, LinkedIn, X, Instagram, or wherever you want them to find you.</li>
        </ul>
      </section>

      <section>
        <h2>Get TapCard</h2>
        <p>
          <a href={APP_STORE_URL}>Get TapCard on the App Store</a> (iPhone), or{" "}
          <a href={PLAY_STORE_URL}>get it on Google Play</a> (Android).
        </p>
      </section>
    </DocPage>
  );
}
