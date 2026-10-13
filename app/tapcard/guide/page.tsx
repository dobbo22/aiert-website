import type { Metadata } from "next";
import DocPage from "../DocPage";

export const metadata: Metadata = {
  title: "Visual guide – TapCard | AIERT Ltd",
  description: "A picture guide to TapCard: share your card, scan to add people, categories, your own notes and more.",
  robots: { index: true, follow: true },
};

const IMG = "https://www.aiert.co.uk/tapcard-guide";

const steps = [
  {
    title: "1. Share your card",
    img: "share.png",
    alt: "TapCard share screen with a QR code and Share, Send and Print buttons",
    text: "Your QR code is the quickest way. Anyone scans it with their camera and saves you, with no app needed. Under it, Share sends your link, Send picks people from your contacts, and Print makes a QR sign. Add your card to Apple Wallet or Google Wallet and choose a design.",
  },
  {
    title: "2. No signal? Use Offline QR",
    img: "offline.png",
    alt: "Offline QR code screen",
    text: "Tap No signal? Offline QR under your code. This code holds your contact details themselves, so it works with no internet and no app on their phone. You can also send your contact file by AirDrop.",
  },
  {
    title: "3. Find people fast with categories",
    img: "contacts.png",
    alt: "Contacts tab with category chips and a search box",
    text: "Tag contacts your own way, like #Restaurants, #Shops or #Clubs. A contact can have more than one. Filter by tapping a chip, or type #clubs in the search box. Categories stay on your phone.",
  },
  {
    title: "4. Add your own details",
    img: "contact.png",
    alt: "A received card showing the user's own extra phone, email, where they met and notes",
    text: "Open someone's card and tap My details to add where you met, a photo, another phone or email, and notes. They appear as extra rows on their card, and you can tap to call or email. This works for people you scanned and for people you picked from your phone contacts. New phones, emails and photos are added to their phone contact too. If they stop sharing, your details are kept.",
  },
  {
    title: "5. Bookings, shop and more for your business",
    img: "business-links.png",
    alt: "A business card with Book a table, Opening hours and Price list rows",
    text: "On a Business card, tap Edit and find Bookings & links. Add Book a table, Book a room, Book an appointment, View our menu, Order online, Shop online, Opening hours or Leave a review, or make your own with any label, like Price list. Not sure where to start? Tap Start from my type of business and pick restaurant, hotel, shop, salon or trades. Each one shows as a tappable row on your card and on your web card. The Personal card does not have them.",
  },
  {
    title: "6. Special offers: for your business",
    img: "offer-business.png",
    alt: "The Special offer screen showing a live offer, how many people claimed it and how many used it",
    text: "On a Business card, tap Edit, then Special offer. Write the offer (for example Free dessert with any main), choose an end date and a limit if you like, and set a staff PIN of 4 to 6 digits. Tap Post offer. Everyone who has your card in TapCard sees it the next time they open the app, with a green Offer badge on your name. You can see how many people claimed it and how many used it, replace it with a new one, or withdraw it at any time.",
  },
  {
    title: "7. Special offers: if you get one",
    img: "offer-customer.png",
    alt: "An offer on a saved card with a one-off QR code to show the staff",
    text: "When a business you have saved posts an offer, you see an Offer badge on their contact. Open their card and tap Claim this offer. You get your own one-off QR code. Show it to the staff when you pay. They scan it with their phone camera, enter their PIN, and it is marked as used. It works once, then shows Used. Claiming is free and needs no sign-up, and the business only sees how many people claimed, not who.",
  },
  {
    title: "8. Enhance a contact from their emails",
    img: "enhance.png",
    alt: "A contact card with added details marked with a small A, and the Enhance this contact button",
    text: "Open a contact and tap Enhance this contact. PowerSearch reads the signature in their latest emails, on your phone only, and lists what it found: phone numbers, job title, company, website, address and social links. If the contact has more than one email address, all of them are checked. Tick what you want and tap Add to TapCard. It needs the PowerSearch app (free for 7 days, then a one-off purchase). What you add appears on their card marked with a small A, in the normal tiles, and you can tap an item to use it or the x to remove it. Contacts you picked from your phone get the same card, with their contact photo if they have one.",
  },
  {
    title: "9. Scan to add someone",
    text: "On My Cards, tap the camera button at the top left and scan someone's TapCard QR code. They are added to your contacts straight away.",
  },
  {
    title: "10. Everything in one list",
    img: "help.png",
    alt: "How TapCard works screen inside the app",
    text: "In the app, tap the … menu at the top right, then How TapCard works, for a short list of everything TapCard can do.",
  },
];

// Visual guide: opened from the help screens inside the iPhone and Android apps.
export default function TapCardGuidePage() {
  return (
    <DocPage title="TapCard visual guide">
      <section>
        <p>
          A quick picture tour of TapCard. Screens shown are from the iPhone app; Android looks the same.
          More help is on the <a href="/how-it-works">How it works</a> and <a href="/support">Support</a> pages.
        </p>
      </section>
      <section>
        <h2>Watch: a restaurant with TapCard</h2>
        <p>
          A restaurant sets up its card, prints the QR code for the window, and a customer scans it, books a table and
          claims a special offer.
        </p>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          src={`${IMG}/restaurant-demo.mp4`}
          controls
          playsInline
          preload="none"
          className="mx-auto mt-3 w-full max-w-[300px] rounded-3xl border border-slate"
        />
      </section>
      {steps.map((s) => (
        <section key={s.title}>
          <h2>{s.title}</h2>
          <p>{s.text}</p>
          {s.img && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`${IMG}/${s.img}`}
              alt={s.alt}
              loading="lazy"
              className="mx-auto mt-3 w-full max-w-[300px] rounded-3xl border border-slate"
            />
          )}
        </section>
      ))}
    </DocPage>
  );
}
