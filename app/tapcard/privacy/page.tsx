import type { Metadata } from "next";
import DocPage from "../DocPage";

export const metadata: Metadata = {
  title: "Privacy Policy – TapCard | AIERT Ltd",
  description: "What TapCard stores, what it shares when you share your card, and how to delete it.",
};

// Keep in step with the app's PrivacyInfo.xcprivacy and the App Store
// privacy answers — if TapCard starts sending anything new to the backend,
// all three need updating.
export default function TapCardPrivacyPage() {
  return (
    <DocPage title="Privacy Policy" updated="1 October 2026">
      <section>
        <h2>Summary</h2>
        <p>
          TapCard has no accounts, no advertising and no tracking, and its only analytics is anonymous counts of
          taps on our own app promotions and of how far people get through setting up their card (see below). Your card stays on your iPhone
          until you tap <strong>Share my card</strong>. Sharing publishes a copy at a private link so other people can
          view and save it, and <strong>Stop sharing</strong> deletes that copy from our servers.
        </p>
      </section>

      <section>
        <h2>Verifying a business and reports</h2>
        <p>
          A business can verify its card in two ways. It can add a line we give it to its own website, which we check by reading that one
          public page. Or it can type an email address on its website&apos;s domain: we send a 6-digit code to that address and keep the address and the
          code&apos;s fingerprint for 30 days, then delete them. We use them only to check the code. A verified card shows a tick and the domain it was verified for.
        </p>
        <p>
          When you report a card, offer or news item we save the card, the reason you chose and anything you wrote (not who you are), and email
          it to our support address. Closed reports are deleted after a year. When you look up a business by name in the app, the name you type
          goes to our server and on to Google Places to find it, and we check our own public cards for a match: no information about you is sent.
        </p>
      </section>

      <section>
        <h2>Checking what businesses post</h2>
        <p>
          Offers and news that a business posts are checked automatically before anyone sees them. We do not allow abusive content,
          gambling offers (betting, casinos, poker, slots and similar), or money-making and lending scams, and posts that break
          these rules are refused. Refused and flagged posts are kept for 30 days so we can review mistakes, then deleted. If you see
          something that should not be there, use &ldquo;Report this card, offer or news&rdquo; on the card page.
        </p>
      </section>

      <section>
        <h2>Setup counts</h2>
        <p>
          While you set up your card, the app tells us when it reaches a step (for example &ldquo;card built&rdquo;), so we can
          see where people get stuck and make setup easier. Only the step name, whether it was iPhone or Android, and whether
          you chose a business or yourself are sent. We store a count per day. No device id, IP address, name or card is sent
          or stored with it, so a count can never be tied to you.
        </p>
        <p>
          If you use <strong>Find your business</strong>, the name you type is sent to our server, which asks Google Places
          for matching businesses and returns the list. We do not keep what you typed.
        </p>
      </section>

      <section>
        <h2>Who we are</h2>
        <p>
          TapCard is provided by AIERT Ltd, registered in England &amp; Wales (No. 16587000), which is the data
          controller for the information described here. Contact:{" "}
          <a href="mailto:enquiries@aiert.co.uk">enquiries@aiert.co.uk</a>.
        </p>
      </section>

      <section>
        <h2>On your iPhone only</h2>
        <p>
          Your cards are stored locally in the app. Until you share a card, nothing in it leaves your device. If
          you use <strong>Fill in from Contacts</strong>, iOS lets you pick one contact and gives TapCard only that
          contact; TapCard does not get access to the rest of your address book. Photos you choose are handled the
          same way, through the system photo picker.
        </p>
        <p className="mt-3">
          If you tap <strong>Add missing details to my contact</strong>, TapCard asks for Contacts access (on iOS 18
          and later you can allow just your own contact), shows you which details from your card are missing from
          that contact, and adds only the ones you tick. It never removes or changes anything already in the
          contact, and this all happens on your iPhone. Your address book is never sent to us. The one exception is when you choose to send your card to a person: see <em>When you send your card to someone</em> below.
        </p>
      </section>

      <section>
        <h2>When you share a card</h2>
        <p>Tapping Share sends a copy of that card to our server so it can be shown at its link, QR code and Apple Wallet pass:</p>
        <ul>
          <li>name, job title, company, phone, email and website</li>
          <li>social links (LinkedIn, X, Instagram, Facebook, TikTok) you added</li>
          <li>your card photo, if it has one, resized before upload</li>
          <li>the card&apos;s label (for example &quot;Business&quot;)</li>
          <li>
            a random identifier created by the app, used only so Wallet can group your passes together. It is not
            your device&apos;s advertising identifier or any Apple identifier.
          </li>
          <li>
            a secret edit key for that card, stored only as a one-way hash, so that only your app can change or
            delete it
          </li>
        </ul>
        <p className="mt-3">
          Edits you save to a shared card are sent the same way so the link stays up to date. To limit abuse, when a
          card is first shared we keep a one-way hash of the sending IP address to cap how many cards can be
          created in an hour. We never store the IP address itself.
        </p>
      </section>

      <section>
        <h2>When you send your card to someone</h2>
        <p>
          If you use <strong>Send</strong> and pick a person from your Contacts, the app tells our server that one
          person&apos;s <strong>name, phone number and email address</strong> (not the rest of your address book).
          We keep them so that:
        </p>
        <ul>
          <li>you can see in the app whether they have opened or accepted your card;</li>
          <li>they can be emailed a short note if you later change a detail on your card. Every such email has a
            &ldquo;Don&apos;t send me these&rdquo; link, and we stop straight away when they use it; and</li>
          <li>they can choose to share their own details back through a page we send them. If they do, what they
            choose to share (name, phone, email, job title, company, website) is kept with the entry and shown to you.</li>
        </ul>
        <p className="mt-3">
          This is kept until you remove that person in the app or delete the card, and it is deleted with the card.
          It is not used for anything else and is not shared with anyone.
        </p>
      </section>

      <section>
        <h2>Who can see a shared card</h2>
        <p>
          Anyone who has the link, scans the QR code or has the Wallet pass can see the card and save it as a
          contact. The link is long and random, and the page asks search engines not to index it, but it is not
          password protected, so only share it with people you are happy to give those details to.
        </p>
        <p className="mt-3">
          The card page counts how many times it has been opened and saved, and those two numbers are shown to you
          in the app. We do not record who viewed or saved it.
        </p>
      </section>

      <section>
        <h2>Counting interest in our other apps</h2>
        <p>
          When you tap the MailBroom or PowerSearch promotion inside TapCard, the app tells our server which one was
          tapped and whether it was on iPhone or Android. It sends nothing else: not your card, your name or any
          device identifier. Our server stores that with the approximate country, a shortened IP address (the last
          part removed, so it can&apos;t identify you) and the app and system version, so we can count how many
          people are interested. Taps on the TapCard, MailBroom and PowerSearch links on a shared card page are
          counted the same way. None of this is linked to you or used to track you.
        </p>
      </section>

      <section>
        <h2>Founder places and the lifetime unlock</h2>
        <p>
          The first 1,000 people get TapCard free for life. To count them, when you first share your own card the app
          sends our server Apple&apos;s signed record of when your Apple ID first downloaded TapCard. We keep only a one-way hash of its identifier, that
          download date, your place in the count and the price offered to you. It contains no name, email or card
          details, and isn&apos;t used to track you. Lifetime unlock purchases are handled by Apple; we never see your
          payment details.
        </p>
      </section>

      <section>
        <h2>TapCard Promote subscriptions and updates from businesses</h2>
        <p>
          TapCard Promote is an auto-renewing subscription bought through Apple or Google; we never see your payment
          details. To let a business post offers and news, its app sends our server the store&apos;s signed proof of the
          subscription (Apple&apos;s signed transaction or the Google Play purchase token) together with the card&apos;s
          secret edit token. We check it with Apple or Google and keep only the card it belongs to, the subscription
          end date, whether it is a free trial, and which plan. Redeeming a restaurant offer code is done by the store.
        </p>
        <p>
          Following a business is private. When you follow a business, your phone tells our server only that one more
          phone follows it, using a random id the app keeps on your phone (not your name, email, phone number or
          card), which we store in scrambled (hashed) form so it cannot be turned back into anything about you. The
          business sees a single number, how many people follow it, and never who.
        </p>
        <p>
          <strong>Notifications.</strong> To send you offers and news the moment they are posted, our server uses
          Apple&apos;s and Google&apos;s notification services. For that we store your phone&apos;s notification
          address (a token Apple or Google gives the app), kept with the same random id, together with which
          businesses you follow and which kinds of message you chose (offers, an offer ending soon, menu and detail
          changes, news). The notification contains only what the business posted, which is public. We keep a short
          record of what we sent, for 14 days, to keep to the limit of two notifications a week from each business.
          Your notification address is deleted within 30 days of you no longer following any business, when Apple
          or Google tells us the phone is no longer reachable, or after 90 days without use. You can turn notifications off per business, in
          the app (the &ldquo;...&rdquo; menu on a card), with each notification&apos;s Mute button, or in your phone&apos;s
          settings. Turning them off takes you out of the follower number. When you claim an offer, the business sees
          only how many people claimed and used it, never who.
        </p>
      </section>

      <section>
        <h2>The &ldquo;Build my TapCard&rdquo; demo</h2>
        <p>
          On tapcard.aiert.co.uk/demo you type a business name, your website, a type of business and your email, and we build a
          card from your own website. When you press <strong>Build my TapCard</strong> we keep your email address, business name,
          website and type of business, together with a one-way scrambled (hashed) form of your connection address that stops the form
          being abused. You agree to this by ticking the box on the form. We do not need you to ask for the emailed link first.
        </p>
        <p>
          If you ask for the link, we email it to you once and keep the card we built for you. We note whether you open the
          link, tap an App Store or Google Play button on that page, and open TapCard with your card, so we can help if you get
          stuck. There is no tracking pixel in the email.
        </p>
        <p>
          We only send you marketing about TapCard if you tick the separate, optional box saying so, and you can unsubscribe at
          any time. If you don&apos;t tick it, you are not added to any marketing list.
        </p>
        <p>
          <strong>How long we keep it:</strong> everything from the demo (the email, business details, the card we built and what
          happened after the link) is deleted automatically after 60 days. You can ask us to delete it sooner by emailing{" "}
          <a href="mailto:enquiries@aiert.co.uk">enquiries@aiert.co.uk</a>. The demo is provided by AIERT Ltd.
        </p>
      </section>

      <section>
        <h2>Service providers</h2>
        <ul>
          <li>Vercel: hosts the TapCard website and API, and stores card photos.</li>
          <li>Neon: hosts the database that holds shared cards.</li>
          <li>
            Apple (APNs) and Google (Firebase Cloud Messaging): deliver notifications to your phone. They receive the
            notification and your phone&apos;s notification address, as with any app that sends notifications.
          </li>
          <li>
            Google: the app and the card page show your company&apos;s logo using Google&apos;s public favicon
            service, which receives your website&apos;s domain and the viewer&apos;s IP address, as with any image
            loaded from Google.
          </li>
          <li>
            Apple: the in-app links to our other apps open Apple&apos;s own App Store banner, and Wallet passes are
            handled by Apple Wallet.
          </li>
        </ul>
        <p className="mt-3">We do not sell or rent your information, or share it with anyone for advertising.</p>
      </section>

      <section>
        <h2>How long we keep it, and deleting it</h2>
        <p>
          A shared card stays online until you tap <strong>Stop sharing</strong> in the app. That permanently deletes
          it from our database and deletes its photo, and the link, QR code and Wallet pass stop working. When you
          replace a card&apos;s photo, the old one is deleted. Deleting the app does not delete a card that is still
          shared, so stop sharing first, or email us with the card&apos;s link and we will delete it.
        </p>
      </section>

      <section>
        <h2>Your rights</h2>
        <p>
          Under UK data protection law you can ask for a copy of the information we hold about you, or ask us to
          correct or delete it, by emailing <a href="mailto:enquiries@aiert.co.uk">enquiries@aiert.co.uk</a>. You
          can also complain to the Information Commissioner&apos;s Office (ico.org.uk).
        </p>
      </section>

      <section>
        <h2>Reporting a card</h2>
        <p>
          If a TapCard link shows something abusive or impersonates you, use the <strong>Report this card</strong>{" "}
          link on the card page or email us, and we will review and remove it.
        </p>
      </section>

      <section>
        <h2>TapCard for Business</h2>
        <p>
          Company cards set up through TapCard for Business are covered by this policy too. How company accounts,
          staff invites and company cards are handled is explained on the{" "}
          <a href="/business/security">TapCard for Business security &amp; privacy</a> page.
        </p>
      </section>
      <section>
        <h2>Children</h2>
        <p>TapCard is a business-card tool and is not directed at children under 13.</p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>If this policy changes materially, we will update the date at the top of this page.</p>
      </section>
    </DocPage>
  );
}
