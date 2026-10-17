// Posts a text (and optionally single-photo) update to the MailBroom
// Facebook Page via the Graph API's Pages API. Requires a Page access token
// with pages_manage_posts + pages_read_engagement (see "MailBroom Media" app
// at developers.facebook.com).
//
// Usage:
//   npm run facebook:post -- "Post text here"
//   npm run facebook:post -- "Post text here" ./path/to/photo.jpg
//   npm run facebook:post -- --file scripts/posts/draft.txt [./path/to/photo.jpg]
//   npm run facebook:post -- --file scripts/posts/draft.txt ./path/to/video.mp4   (.mp4 / .mov = video)
//
// Flags (anywhere in the command):
//   --dry-run      Show exactly what would be posted and open the media locally. Posts nothing, needs no token.
//   --unpublished  Upload to the Page as an unpublished draft (visible only to Page admins in Meta Business Suite),
//                  so it can be previewed on Facebook and published by hand. Photos and videos only.
//
// Required env vars (see .env.local):
//   FACEBOOK_PAGE_ID             Numeric Page ID
//   FACEBOOK_PAGE_ACCESS_TOKEN   Page access token (long-lived, from
//                                 GET /me/accounts in Graph API Explorer)
import { config } from "dotenv";
import { readFile, stat } from "fs/promises";
import { execFile } from "child_process";

config({ path: ".env.local" });

const GRAPH_VERSION = "v26.0";
const API_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
const MAX_MESSAGE_LENGTH = 63206; // Facebook's Page post message limit

const PAGE_ID = process.env.FACEBOOK_PAGE_ID;
const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

const argv = process.argv.slice(2);
const DRY_RUN = argv.includes("--dry-run");
const UNPUBLISHED = argv.includes("--unpublished");
const rawArgs = argv.filter((a) => a !== "--dry-run" && a !== "--unpublished");

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

const isVideo = (path) => /\.(mp4|mov)$/i.test(path ?? "");

async function postVideo(path, description) {
  const fileBytes = await readFile(path);
  const form = new FormData();
  form.append("description", description);
  form.append("access_token", PAGE_ACCESS_TOKEN);
  if (UNPUBLISHED) form.append("published", "false");
  form.append("source", new Blob([fileBytes], { type: "video/mp4" }), path.split("/").pop());

  const res = await fetch(`${API_BASE}/${PAGE_ID}/videos`, { method: "POST", body: form });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Video post failed: ${res.status} ${JSON.stringify(json)}`);
  }
  return json.id;
}

async function postPhoto(path, caption) {
  const fileBytes = await readFile(path);
  const form = new FormData();
  form.append("caption", caption);
  form.append("access_token", PAGE_ACCESS_TOKEN);
  if (UNPUBLISHED) form.append("published", "false");
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

if (DRY_RUN) {
  console.log("---- DRY RUN: nothing is sent to Facebook ----");
  console.log(`Page: ${PAGE_ID ?? "(FACEBOOK_PAGE_ID not set locally)"}`);
  console.log(`Type: ${photoPath ? (isVideo(photoPath) ? "video" : "photo") : "text only"}`);
  if (photoPath) {
    const { size } = await stat(photoPath);
    console.log(`Media: ${photoPath} (${(size / 1024 / 1024).toFixed(2)} MB)`);
    if (isVideo(photoPath) && size > 1024 * 1024 * 1024) console.log("WARNING: over 1 GB, use the resumable upload API instead");
    execFile("open", [photoPath], () => {});
  }
  const links = message.match(/https?:\/\/\S+/g) ?? [];
  console.log(`Characters: ${message.length}`);
  console.log(`Links in the text: ${links.length ? links.join("  ") : "NONE"}`);
  console.log("\n=========== POST TEXT ===========\n" + message + "\n=================================");
  process.exit(0);
}

if (!PAGE_ID || !PAGE_ACCESS_TOKEN) {
  console.error("Missing FACEBOOK_PAGE_ID or FACEBOOK_PAGE_ACCESS_TOKEN in .env.local");
  process.exit(1);
}

const postId = photoPath
  ? await (async () => {
      if (isVideo(photoPath)) {
        console.log(`Uploading video: ${photoPath}${UNPUBLISHED ? " (unpublished draft)" : ""}`);
        return postVideo(photoPath, message);
      }
      console.log(`Uploading photo: ${photoPath}${UNPUBLISHED ? " (unpublished draft)" : ""}`);
      return postPhoto(photoPath, message);
    })()
  : await postText(message);

console.log(UNPUBLISHED ? `Unpublished draft created: ${postId}` : `Post created: ${postId}`);
if (UNPUBLISHED) console.log("Preview it in Meta Business Suite (Content > Posts and stories > Unpublished), then publish there.");
else console.log(`View at: https://www.facebook.com/${postId}`);
