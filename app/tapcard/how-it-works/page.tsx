import type { Metadata } from "next";
import DocPage from "../DocPage";

const DESCRIPTION =
  "Your business card on your phone: share it with a QR code or a link, swap details in seconds, and never run out of cards.";

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
          Download TapCard free and fill in your name, job title, company, phone, email, website and social links
          (LinkedIn, X, Instagram and more). Add a photo if you like. It takes a couple of minutes.
        </p>
      </section>

      <section>
        <h2>2. Share it</h2>
        <ul>
          <li><strong>QR code:</strong> open TapCard and let them scan the code with their phone camera.</li>
          <li><strong>Link:</strong> send your card&apos;s link by text, WhatsApp or email, or add it to your email signature.</li>
          <li><strong>Apple Wallet:</strong> add your card to Wallet so it&apos;s always to hand.</li>
        </ul>
      </section>

      <section>
        <h2>3. They save you in one tap</h2>
        <p>
          They don&apos;t need the app. Your card opens in their browser, they tap <strong>Save Contact</strong>, and your
          details go straight into their phone&apos;s contacts. No typing, no mistakes.
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
        <h2>What they can do with your card</h2>
        <ul>
          <li><strong>Tap to call</strong> or email you direct.</li>
          <li><strong>Tap through to your links</strong>: your website, LinkedIn, X, Instagram, or wherever you want them to find you.</li>
          <li>Always see your latest details: when you edit your card, the same link and QR code show the update.</li>
        </ul>
      </section>

      <section>
        <h2>Get TapCard</h2>
        <p>
          <a href={APP_STORE_URL}>Get TapCard free on the App Store</a> (iPhone). On Android?{" "}
          <a href="/android-waitlist">Tell me when TapCard is on Android</a>.
        </p>
      </section>
    </DocPage>
  );
}
