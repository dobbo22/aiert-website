import type { Metadata } from "next";
import GetAppQr from "./GetAppQr";

export const metadata: Metadata = {
  title: "Get the app | AIERT Ltd",
  description: "Scan to install TapCard, PowerSearch or MailBroom from the App Store or Google Play.",
  robots: { index: false, follow: false },
};

// A handout page: pick the phone type and the app, then show a big QR code that opens that
// app's store page directly, to hold up for someone to scan.
export default function GetAppPage() {
  return <GetAppQr />;
}
