import type { Metadata } from "next";
import DocPage from "../DocPage";

export const metadata: Metadata = {
  title: "Support – TapCard | AIERT Ltd",
  description: "Help with TapCard, the free digital business card for iPhone.",
};

// The App Store "Support URL" for TapCard (tapcard.aiert.co.uk/support).
export default function TapCardSupportPage() {
  return (
    <DocPage title="TapCard Support">
      <section>
        <p>
          Need help, found a bug, or want a shared card removed? Email{" "}
          <a href="mailto:enquiries@aiert.co.uk?subject=TapCard%20support">enquiries@aiert.co.uk</a> and we&apos;ll
          get back to you.
        </p>
      </section>

      <section>
        <h2>Sharing your card</h2>
        <ul>
          <li>Tap <strong>Share my card</strong> to get a link, a QR code and a Wallet pass (Apple Wallet or Google Wallet). Pick a design and your Wallet card updates to match.</li>
          <li>Use <strong>Share</strong>, <strong>Send</strong> or <strong>Print</strong> to share the link, send it to contacts, or print a QR sign.</li>
          <li>No signal? Tap <strong>Offline QR</strong>. The code contains your contact details, so it works without signal or the app.</li>
          <li>People who scan the QR code see your card in their browser and can tap Save Contact. They don&apos;t need the app.</li>
          <li>Edits you save update the same link and QR code. </li>
          <li>To stop sharing with one person, open them in Contacts and tap <strong>Stop sharing with</strong> them.</li>
          <li>To take your card offline altogether, open <strong>Edit this card</strong> and choose <strong>Stop sharing this card online</strong>. The link and QR code then stop working.</li>
        </ul>
      </section>

      <section>
        <h2>Contacts and categories</h2>
        <p>
          Open a contact and add #tags such as <strong>restaurants</strong> or <strong>clubs</strong>. A contact can
          have several. Use the filter chips or the search box to find them. Categories are stored on your phone only.
          To add someone in person, tap the camera button at the top left and scan their TapCard QR code.
        </p>
      </section>

      <section>
        <h2>Social links</h2>
        <p>
          Type a full link or just your handle. For example, <strong>@yourname</strong> in the X field becomes
          x.com/yourname. For Facebook, choose whether the link is your personal profile or a business Page.
        </p>
      </section>

      <section>
        <h2>More than one card</h2>
        <p>
          Tap the <strong>…</strong> menu at the top right, then <strong>Add another card</strong> (for example a second business), and swipe on the main screen to
          switch between them. Each card has its own name, link, QR code and Wallet pass. To remove one, open it,
          choose <strong>Edit this card</strong>, then <strong>Delete card</strong>. That also stops sharing it.
        </p>
      </section>

      <section>
        <h2>Common questions</h2>
        <ul>
          <li><strong>What does the other person see?</strong> Only what is on the card you share: your name, job, company and the contact details and links you filled in. They never see your notes or categories for other people.</li>
          <li><strong>Do they need the app?</strong> No. Your card opens in their browser and they tap Save to save you. On a phone they are also pointed to the free app so they can send theirs back.</li>
          <li><strong>What happens if I stop sharing a card?</strong> The online copy is deleted, so the link and QR code stop working. People who already saved you in their contacts keep what they saved.</li>
          <li><strong>What if someone stops sharing with me?</strong> Their card stays in your list, marked Withdrawn, with the last details you had and anything you added. Your phone contact is not changed.</li>
          <li><strong>Who can see my notes, photos and categories?</strong> Only you. They are stored on your phone and are never sent to TapCard or to the person. If you save someone to your contacts, your extra phone numbers and emails are added to that contact (and on Android, your notes too).</li>
          <li><strong>Why does TapCard ask for my contacts?</strong> To save people you receive, and to let you pick people to send your card to. It only adds details; it never removes anything.</li>
          <li><strong>Why does Nearby ask for my location?</strong> To sort your contacts by distance. It uses your approximate location, once, and only on your phone.</li>
          <li><strong>I have no signal. Can I still share?</strong> Yes. Tap Offline QR. The code holds your contact details, so it works with no internet and no app on their phone.</li>
          <li><strong>My Wallet card did not update.</strong> Open the card, choose a design under Add to Wallet, and it updates. If it still shows the old one, remove it from Wallet and add it again.</li>
        </ul>
        <p>Prefer pictures? See the <a href="/guide">visual guide</a>.</p>
      </section>

      <section>
        <h2>Privacy</h2>
        <p>
          Nothing leaves your iPhone until you share. See the <a href="/privacy">privacy policy</a> for exactly
          what is shared and how to delete it.
        </p>
      </section>
    </DocPage>
  );
}
