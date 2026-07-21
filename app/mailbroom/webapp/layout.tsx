import type { Metadata } from "next";
import Script from "next/script";

// Twitter default for every page under business.mailbroom.app — no page
// defines its own `twitter` block, so this layout-level default is
// inherited everywhere. NOTE: og:image can't be set the same way here —
// Next.js's metadata merging replaces (doesn't deep-merge) a child's
// `openGraph` object wholesale, and every page.tsx sets its own openGraph
// block, so an openGraph.images default here would be silently dropped.
// It's set inline in each page's own openGraph block instead (see
// mailbroom-business-og.png usage across app/mailbroom/webapp/*/page.tsx).
// The 3 pages with their own dynamic opengraph-image.tsx (root, guide,
// roi) are unaffected either way — that file convention takes priority.
const OG_IMAGE = "https://business.mailbroom.app/mailbroom-business-og.png";

export const metadata: Metadata = {
  twitter: {
    card: "summary_large_image",
    images: [OG_IMAGE],
  },
};

// Endorsely affiliate-click tracking for the Referral & Affiliate
// programme (app/mailbroom/webapp/affiliates) — scoped to MailBroom for
// Business pages only, not the whole aiert-website (ShareQuest, main AIERT
// site, etc.). Fresh account started directly on app.mailbroom.app.
export default function MailBroomWebAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script src="https://assets.endorsely.com/endorsely.js" data-endorsely="0ff935cf-9c47-4c3d-bc19-ca92ae9e9e85" strategy="afterInteractive" async />
      {children}
    </>
  );
}
