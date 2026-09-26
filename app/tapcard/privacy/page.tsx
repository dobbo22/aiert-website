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
    <DocPage title="Privacy Policy" updated="26 September 2026">
      <section>
        <h2>Summary</h2>
        <p>
          TapCard has no accounts, no advertising, no analytics and no tracking. Your card stays on your iPhone
          until you tap <strong>Share my card</strong>. Sharing publishes a copy at a private link so other people can
          view and save it, and <strong>Stop sharing</strong> deletes that copy from our servers. Cards other people
          share with you are kept on your iPhone, in the app and, if you choose, in your Contacts.
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
          contact, and this all happens on your iPhone. Nothing from your contacts is sent to us.
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
        <h2>Cards other people share with you</h2>
        <p>
          When you open someone&apos;s TapCard link or scan their QR code with TapCard installed, the app downloads
          the details shown on their card page so you can see and save them. Saved cards are kept on your iPhone,
          in the app&apos;s Contacts tab. You can remove them at any time.
        </p>
        <p className="mt-3">
          With <strong>Also save to iPhone Contacts</strong> switched on (it is on unless you turn it off in the
          Contacts tab), TapCard also saves each card you receive to your iPhone&apos;s Contacts. It asks for
          Contacts access the first time. To avoid duplicates it looks, on your iPhone, for a contact with the same
          email or phone number and adds only missing details to it. It never removes anything from your contacts,
          and nothing from your contacts is sent to us. If you don&apos;t allow access, cards stay in TapCard only.
        </p>
      </section>

      <section>
        <h2>Sending your card back</h2>
        <p>
          When you tap <strong>Send my card</strong> on someone&apos;s card, TapCard shares the card you chose (if it
          isn&apos;t already shared) and tells our server which of your cards to deliver to theirs. We store only
          those two card links, not a second copy of your details. The other person&apos;s app collects it the next
          time it opens, and we then delete that record straight away. A record that is never collected is deleted
          after 30 days, and it is also deleted if either card stops being shared.
        </p>
        <p className="mt-3">
          Once delivered, the other person keeps a copy of your card on their iPhone (and possibly in their
          contacts), just as if they had saved it from your card page. Stopping sharing later can&apos;t remove
          copies other people have already saved.
        </p>
        <p className="mt-3">
          Only the app that owns a card can send it, and the number of sends per card each hour is limited. If
          someone sends you a card you don&apos;t want, use <strong>Block</strong> on their card in the Contacts
          tab and anything else they send is ignored, or <strong>Report card</strong> to tell us about it.
        </p>
      </section>

      <section>
        <h2>Who can see a shared card</h2>
        <p>
          Anyone who has the link, scans the QR code or has the Wallet pass can see the card and save it as a
          contact. The link is long and random, and the page asks search engines not to index it, but it is not
          password protected, so only share it with people you are happy to give those details to. Anyone with your
          link can also send you their own card, which appears in your Contacts tab.
        </p>
        <p className="mt-3">
          The card page counts how many times it has been opened and saved, and those two numbers are shown to you
          in the app. We do not record who viewed or saved it.
        </p>
      </section>

      <section>
        <h2>Service providers</h2>
        <ul>
          <li>Vercel: hosts the TapCard website and API, and stores card photos.</li>
          <li>Neon: hosts the database that holds shared cards.</li>
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
          replace a card&apos;s photo, the old one is deleted. Stopping sharing also deletes any cards sent back to
          that card that haven&apos;t been collected yet. Deleting the app does not delete a card that is still
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
