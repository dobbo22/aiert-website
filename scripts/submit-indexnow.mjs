// Notifies Bing (and other IndexNow-participating engines) of every
// current MailBroom URL — both the Business webapp funnel and the iOS
// app site — via the shared api.indexnow.org endpoint. Route lists are
// imported from lib/mailbroom-routes.mjs, the same source app/sitemap.ts
// uses, so this never drifts out of sync with the sitemap. Re-run after
// adding/removing pages, or after a significant content update to an
// existing page; not needed for minor edits, which natural crawling
// handles fine.
import { BUSINESS_BASE_URL, BUSINESS_ROUTES, IOS_BASE_URL, IOS_ROUTES } from "../lib/mailbroom-routes.mjs";

const KEY = "09d90e3ec75e4e3c93a57c014df8764a";

// IndexNow requires every URL in a batch to belong to the same `host` —
// mailbroom.app and ios.mailbroom.app are submitted as two separate
// batches. The key file itself is the same physical public/ asset,
// hosted at each domain's own root (see next.config.ts exclusions).
const BATCHES = [
  { host: "mailbroom.app", baseUrl: BUSINESS_BASE_URL, routes: BUSINESS_ROUTES },
  { host: "ios.mailbroom.app", baseUrl: IOS_BASE_URL, routes: IOS_ROUTES },
];

let failed = false;

for (const { host, baseUrl, routes } of BATCHES) {
  const urlList = routes.map(({ path }) => `${baseUrl}${path}`);
  const keyLocation = `${baseUrl}/${KEY}.txt`;

  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host, key: KEY, keyLocation, urlList }),
  });

  console.log(`${host}: ${res.status} ${res.statusText}`);
  if (!res.ok) {
    console.error(await res.text());
    failed = true;
    continue;
  }
  console.log(`Submitted ${urlList.length} URLs for ${host}`);
}

if (failed) process.exit(1);
