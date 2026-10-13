import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import AttributionEnricher from "./AttributionEnricher";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Aiert Ltd – Simple productivity apps for iPhone and Android",
  description:
    "Aiert Ltd is a UK company building simple productivity apps: TapCard, a free digital business card; PowerSearch, which searches every email account at once; and MailBroom, which cleans up your inbox.",
  keywords: ["Aiert", "TapCard", "digital business card", "PowerSearch", "email search", "MailBroom", "email cleaner", "productivity apps", "iPhone", "Android", "UK"],
  metadataBase: new URL("https://www.aiert.co.uk"),
  openGraph: {
    title: "Aiert Ltd – Simple productivity apps for iPhone and Android",
    description:
      "TapCard (free digital business card), PowerSearch (search every email account at once) and MailBroom (clean up your inbox).",
    url: "https://www.aiert.co.uk",
    siteName: "AIERT Ltd",
    locale: "en_GB",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Aiert Ltd – Simple productivity apps for iPhone and Android",
    description: "TapCard (free digital business card), PowerSearch (search every email account at once) and MailBroom (clean up your inbox).",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={geist.variable}>
      <body className="antialiased">
        {children}
        <AttributionEnricher />
        <Analytics />
      </body>
    </html>
  );
}
