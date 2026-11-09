import { PRICING_SENTENCE } from "./tapcardBizPricing";

// Single source of truth for the TapCard FAQ answers. Used by the website pages (and their FAQ schema) and by the LinkedIn
// comment assistant (lib/linkedinFaq.ts). Keep these in step with what the pages say.

export const PROMOTE_FAQ = [
  ["What is TapCard Promote?", "One-touch marketing for a restaurant, café, salon or shop. You post a special offer or a news flash from your phone, and the people who follow your card are notified on their phone."],
  ["How much does TapCard Promote cost?", "Free for the first 3 months, then £49.99 a year or £9.99 a month. One subscription covers one business card, and you can cancel any time in the App Store or Google Play. The TapCard app is free for your customers."],
  ["Do my customers need the TapCard app?", "Anyone can scan your QR code, see your card and save you. To follow you and get offers and news as notifications, they need the free TapCard app."],
  ["How does a customer claim an offer?", "Each person claims their own one-off QR code. Your staff scan it with a phone camera (or type the code on any till), enter the PIN, and it is marked as used. It can never be used twice."],
  ["If a customer shares an offer with a friend, does it stop working for them?", "No. Sharing sends your card link and the offer wording, never the customer's own code, so the friend claims their own one-off QR code and the first customer's code carries on working. Each phone or browser gets one code per offer, and claiming again on the same phone shows the same code. Someone who claims on a second device may get a second code, so staff scanning at the till is the real check; you can also set a limit on how many can be claimed."],
  ["Can I run a stamp card?", "Yes. You choose the number of stamps and the reward in your own words. Customers keep the stamp card on their phone, your staff add a stamp with a scan and your PIN, and the card starts again when the reward is given."],
  ["Will I be able to see who my customers are?", "No. You see numbers only: how many people claimed each offer, how many used it, how many follow you and how often your card is viewed. You never see who anyone is."],
  ["I have several locations. Which plan do I need?", "TapCard for Business. It is priced per location and billed yearly (£42 a year each for 2 to 4 locations, £34 each for 5 to 19, £27 each from 20, all plus VAT), includes up to 10 staff cards per location and includes Promote on every card. One shop or one card? Choose Promote."],
] as const;

export const BUSINESS_FAQ = [
  ["What is TapCard for Business?", "A way to give every employee and every location a digital business card on their phone. Logo, colours, website and social links are set once and locked to your brand, and you add your whole team in one go."],
  ["How much does TapCard for Business cost?", `${PRICING_SENTENCE} Start with a 30-day free trial.`],
  ["Does my team need to make an account or pay for the app?", "No. Employees share their card from day one. The personal lifetime-unlock paywall does not apply to company-provisioned cards, and the company pays one subscription."],
  ["How do I add all my staff at once?", "Choose your staff list (a CSV, or an Outlook, Google or iCloud contacts export) and you get one invite link per person to send from your own email. The list stays on your computer."],
  ["Can each branch post its own offers and news?", "Yes. Every location card includes TapCard Promote, so each branch can post special offers (each with a one-off QR code) and news to the people who follow it. Head office sees every location's views, scans, saves and offers claimed and used in one place, with a CSV download."],
  ["I only have one shop. Do I need TapCard for Business?", "No. Business starts at two locations. For one shop or one card, TapCard Promote in the app is £49.99 a year or £9.99 a month (VAT included), with the first 3 months free."],
] as const;

export const HOW_IT_WORKS_FAQ = [
  ["Does the person I share my card with need the TapCard app?", "No. Your card opens in their browser and they tap Save Contact to put your details into their phone's contacts. Only people who want to receive your offers and news need the app."],
  ["How do I get their details back?", "Anyone who opens your card on the web, or in the iPhone App Clip, can tap Share your details and leave their name and a phone number or email, with no app and no sign-up. They appear in your Contacts marked New. If they install TapCard, the app offers to send you their own card in one tap. You can switch this off for a card in Edit card."],
  ["Can I share my TapCard with no signal?", "Yes. Tap Offline QR to show a QR code that holds your contact details themselves, so it works with no signal and no app on their phone. You can also send your contact file by AirDrop."],
  ["Can I put my business card in Apple Wallet or Google Wallet?", "Yes. Add your card to your phone's Wallet so it is always to hand, and pick a design in the app so your Wallet card matches."],
  ["Do I need an account to make a TapCard?", "No. There is nothing to sign up for. Answer what the card is for, add your details, and share it."],
  ["Can TapCard fill in my card for me?", "Yes, if you ask. When a business card is missing a phone number, opening hours, an address, a booking or menu link or social profiles, TapCard looks them up from Apple Maps (iPhone), public business listings and your website, and shows them in a Review screen. Nothing is added until you tap Add, a detail you skip is not offered again, and Google is not used."],
  ["Can I send a contact their own TapCard?", "Yes. Tap Send card on a contact you added: a switch under it (on by default) also sends them a second link to a ready-made TapCard built from the details you hold for them. They check it and keep it. It is kept for 30 days and you can switch it off for any send."],
  ["Does TapCard take payments for offers?", "No. You give the discount yourself; TapCard does not take payments. Promote, which lets a business post offers and news, starts with 3 months free, then costs £49.99 a year or £9.99 a month."],
] as const;

export const SOCIETIES_FAQ = [
  ["How can a club, society or charity use TapCard?", "People follow your group once, and every news item you post reaches their phone. You post one short line from your phone, with an optional Read more link to the full story on your website or newsletter."],
  ["How much does it cost?", "Free for 3 months, then £49.99 a year or £9.99 a month for one card with TapCard Promote (news, events and stamp cards). Making and sharing the card is free, and people who follow you never pay."],
  ["Do our members need the TapCard app?", "To receive news and offers as notifications they need the free TapCard app. People without it can still see your card and its latest news on its page."],
  ["Can we see who follows us?", "No. You see how many people follow you, never who. Followers choose what they hear about and get at most two notifications a week from you."],
  ["Can we run events, member perks or a stamp card?", "Yes. Offer a first session free, early-bird tickets or a members' discount, each claimed with its own one-off code and checked by a steward with a PIN. Or run a stamp card, such as attend six sessions and get the seventh free."],
  ["Are posts moderated?", "Posts are checked automatically: no abusive content, no gambling offers and no money-making scams. A raffle or fundraiser is fine, and we may take a look at it. Anyone can report a card, offer or news item from its page."],
] as const;
