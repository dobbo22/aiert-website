import type { Metadata } from "next";
import Script from "next/script";

// Twitter default for every page under mailbroom.app — no page
// defines its own `twitter` block, so this layout-level default is
// inherited everywhere. NOTE: og:image can't be set the same way here —
// Next.js's metadata merging replaces (doesn't deep-merge) a child's
// `openGraph` object wholesale, and every page.tsx sets its own openGraph
// block, so an openGraph.images default here would be silently dropped.
// It's set inline in each page's own openGraph block instead (see
// mailbroom-business-og.png usage across app/mailbroom/webapp/*/page.tsx).
// The 3 pages with their own dynamic opengraph-image.tsx (root, guide,
// roi) are unaffected either way — that file convention takes priority.
const OG_IMAGE = "https://mailbroom.app/mailbroom-business-og.png";

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
//
// Apollo website-visitor identification (company/people de-anonymization
// for inbound lead surfacing) — same scoping reasoning as Endorsely above:
// this is B2B-buyer traffic (the actual Apollo ICP), unlike aiert.co.uk
// (fintech) or ios.mailbroom.app (consumer iOS app), so it stays on this
// layout rather than the shared root one. Originally meant for
// business.mailbroom.app, but that host now 301s straight to mailbroom.app
// (see next.config.ts) before a page ever loads, so it belongs here instead
// — this layout is what actually renders for mailbroom.app/webapp/* traffic.
// Apollo's own snippet is an inline bootstrap function, not a plain `src`
// include, hence dangerouslySetInnerHTML rather than a src prop.
export default function MailBroomWebAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script src="https://assets.endorsely.com/endorsely.js" data-endorsely="0ff935cf-9c47-4c3d-bc19-ca92ae9e9e85" strategy="afterInteractive" async />
      <Script
        id="apollo-tracker"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `function initApollo(){var n=Math.random().toString(36).substring(7),o=document.createElement("script");o.src="https://assets.apollo.io/micro/website-tracker/tracker.iife.js?nocache="+n,o.async=!0,o.defer=!0,o.onload=function(){window.trackingFunctions.onLoad({appId:"6a68cb2e485525001ca10e0c"})},document.head.appendChild(o)}initApollo();`,
        }}
      />
      {children}
    </>
  );
}
