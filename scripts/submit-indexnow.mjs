// Notifies Bing (and other IndexNow-participating engines) of every
// current MailBroom for Business URL via the shared api.indexnow.org
// endpoint. Route list is imported from lib/mailbroom-routes.mjs — the
// same source app/sitemap.ts uses — so this never drifts out of sync
// with the sitemap. Re-run after adding/removing pages, or after a
// significant content update to an existing page; not needed for
// minor edits, which natural crawling handles fine.
import { BUSINESS_BASE_URL, BUSINESS_ROUTES } from "../lib/mailbroom-routes.mjs";

const KEY = "09d90e3ec75e4e3c93a57c014df8764a";
const HOST = "mailbroom.app";
const KEY_LOCATION = `${BUSINESS_BASE_URL}/${KEY}.txt`;

const urlList = BUSINESS_ROUTES.map(({ path }) => `${BUSINESS_BASE_URL}${path}`);

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList }),
});

console.log(`IndexNow: ${res.status} ${res.statusText}`);
if (!res.ok) {
  console.error(await res.text());
  process.exit(1);
}
console.log(`Submitted ${urlList.length} URLs for ${HOST}`);
