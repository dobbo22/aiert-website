// Single source of truth for MailBroom marketing URLs — consumed by both
// app/sitemap.ts (Next.js, host-aware) and scripts/submit-indexnow.mjs
// (plain Node, no TS/bundler). Kept as plain JS specifically so a bare
// `node scripts/submit-indexnow.mjs` can import it directly without a
// build step, matching the other scripts/*.mjs files in this repo.

export const BUSINESS_BASE_URL = "https://mailbroom.app";
export const BUSINESS_ROUTES = [
  { path: "", priority: 1.0, changeFrequency: "weekly" },
  { path: "/roi", priority: 0.8, changeFrequency: "monthly" },
  { path: "/guide", priority: 0.8, changeFrequency: "monthly" },
  { path: "/storage-costs", priority: 0.7, changeFrequency: "monthly" },
  { path: "/mailbox-full", priority: 0.7, changeFrequency: "monthly" },
  { path: "/employee-offboarding", priority: 0.6, changeFrequency: "monthly" },
  { path: "/bulk-delete-emails", priority: 0.7, changeFrequency: "monthly" },
  { path: "/tenant-migration", priority: 0.6, changeFrequency: "monthly" },
  { path: "/msp-storage-billing", priority: 0.6, changeFrequency: "monthly" },
  { path: "/msp-onboarding", priority: 0.6, changeFrequency: "monthly" },
  { path: "/shared-mailbox-cleanup", priority: 0.6, changeFrequency: "monthly" },
  { path: "/carbon-savings", priority: 0.5, changeFrequency: "monthly" },
  { path: "/gdpr", priority: 0.5, changeFrequency: "monthly" },
  { path: "/exchange-online-quotas", priority: 0.5, changeFrequency: "monthly" },
  { path: "/audit-mailbox-storage", priority: 0.5, changeFrequency: "monthly" },
  { path: "/litigation-hold", priority: 0.5, changeFrequency: "monthly" },
  { path: "/security", priority: 0.6, changeFrequency: "monthly" },
  { path: "/sso", priority: 0.6, changeFrequency: "monthly" },
  { path: "/support", priority: 0.5, changeFrequency: "monthly" },
  { path: "/affiliates", priority: 0.5, changeFrequency: "monthly" },
  { path: "/trial", priority: 0.7, changeFrequency: "monthly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
  { path: "/blog", priority: 0.6, changeFrequency: "weekly" },
  { path: "/blog/hidden-drain-on-your-business", priority: 0.6, changeFrequency: "monthly" },
  { path: "/blog/mailbroom-vs-clean-email", priority: 0.6, changeFrequency: "monthly" },
  { path: "/blog/mailbroom-vs-sanebox", priority: 0.6, changeFrequency: "monthly" },
  { path: "/blog/mailbroom-vs-bitrecover", priority: 0.6, changeFrequency: "monthly" },
  { path: "/blog/how-mailbroom-is-different", priority: 0.5, changeFrequency: "monthly" },
  { path: "/blog/mailbox-cleanup-tool-cost-comparison", priority: 0.5, changeFrequency: "monthly" },
  { path: "/leaderboard", priority: 0.5, changeFrequency: "weekly" },
];

export const IOS_BASE_URL = "https://ios.mailbroom.app";
export const IOS_ROUTES = [
  { path: "", priority: 0.6, changeFrequency: "monthly" },
  { path: "/blog", priority: 0.5, changeFrequency: "monthly" },
  { path: "/blog/your-emails-are-costing-the-planet", priority: 0.5, changeFrequency: "yearly" },
];
