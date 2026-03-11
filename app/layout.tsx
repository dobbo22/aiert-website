import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AIERT Ltd – AI-Powered Financial Technology",
  description:
    "AIERT Ltd is a UK-based artificial intelligence and financial technology company. We build intelligent platforms that empower investors and traders through data-driven insights.",
  keywords: ["AIERT", "AI", "fintech", "financial technology", "ShareQuest", "UK", "investment", "trading platform"],
  metadataBase: new URL("https://aiert.co.uk"),
  openGraph: {
    title: "AIERT Ltd – AI-Powered Financial Technology",
    description:
      "UK-based AI & fintech company building intelligent investment platforms. Home of ShareQuest — the UK's premier stock trading competition.",
    url: "https://aiert.co.uk",
    siteName: "AIERT Ltd",
    locale: "en_GB",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AIERT Ltd – AI-Powered Financial Technology",
    description: "UK-based AI & fintech company. Home of ShareQuest.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={geist.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
