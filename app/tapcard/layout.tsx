import type { Metadata } from "next";
import type { ReactNode } from "react";

// TapCard's own icons. Without these the pages inherited the site-wide icon files, and
// /apple-icon.png does not exist on tapcard.aiert.co.uk (the proxy rewrites it to /tapcard/apple-icon.png),
// so iPhones got no home-screen icon.
const OG_IMAGE = "https://www.aiert.co.uk/tapcard-og.png";

// Every TapCard page shares TapCard's own banner (1200x630) when its link is shared, unless the page sets its own. Pages that
// set their own openGraph (the home page, Promote...) replace this whole object, so they name the image themselves.
export const metadata: Metadata = {
  icons: {
    icon: [{ url: "https://www.aiert.co.uk/tapcard-icon.png" }],
    apple: "https://www.aiert.co.uk/tapcard-icon.png",
  },
  openGraph: {
    siteName: "TapCard",
    type: "website",
    title: "TapCard – your business card on your phone",
    description: "Share your details with a tap or a QR code. Free to try, no app needed to receive a card.",
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "TapCard: your business card on your phone" }],
  },
  twitter: { card: "summary_large_image", images: [OG_IMAGE] },
};

export default function TapCardLayout({ children }: { children: ReactNode }) {
  return children;
}
