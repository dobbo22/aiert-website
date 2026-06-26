import type { Metadata } from "next";
import { Playfair_Display, Cormorant_Garamond, Great_Vibes } from "next/font/google";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const greatVibes = Great_Vibes({
  variable: "--font-script",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "You're Invited",
  description: "Martin & Karen Dobson's 25th Wedding Anniversary Dinner",
  robots: { index: false, follow: false },
  openGraph: {
    title: "You're Invited",
    description: "Martin & Karen Dobson's 25th Wedding Anniversary Dinner",
    url: "https://aiert.co.uk/invite",
    siteName: "Martin & Karen's 25th Anniversary",
    images: [{ url: "/anniversary-og.jpg", width: 1200, height: 669 }],
    locale: "en_GB",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "You're Invited",
    description: "Martin & Karen Dobson's 25th Wedding Anniversary Dinner",
    images: ["/anniversary-og.jpg"],
  },
};

export default function InviteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${playfair.variable} ${cormorant.variable} ${greatVibes.variable}`}>
      {children}
    </div>
  );
}
