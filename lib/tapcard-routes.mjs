// Single source of truth for TapCard's public marketing URLs — consumed by
// app/sitemap.ts (host-aware) and scripts/submit-indexnow.mjs. Plain JS so a
// bare `node scripts/submit-indexnow.mjs` can import it. Per-card pages
// (/c/<id>), offers, tokens and admin screens are deliberately absent: they
// are private or noindex.

export const TAPCARD_BASE_URL = "https://tapcard.aiert.co.uk";
export const TAPCARD_ROUTES = [
  { path: "", priority: 1.0, changeFrequency: "weekly" },
  { path: "/digital-business-card", priority: 0.8, changeFrequency: "monthly" },
  { path: "/how-it-works", priority: 0.8, changeFrequency: "monthly" },
  { path: "/business", priority: 0.8, changeFrequency: "monthly" },
  { path: "/promote", priority: 0.7, changeFrequency: "monthly" },
  { path: "/societies", priority: 0.7, changeFrequency: "monthly" },
  { path: "/demo", priority: 0.7, changeFrequency: "monthly" },
  { path: "/guide", priority: 0.6, changeFrequency: "monthly" },
  { path: "/business/guide", priority: 0.5, changeFrequency: "monthly" },
  { path: "/business/security", priority: 0.5, changeFrequency: "monthly" },
  { path: "/support", priority: 0.4, changeFrequency: "monthly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
];
