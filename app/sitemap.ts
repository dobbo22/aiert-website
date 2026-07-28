import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { BUSINESS_BASE_URL, BUSINESS_ROUTES, IOS_BASE_URL, IOS_ROUTES } from "@/lib/mailbroom-routes.mjs";

// MailBroom marketing pages now live on their own domains, split by
// audience: mailbroom.app (B2B webapp funnel — the former
// business.mailbroom.app, retired and now 301-redirected here to
// consolidate SEO signal onto the apex domain) and ios.mailbroom.app
// (consumer iOS app). aiert.co.uk 301-redirects the old /mailbroom/*
// paths to these hosts (see next.config.ts) but is no longer the
// canonical URL for this content.
//
// The route lists themselves live in lib/mailbroom-routes.mjs, not here —
// scripts/submit-indexnow.mjs needs the same list and can't import a .ts
// file without a build step, so that plain-JS module is the single source
// of truth for both.
type Route = { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] };

// lib/mailbroom-routes.mjs is plain JS, so TS widens changeFrequency to
// `string` — cast back to the literal union sitemap() actually returns.
const businessRoutes = BUSINESS_ROUTES as Route[];
const iosRoutes = IOS_ROUTES as Route[];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const toEntry = (baseUrl: string) => ({ path, priority, changeFrequency }: Route) => ({
    url: `${baseUrl}${path}`,
    lastModified,
    changeFrequency,
    priority,
  });

  const host = (await headers()).get("host") ?? "";
  // Exact match, not startsWith — "app.mailbroom.app" would otherwise
  // never match anyway (doesn't start with "mailbroom.app"), but staying
  // exact here avoids the same substring trap as next.config.ts's rewrite.
  // business.mailbroom.app is kept as a fallback match too, in case a
  // stray request lands here before its 301-to-mailbroom.app redirect
  // (next.config.ts) has fully propagated.
  if (host === "mailbroom.app" || host === "www.mailbroom.app" || host.startsWith("business.mailbroom.app")) {
    return businessRoutes.map(toEntry(BUSINESS_BASE_URL));
  }
  if (host.startsWith("ios.mailbroom.app")) {
    return iosRoutes.map(toEntry(IOS_BASE_URL));
  }
  // Fallback (e.g. requested directly on aiert.co.uk): list both, since
  // this host no longer canonically owns either page tree.
  return [
    ...businessRoutes.map(toEntry(BUSINESS_BASE_URL)),
    ...iosRoutes.map(toEntry(IOS_BASE_URL)),
  ];
}
