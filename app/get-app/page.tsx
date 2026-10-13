import type { Metadata } from "next";
import GetAppQr from "./GetAppQr";

// Link previews (WhatsApp, iMessage, Slack…) read these, so each app gets its own title, text and
// picture instead of the site-wide company description.
const APPS: Record<string, { name: string; title: string; text: string; image: string }> = {
  tapcard: {
    name: "TapCard",
    title: "TapCard: digital business card (free for the first 1,000 users)",
    text: "Share your card with a QR code or a link, and save people into your contacts in one tap. They don't need the app.",
    image: "https://www.aiert.co.uk/tapcard-wallet-hero.png",
  },
  powersearch: {
    name: "PowerSearch",
    title: "PowerSearch: find any email across all your accounts",
    text: "Search every email account at once, privately on your phone. Free for 7 days, then a one-off purchase.",
    image: "https://www.aiert.co.uk/powersearch-icon.png",
  },
  mailbroom: {
    name: "MailBroom",
    title: "MailBroom: clean up your inbox",
    text: "See what is safe to delete, save or organise in your mailbox, in bulk instead of one email at a time.",
    image: "https://www.aiert.co.uk/mailbroom-icon.png",
  },
};

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ p?: string; a?: string }> }): Promise<Metadata> {
  const { p, a } = await searchParams;
  const app = a ? APPS[a] : undefined;
  const phone = p === "apple" ? "iPhone" : p === "google" ? "Android" : "";
  const title = app ? app.title : "Get TapCard, PowerSearch or MailBroom";
  const description = app
    ? `${app.text}${phone ? ` Get it for ${phone}.` : ""}`
    : "Simple productivity apps from Aiert Ltd: TapCard, PowerSearch and MailBroom, for iPhone and Android.";
  const image = app?.image ?? "https://www.aiert.co.uk/tapcard-icon.png";
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, images: [image], siteName: app?.name ?? "Aiert Ltd", type: "website" },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

// A handout page: pick the phone type and the app, then show a big QR code that opens that
// app's store page directly, to hold up for someone to scan.
export default function GetAppPage() {
  return <GetAppQr />;
}
