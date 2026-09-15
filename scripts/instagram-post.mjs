// Posts a photo with caption to the MailBroom Instagram Business account via
// the Instagram Graph API. Unlike Facebook, Instagram has no text-only post —
// every post needs an image, and the image must be reachable at a public
// URL (Instagram fetches it server-side; local file paths won't work). If
// the image isn't hosted anywhere yet, drop it in aiert-website's public/
// folder, deploy, and pass the resulting https://mailbroom.app/... URL.
//
// Usage:
//   npm run instagram:post -- "Caption text" https://example.com/image.jpg
//   npm run instagram:post -- --file scripts/posts/draft.txt https://example.com/image.jpg
//
// Required env vars (see .env.local):
//   FACEBOOK_PAGE_ACCESS_TOKEN       Page token with instagram_basic +
//                                     instagram_content_publishing
//   INSTAGRAM_BUSINESS_ACCOUNT_ID    IG user ID linked to the Page
import { config } from "dotenv";
import { readFile } from "fs/promises";

config({ path: ".env.local" });

const GRAPH_VERSION = "v26.0";
const API_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
const MAX_CAPTION_LENGTH = 2200;

const ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const IG_USER_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

if (!ACCESS_TOKEN || !IG_USER_ID) {
  console.error("Missing FACEBOOK_PAGE_ACCESS_TOKEN or INSTAGRAM_BUSINESS_ACCOUNT_ID in .env.local");
  process.exit(1);
}

const rawArgs = process.argv.slice(2);

let caption;
let imageUrl;

if (rawArgs[0] === "--file") {
  caption = (await readFile(rawArgs[1], "utf-8")).trim();
  imageUrl = rawArgs[2];
} else {
  [caption, imageUrl] = rawArgs;
}

if (!caption || !imageUrl) {
  console.error('Usage: npm run instagram:post -- "Caption text" https://example.com/image.jpg');
  console.error("   or: npm run instagram:post -- --file scripts/posts/draft.txt https://example.com/image.jpg");
  process.exit(1);
}

if (!/^https?:\/\//.test(imageUrl)) {
  console.error("Image must be a public https:// URL — Instagram fetches it server-side, local paths won't work.");
  process.exit(1);
}

if (caption.length > MAX_CAPTION_LENGTH) {
  console.error(`Caption is ${caption.length} characters — Instagram's limit is ${MAX_CAPTION_LENGTH}. Trim before posting.`);
  process.exit(1);
}

async function createContainer() {
  const url = new URL(`${API_BASE}/${IG_USER_ID}/media`);
  url.searchParams.set("image_url", imageUrl);
  url.searchParams.set("caption", caption);
  url.searchParams.set("access_token", ACCESS_TOKEN);

  const res = await fetch(url, { method: "POST" });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Container creation failed: ${res.status} ${JSON.stringify(json)}`);
  }
  return json.id;
}

async function publishContainer(containerId) {
  const url = new URL(`${API_BASE}/${IG_USER_ID}/media_publish`);
  url.searchParams.set("creation_id", containerId);
  url.searchParams.set("access_token", ACCESS_TOKEN);

  const res = await fetch(url, { method: "POST" });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Publish failed: ${res.status} ${JSON.stringify(json)}`);
  }
  return json.id;
}

console.log("Creating media container...");
const containerId = await createContainer();

console.log("Publishing...");
const postId = await publishContainer(containerId);

console.log(`Post created: ${postId}`);
console.log(`View at: https://www.instagram.com/mailbroom/`);
