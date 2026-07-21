import type { MetadataRoute } from "next";
import { headers } from "next/headers";

// MailBroom marketing pages now live on their own subdomains, split by
// audience: business.mailbroom.app (B2B webapp funnel) and
// ios.mailbroom.app (consumer iOS app). aiert.co.uk 301-redirects the
// old /mailbroom/* paths to these hosts (see next.config.ts) but is no
// longer the canonical URL for this content.
type Route = { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] };

const BUSINESS_BASE_URL = "https://business.mailbroom.app";
const BUSINESS_ROUTES: Route[] = [
  { path: "", priority: 1.0, changeFrequency: "weekly" },
  { path: "/roi", priority: 0.8, changeFrequency: "monthly" },
  { path: "/guide", priority: 0.8, changeFrequency: "monthly" },
  { path: "/storage-costs", priority: 0.7, changeFrequency: "monthly" },
  { path: "/mailbox-full", priority: 0.7, changeFrequency: "monthly" },
  { path: "/employee-offboarding", priority: 0.6, changeFrequency: "monthly" },
  { path: "/bulk-delete-emails", priority: 0.7, changeFrequency: "monthly" },
  { path: "/tenant-migration", priority: 0.6, changeFrequency: "monthly" },
  { path: "/msp-storage-billing", priority: 0.6, changeFrequency: "monthly" },
  { path: "/security", priority: 0.6, changeFrequency: "monthly" },
  { path: "/sso", priority: 0.6, changeFrequency: "monthly" },
  { path: "/support", priority: 0.5, changeFrequency: "monthly" },
  { path: "/affiliates", priority: 0.5, changeFrequency: "monthly" },
  { path: "/trial", priority: 0.7, changeFrequency: "monthly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
];

const IOS_BASE_URL = "https://ios.mailbroom.app";
const IOS_ROUTES: Route[] = [
  { path: "", priority: 0.6, changeFrequency: "monthly" },
  { path: "/leaderboard", priority: 0.5, changeFrequency: "weekly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const toEntry = (baseUrl: string) => ({ path, priority, changeFrequency }: Route) => ({
    url: `${baseUrl}${path}`,
    lastModified,
    changeFrequency,
    priority,
  });

  const host = (await headers()).get("host") ?? "";
  if (host.startsWith("business.mailbroom.app")) {
    return BUSINESS_ROUTES.map(toEntry(BUSINESS_BASE_URL));
  }
  if (host.startsWith("ios.mailbroom.app")) {
    return IOS_ROUTES.map(toEntry(IOS_BASE_URL));
  }
  // Fallback (e.g. requested directly on aiert.co.uk): list both, since
  // this host no longer canonically owns either page tree.
  return [
    ...BUSINESS_ROUTES.map(toEntry(BUSINESS_BASE_URL)),
    ...IOS_ROUTES.map(toEntry(IOS_BASE_URL)),
  ];
}
