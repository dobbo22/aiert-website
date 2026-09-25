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
          <li>Tap <strong>Share my card</strong> to get a link, a QR code and an Apple Wallet pass.</li>
          <li>People who scan the QR code see your card in their browser and can tap Save Contact. They don&apos;t need the app.</li>
          <li>Edits you save update the same link and QR code. To update a Wallet pass, add it to Wallet again.</li>
          <li><strong>Stop sharing</strong> deletes the online copy, and the link and QR code stop working.</li>
        </ul>
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
          Tap <strong>+</strong> to add another card (for example a second business), and swipe on the main screen to
          switch between them. Each card has its own name, link, QR code and Wallet pass. To remove one, open it,
          tap Edit, then <strong>Delete card</strong>. That also stops sharing it.
        </p>
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
