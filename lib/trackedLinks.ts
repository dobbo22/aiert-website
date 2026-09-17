// Single source of truth for every tracked redirect link (/mailbroom/fb-*
// and /mailbroom/go/*). Used by /api/track-click (allowlist), the admin
// Link Clicks panel (labels), and the /mailbroom/go/[slug] dynamic redirect
// (destination). The fb-* links are separate hardcoded pages (already
// shared in a live Facebook post, so their URLs can't change) but are
// listed here too so the API route and admin panel only need one source.

export type TrackedLink = {
  label: string;
  to: string;
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
};
