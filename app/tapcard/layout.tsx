import type { Metadata } from "next";
import type { ReactNode } from "react";

// TapCard's own icons. Without these the pages inherited the site-wide icon files, and
// /apple-icon.png does not exist on tapcard.aiert.co.uk (the proxy rewrites it to /tapcard/apple-icon.png),
// so iPhones got no home-screen icon.
export const metadata: Metadata = {
  icons: {
    icon: "https://www.aiert.co.uk/tapcard-icon.png",
    apple: "https://www.aiert.co.uk/tapcard-icon.png",
  },
};

export default function TapCardLayout({ children }: { children: ReactNode }) {
  return children;
}
