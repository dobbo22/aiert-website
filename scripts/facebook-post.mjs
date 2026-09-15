// Posts a text (and optionally single-photo) update to the MailBroom
// Facebook Page via the Graph API's Pages API. Requires a Page access token
// with pages_manage_posts + pages_read_engagement (see "MailBroom Media" app
// at developers.facebook.com).
//
// Usage:
//   npm run facebook:post -- "Post text here"
//   npm run facebook:post -- "Post text here" ./path/to/photo.jpg
//   npm run facebook:post -- --file scripts/posts/draft.txt [./path/to/photo.jpg]
//
// Required env vars (see .env.local):
//   FACEBOOK_PAGE_ID             Numeric Page ID
//   FACEBOOK_PAGE_ACCESS_TOKEN   Page access token (long-lived, from
//                                 GET /me/accounts in Graph API Explorer)
import { config } from "dotenv";
import { readFile } from "fs/promises";

config({ path: ".env.local" });

const GRAPH_VERSION = "v26.0";
const API_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
const MAX_MESSAGE_LENGTH = 63206; // Facebook's Page post message limit

const PAGE_ID = process.env.FACEBOOK_PAGE_ID;
const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

if (!PAGE_ID || !PAGE_ACCESS_TOKEN) {
  console.error("Missing FACEBOOK_PAGE_ID or FACEBOOK_PAGE_ACCESS_TOKEN in .env.local");
  process.exit(1);
}

const rawArgs = process.argv.slice(2);

let message;
let photoPath;

if (rawArgs[0] === "--file") {
  message = (await readFile(rawArgs[1], "utf-8")).trim();
  photoPath = rawArgs[2];
} else {
  [message, photoPath] = rawArgs;
}

if (!message) {
  console.error('Usage: npm run facebook:post -- "Post text" [path/to/photo.jpg]');
  console.error("   or: npm run facebook:post -- --file scripts/posts/draft.txt [path/to/photo.jpg]");
  process.exit(1);
}

if (message.length > MAX_MESSAGE_LENGTH) {
  console.error(`Post text is ${message.length} characters — Facebook's limit is ${MAX_MESSAGE_LENGTH}. Trim before posting.`);
  process.exit(1);
}

async function postPhoto(path, caption) {
  const fileBytes = await readFile(path);
  const form = new FormData();
  form.append("caption", caption);
  form.append("access_token", PAGE_ACCESS_TOKEN);
  form.append("source", new Blob([fileBytes]), path.split("/").pop());

  const res = await fetch(`${API_BASE}/${PAGE_ID}/photos`, {
    method: "POST",
    body: form,
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Photo post failed: ${res.status} ${JSON.stringify(json)}`);
  }

  return json.post_id;
}

async function postText(text) {
  const res = await fetch(`${API_BASE}/${PAGE_ID}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: text, access_token: PAGE_ACCESS_TOKEN }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Post failed: ${res.status} ${JSON.stringify(json)}`);
  }

  return json.id;
}

const postId = photoPath
  ? await (async () => {
      console.log(`Uploading photo: ${photoPath}`);
      return postPhoto(photoPath, message);
    })()
  : await postText(message);

console.log(`Post created: ${postId}`);
console.log(`View at: https://www.facebook.com/${postId}`);
