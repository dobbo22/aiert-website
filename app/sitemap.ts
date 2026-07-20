import type { MetadataRoute } from "next";

const BASE_URL = "https://aiert.co.uk";

// MailBroom for Business marketing pages. Scoped here rather than
// listing the whole aiert-website site, since this is the funnel Google
// needs to be pointed at first — extend with other site sections later.
const WEBAPP_ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/mailbroom/webapp", priority: 1.0, changeFrequency: "weekly" },
  { path: "/mailbroom/webapp/roi", priority: 0.8, changeFrequency: "monthly" },
  { path: "/mailbroom/webapp/guide", priority: 0.8, changeFrequency: "monthly" },
  { path: "/mailbroom/webapp/storage-costs", priority: 0.7, changeFrequency: "monthly" },
  { path: "/mailbroom/webapp/mailbox-full", priority: 0.7, changeFrequency: "monthly" },
  { path: "/mailbroom/webapp/employee-offboarding", priority: 0.6, changeFrequency: "monthly" },
  { path: "/mailbroom/webapp/bulk-delete-emails", priority: 0.7, changeFrequency: "monthly" },
  { path: "/mailbroom/webapp/security", priority: 0.6, changeFrequency: "monthly" },
  { path: "/mailbroom/webapp/sso", priority: 0.6, changeFrequency: "monthly" },
  { path: "/mailbroom/webapp/support", priority: 0.5, changeFrequency: "monthly" },
  { path: "/mailbroom/webapp/affiliates", priority: 0.5, changeFrequency: "monthly" },
  { path: "/mailbroom/webapp/trial", priority: 0.7, changeFrequency: "monthly" },
  { path: "/mailbroom/webapp/privacy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/mailbroom/webapp/terms", priority: 0.3, changeFrequency: "yearly" },
  { path: "/mailbroom", priority: 0.6, changeFrequency: "monthly" },
  { path: "/mailbroom/leaderboard", priority: 0.5, changeFrequency: "weekly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return WEBAPP_ROUTES.map(({ path, priority, changeFrequency }) => ({
    url: `${BASE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
