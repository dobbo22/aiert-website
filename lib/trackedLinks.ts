// Single source of truth for every tracked redirect link (/mailbroom/fb-*
// and /mailbroom/go/*). Used by /api/track-click (allowlist), the admin
// Link Clicks panel (labels), and the /mailbroom/go/[slug] dynamic redirect
// (destination). The fb-* links are separate hardcoded pages (already
// shared in a live Facebook post, so their URLs can't change) but are
// listed here too so the API route and admin panel only need one source.

export type TrackedLink = {
  label: string;
  to: string;
  /// App Store id, for links that should carry App Store Connect campaign
  /// attribution (pt=/ct=) — see appStoreCampaignUrl in /tapcard/go.
  appStoreId?: string;
  /** Google Play package: Android visitors are sent to Play instead of the App Store. */
  playPackage?: string;
  /// App Store campaign name (ct=) and Google Play utm_source/utm_medium for this link; defaults to the card-page ones.
  campaign?: string;
  playSource?: string;
  playMedium?: string;
  /// Logged by an app reporting a tap (/api/promo-event), not a redirect.
  inApp?: boolean;
};

export const TRACKED_LINKS: Record<string, TrackedLink> = {
  // Personal launch Facebook post — separate hardcoded pages under
  // app/mailbroom/fb-*/page.tsx, each with its own destination.
  "fb-launch": { label: "Facebook post → App Store", to: "https://apps.apple.com/gb/app/mailbroom/id6766489663" },
  "fb-medium": { label: "Facebook post → Medium article", to: "https://medium.com/p/your-50-000-emails-are-costing-the-planet-heres-the-cleaner-that-fixes-both-6ba92f1b2dee" },
  "fb-review": { label: "Facebook post → TheBusinessDive review", to: "https://thebusinessdive.com/mailbroom-review" },
  "fb-follow": { label: "Facebook post → Page follow", to: "https://www.facebook.com/profile.php?id=61594266844705&locale=en_GB" },

  // Launch directory submissions — all point at the marketing site
  // (has App Store CTAs built in), served via /mailbroom/go/[slug].
  "taaft": { label: "There's An AI For That", to: "https://ios.mailbroom.app" },
  "futurepedia": { label: "Futurepedia", to: "https://ios.mailbroom.app" },
  "betalist": { label: "BetaList", to: "https://ios.mailbroom.app" },
  "indie-hackers": { label: "Indie Hackers", to: "https://ios.mailbroom.app" },
  "altern": { label: "Altern", to: "https://ios.mailbroom.app" },
  "ai-directory": { label: "AI Directory", to: "https://ios.mailbroom.app" },
  "ai-dir": { label: "AI Dir", to: "https://ios.mailbroom.app" },
  "uneed": { label: "uNeed", to: "https://ios.mailbroom.app" },
  "productivity-directory": { label: "Productivity Directory", to: "https://ios.mailbroom.app" },
  "toolkitly": { label: "Toolkitly", to: "https://ios.mailbroom.app" },
  "betapage": { label: "Betapage", to: "https://ios.mailbroom.app" },
  "startupbase": { label: "StartupBase", to: "https://ios.mailbroom.app" },
  "launching-next": { label: "Launching Next", to: "https://ios.mailbroom.app" },
  "open-launch": { label: "Open Launch", to: "https://ios.mailbroom.app" },
  "peerpush": { label: "PeerPush", to: "https://ios.mailbroom.app" },
  "launch-llama": { label: "Launch Llama Directory", to: "https://ios.mailbroom.app" },
  "remote-tools": { label: "Remote Tools", to: "https://ios.mailbroom.app" },
  "toolfinder": { label: "ToolFinder", to: "https://ios.mailbroom.app" },

  // LinkedIn "Software as a Service (SaaS) 2024" group post — IT Director
  // trial pitch, two separate links in the same post body.
  "li-saas-trial": { label: "LinkedIn SaaS group post → Trial signup", to: "https://mailbroom.app/trial" },
  "li-saas-roi": { label: "LinkedIn SaaS group post → ROI calculator", to: "https://mailbroom.app/roi" },

  // X (Twitter) product-drop replies — one slug reused across any reply to
  // a "drop your product below" style post, since these are one-off
  // engagement replies rather than a single named campaign. Two separate
  // slugs — the consumer iOS app and the M365 SaaS product are different
  // products with different buyers, so they get their own reply links
  // (and separate click counts in the admin panel) rather than sharing one.
  "x-product-drop": { label: "X reply → App Store (MailBroom iOS)", to: "https://apps.apple.com/gb/app/mailbroom/id6766489663" },
  "x-product-drop-saas": { label: "X reply → MailBroom for Business (trial signup)", to: "https://mailbroom.app/trial" },

  // TapCard: the "Get TapCard" and cross-promo links on every shared card
  // page (tapcard.aiert.co.uk/go/<slug>), and taps on the cross-promo cards
  // inside the TapCard apps, reported anonymously by the app.
  "tapcard-web-get-tapcard": { label: "TapCard card page → Get TapCard", to: "https://apps.apple.com/app/id6816003159", appStoreId: "6816003159", playPackage: "com.mailbroom.tapcard" },
  // The "Get the app" line in the message TapCard prepares when someone sends their card to a contact.
  "tapcard-web-share-get-tapcard": { label: "TapCard sent message → Get TapCard", to: "https://apps.apple.com/app/id6816003159", appStoreId: "6816003159", playPackage: "com.mailbroom.tapcard", campaign: "tapcard-message", playSource: "tapcard-message", playMedium: "sent-card" },
  // The Get the App handout page (www.aiert.co.uk/get-app): its QR codes point here, so every scan is counted.
  "tapcard-web-qr-tapcard": { label: "Get-app QR → TapCard", to: "https://apps.apple.com/app/id6816003159", appStoreId: "6816003159", playPackage: "com.mailbroom.tapcard", campaign: "qr-handout", playSource: "qr", playMedium: "handout" },
  "tapcard-web-qr-powersearch": { label: "Get-app QR → PowerSearch", to: "https://apps.apple.com/app/powersearch/id6807772868", appStoreId: "6807772868", playPackage: "mailbroom.app", campaign: "qr-handout", playSource: "qr", playMedium: "handout" },
  "tapcard-web-qr-mailbroom": { label: "Get-app QR → MailBroom", to: "https://apps.apple.com/app/mailbroom/id6766489663", appStoreId: "6766489663", campaign: "qr-handout", playSource: "qr", playMedium: "handout" },
  "tapcard-web-mailbroom": { label: "TapCard card page → MailBroom", to: "https://apps.apple.com/app/mailbroom/id6766489663", appStoreId: "6766489663" },
  "tapcard-web-powersearch": { label: "TapCard card page → PowerSearch", to: "https://apps.apple.com/app/powersearch/id6807772868", appStoreId: "6807772868", playPackage: "mailbroom.app" },
  "tapcard-web-invite-mailbroom": { label: "TapCard invite email → MailBroom", to: "https://apps.apple.com/app/mailbroom/id6766489663", appStoreId: "6766489663" },
  "tapcard-web-invite-powersearch": { label: "TapCard invite email → PowerSearch", to: "https://apps.apple.com/app/powersearch/id6807772868", appStoreId: "6807772868" },
  "tapcard-app-ios-mailbroom": { label: "TapCard iPhone app → MailBroom promo tapped", to: "", inApp: true },
  "tapcard-app-ios-powersearch": { label: "TapCard iPhone app → PowerSearch promo tapped", to: "", inApp: true },
  "tapcard-app-android-mailbroom": { label: "TapCard Android app → MailBroom promo tapped", to: "", inApp: true },
  "tapcard-app-android-powersearch": { label: "TapCard Android app → PowerSearch promo tapped", to: "", inApp: true },
};
