import type { Metadata } from "next";
import DocPage from "../DocPage";

export const metadata: Metadata = {
  title: "Support – TapCard | AIERT Ltd",
  description: "Help with TapCard, the digital business card for iPhone and Android.",
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
          <li>Use <strong>Share</strong>, <strong>Send</strong> or <strong>QR sign</strong> (business cards) to share the link, send it to contacts, or email yourself a QR sign for your window.</li>
          <li>No signal? Tap <strong>Offline QR</strong>. The code contains your contact details, so it works without signal or the app.</li>
          <li>People who scan the QR code see your card in their browser and can tap Save Contact. They don&apos;t need the app.</li>
          <li>Edits you save update the same link and QR code. </li>
          <li>To stop sharing with one person, open them in Contacts and tap <strong>Stop sharing with</strong> them.</li>
          <li>To take your card offline altogether, open <strong>Edit this card</strong> and choose <strong>Stop sharing this card online</strong>. The link and QR code then stop working.</li>
        </ul>
      </section>

      <section>
        <h2>Offers tab</h2>
        <ul>
          <li>The <strong>Offers</strong> tab lists every saved business with an offer right now, marked New, Claimed or Used. Offers ending within three days are listed first.</li>
          <li>On a claimed offer tap <strong>Show at till</strong> for its QR code or stamp card, or add it to Apple Wallet or Google Wallet. Wallet shows the stamps you had when you added it, so open the app for the latest count.</li>
          <li><strong>Share with a friend</strong> sends a link to the business&apos;s page and its offer.</li>
          <li>iPhone: the location button on the Offers tab has an optional switch to tell you when you are near an offer. It needs location set to Always, and your location stays on your phone. Android shows a Near you list while the app is open.</li>
          <li>To post offers or news, a business has to be <strong>verified</strong> (an emailed code to an address on its own website, or a line on its website).</li>
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
          <li><strong>Can I see where my card went?</strong> When you send your card to someone from your contacts, their page in TapCard shows how it was sent (WhatsApp, email or text message) and when, and later <strong>Opened</strong> with the date once they open the link, then <strong>Accepted</strong> if they share their details back. TapCard opens WhatsApp, your mail app or Messages with the message ready for you to send, so it can show that you started the send but cannot see inside those apps. The message includes a link to your card and a link to get the app.</li>
          <li><strong>Is TapCard free?</strong> TapCard is free to download, and always free for your customers: saving cards, following a business and claiming offers cost nothing. The first 1,000 people on iPhone and the first 1,000 on Android share their own card free for life. They are counted when they first share a card, not when they install. After that, sharing needs a small one-off unlock (from £0.99). Businesses that subscribe to TapCard Promote can share their card with no unlock fee.</li>
          <li><strong>What is TapCard Promote and what does it cost?</strong> Promote is for businesses: post special offers (each with a one-off QR code) and news to the people who follow you, see how many claimed and used them, and share your own card with no unlock fee. It starts with <strong>3 months free</strong>, then £49.99 a year or £9.99 a month. You can cancel any time in your App Store or Google Play subscriptions; the Promote box on your card has a Manage subscription button. If you stop, your existing card, link and QR code keep working. You just can&apos;t post new offers or news.</li>
          <li><strong>I run several locations. How do I use Promote on all of them?</strong> One Promote subscription covers one card. For a restaurant group or any business with several locations, <a href="/business">TapCard for Business</a> gives every location card Promote, with one login to post offers and news for each location and see their numbers. Email enquiries@aiert.co.uk to set it up.</li>
          <li><strong>How do I get updates from a business?</strong> When you save a business, its card asks &ldquo;Get offers and news from this business?&rdquo;. Tap Yes, keep me posted to turn it on, or Not now to leave it off. You can change it any time from the ⋯ menu at the top of their card (Get offers and news, Turn off offers and news, Choose what I get), and you choose what you get: new offers, an offer ending soon, menu and detail changes, and announcements. You get at most two a week from each business, every notification has a Mute button, and the business sees only how many people follow it, never who.</li>

          <li><strong>What does the other person see?</strong> Only what is on the card you share: your name, job, company and the contact details and links you filled in. They never see your notes or categories for other people.</li>
          <li><strong>Do they need the app?</strong> No. Your card opens in their browser and they tap Save to save you. On a phone they are also pointed to the app so they can send theirs back.</li>
          <li><strong>What happens if I stop sharing a card?</strong> The online copy is deleted, so the link and QR code stop working. People who already saved you in their contacts keep what they saved.</li>
          <li><strong>What if someone stops sharing with me?</strong> Their card stays in your list, marked Withdrawn, with the last details you had and anything you added. Your phone contact is not changed.</li>
          <li><strong>Can I add a booking, menu or shop link to my card?</strong> Yes, on any card except Personal. Tap Edit, then Bookings &amp; links. Choose Book a table, Book a room, Book an appointment, View our menu, Order online, Shop online, Opening hours or Leave a review, or add your own row with any label. When you enter your website, TapCard suggests the links it finds there and, where your site publishes them, your opening hours (matched to the branch at your card&apos;s address for chains). With a menu or hours but no online booking, the phone row on your card says Call to book. &ldquo;Start from my type of business&rdquo; fills in a sensible set for a restaurant, hotel, shop, salon or trades. They show as tappable rows on your card and web page, up to 10 per card. A menu that is a PDF is saved on the customer&apos;s phone the first time they open it, so it opens at once and works with no signal. TapCard checks the restaurant&apos;s site each time and replaces the saved copy only when the menu has changed.</li>
          <li><strong>How do special offers work for my business?</strong> On your Business card in My Cards, find <strong>Promote your business</strong> and tap Create an offer (this needs TapCard Promote, which starts with 3 months free). Write the offer, choose how long it lasts and how many people can claim it, and choose a staff PIN of 4 to 6 digits. People who have your card see it and can claim it. Each person gets their own one-off QR code. To redeem it, scan the code with your phone camera, enter your PIN and tap Mark as used. The same code cannot be used twice, a new offer replaces the old one, and you can withdraw it at any time. You see how many claimed and how many used it, but not who. You give the discount yourself; TapCard does not take payments.</li>

          <li><strong>My till has no camera. How do my staff redeem an offer?</strong> Staff can open <strong>tapcard.aiert.co.uk/redeem</strong> on any browser, type the 10-character code shown under the customer&apos;s QR code, check the offer is valid, then enter your staff PIN and tap Mark as used. It works on any till, tablet or computer that can open a web page.</li>
          <li><strong>How do I claim an offer I have been sent?</strong> A business you have saved shows an Offer badge on its contact. Open it and tap Claim this offer, then show the QR code to the staff when you pay. It works once and then shows Used. It is free, needs no sign-up, and the business cannot see who you are.</li>
          <li><strong>Can I add my own notes to someone I picked from my contacts?</strong> Yes. Open them under My Contacts and tap My details. Notes, where you met, a photo (which you can reposition) and extra numbers are kept on your phone, and new numbers, emails and the photo are added to their phone contact.</li>
          <li><strong>How do I add someone from my phone contacts?</strong> On the Contacts tab tap the add-contact button and pick one person. TapCard uses their contact photo if they have one and opens their page, ready for Enhance or your own details. They look like any other TapCard contact. If the same person is in your contacts more than once, they are marked Possible duplicate and TapCard asks whether to merge them into one TapCard contact, keeping all their numbers and emails. Your phone&apos;s own contacts are not changed.</li>
          <li><strong>What does Enhance do, and do I need PowerSearch?</strong> Enhance opens PowerSearch, which reads the signature in a contact&apos;s latest emails on your phone and suggests missing details such as a mobile number, job title, website or address. If the contact has more than one email address, all of them are checked. You tick what to keep and it is added to their card in TapCard, marked with a small A. The email text never leaves your phone. It needs the PowerSearch app, which is free for 7 days and then a one-off purchase.</li>
          <li><strong>What does Report a problem with this card do?</strong> It opens an email to TapCard support, which you can edit before sending, about a card that is offensive, fake or wrong. It does not remove the contact from your phone; use Block for that.</li>
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
