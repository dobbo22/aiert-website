// Posts a text (and optionally single-image) update to the AIERT Ltd
// LinkedIn Company Page via the Posts API. Requires a LinkedIn Developer
// App with Community Management API access (w_organization_social scope)
// and a member access token generated via the 3-legged OAuth flow.
//
// Usage:
//   npm run linkedin:post -- "Post text here"
//   npm run linkedin:post -- "Post text here" ./path/to/image.jpg
//   npm run linkedin:post -- --file scripts/posts/draft.txt [./path/to/image.jpg]
//
// Required env vars (see .env.local):
//   LINKEDIN_ACCESS_TOKEN   OAuth2 access token with w_organization_social
//   LINKEDIN_ORG_URN        e.g. urn:li:organization:12345678
//
// Optional env var:
//   LINKEDIN_GROUPS   Comma-separated list of LinkedIn Group names you're a
//                      member of. There is no public Groups API — LinkedIn
//                      deprecated it years ago and it can't be automated
//                      without violating their User Agreement — so after a
//                      successful post this just prints a reminder to
//                      manually reshare into each one.
import { config } from "dotenv";
import { readFile } from "fs/promises";

config({ path: ".env.local" });

const LINKEDIN_VERSION = "202604"; // YYYYMM — bump periodically per LinkedIn's versioning schedule
const API_BASE = "https://api.linkedin.com/rest";
const MAX_COMMENTARY_LENGTH = 3000;

const ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;
const ORG_URN = process.env.LINKEDIN_ORG_URN;

if (!ACCESS_TOKEN || !ORG_URN) {
  console.error("Missing LINKEDIN_ACCESS_TOKEN or LINKEDIN_ORG_URN in .env.local");
  process.exit(1);
}

const argv = process.argv.slice(2).filter((a) => a !== "--dry-run");
// --reshare "comment": after the Page post, reshare it from Martin's personal profile with this comment
// (needs w_member_social and LINKEDIN_PERSON_URN). Opt-in only so nothing lands on a personal profile by accident.
let reshareComment = null;
const ri = argv.indexOf("--reshare");
if (ri !== -1) {
  reshareComment = argv[ri + 1];
  if (!reshareComment || reshareComment.startsWith("--")) {
    console.error('--reshare needs a comment, e.g. --reshare "Our latest, would love your thoughts"');
    process.exit(1);
  }
  argv.splice(ri, 2);
}
// --article <url> --title "..." --desc "..." [image]: post a link card (title, description and the image as thumbnail).
const takeFlag = (name) => {
  const i = argv.indexOf(name);
  if (i === -1) return null;
  const v = argv[i + 1];
  argv.splice(i, 2);
  return v;
};
const articleUrl = takeFlag("--article");
const articleTitle = takeFlag("--title");
const articleDesc = takeFlag("--desc");
if (articleUrl && !articleTitle) {
  console.error('--article needs --title "..." (and optionally --desc "...")');
  process.exit(1);
}

let topic = null;
const ti = argv.indexOf("--topic");
if (ti !== -1) { topic = argv[ti + 1]; argv.splice(ti, 2); }
const rawArgs = argv;

let commentary;
let imagePath;

if (rawArgs[0] === "--file") {
  commentary = (await readFile(rawArgs[1], "utf-8")).trim();
  imagePath = rawArgs[2];
} else {
  [commentary, imagePath] = rawArgs;
}

if (!commentary) {
  console.error('Usage: npm run linkedin:post -- "Post text" [path/to/image.jpg]');
  console.error("   or: npm run linkedin:post -- --file scripts/posts/draft.txt [path/to/image.jpg]");
  process.exit(1);
}

// LinkedIn parses post text as "little text": ( ) [ ] { } < > | @ \\ # * _ ~ are markup and an
// unescaped ( or [ can cut the post off. Escape them, but leave #hashtags alone.
// (Same rule as lib/linkedinApi.ts escapeCommentary.)
const rawCommentary = commentary;
commentary = commentary.replace(/#(?=\w)|[\\|{}@\[\]()<>#*_~]/g, (ch) => (ch === "#" ? "#" : `\\${ch}`));

if (commentary.length > MAX_COMMENTARY_LENGTH) {
  console.error(`Post text is ${commentary.length} characters — LinkedIn's limit is ${MAX_COMMENTARY_LENGTH}. Trim before posting.`);
  process.exit(1);
}

function headers(extra = {}) {
  return {
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    "X-Restli-Protocol-Version": "2.0.0",
    "Linkedin-Version": LINKEDIN_VERSION,
    ...extra,
  };
}

async function uploadImage(path) {
  // Step 1: register the upload to get an uploadUrl + image URN
  const registerRes = await fetch(`${API_BASE}/images?action=initializeUpload`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      initializeUploadRequest: { owner: ORG_URN },
    }),
  });

  if (!registerRes.ok) {
    throw new Error(`Image init failed: ${registerRes.status} ${await registerRes.text()}`);
  }

  const { value } = await registerRes.json();
  const { uploadUrl, image: imageUrn } = value;

  // Step 2: PUT the raw image bytes to the returned uploadUrl
  const fileBytes = await readFile(path);
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
    body: fileBytes,
  });

  if (!uploadRes.ok) {
    throw new Error(`Image upload failed: ${uploadRes.status} ${await uploadRes.text()}`);
  }

  return imageUrn;
}

const isVideo = (path) => /\.(mp4|mov)$/i.test(path ?? "");

async function uploadVideo(path) {
  const fileBytes = await readFile(path);
  const init = await fetch(`${API_BASE}/videos?action=initializeUpload`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      initializeUploadRequest: { owner: ORG_URN, fileSizeBytes: fileBytes.length, uploadCaptions: false, uploadThumbnail: false },
    }),
  });
  if (!init.ok) throw new Error(`Video init failed: ${init.status} ${await init.text()}`);
  const { value } = await init.json();

  // Each instruction is a byte range; upload them in turn and keep every part's ETag.
  const etags = [];
  for (const part of value.uploadInstructions) {
    const chunk = fileBytes.subarray(part.firstByte, part.lastByte + 1);
    const put = await fetch(part.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/octet-stream" },
      body: chunk,
    });
    if (!put.ok) throw new Error(`Video part upload failed: ${put.status} ${await put.text()}`);
    etags.push(put.headers.get("etag"));
  }

  const fin = await fetch(`${API_BASE}/videos?action=finalizeUpload`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      finalizeUploadRequest: { video: value.video, uploadToken: value.uploadToken ?? "", uploadedPartIds: etags },
    }),
  });
  if (!fin.ok) throw new Error(`Video finalize failed: ${fin.status} ${await fin.text()}`);

  // Processing is asynchronous; wait until LinkedIn says the video is ready to attach.
  for (let i = 0; i < 30; i++) {
    const st = await fetch(`${API_BASE}/videos/${encodeURIComponent(value.video)}`, { headers: headers() });
    const status = st.ok ? (await st.json()).status : "UNKNOWN";
    if (status === "AVAILABLE") return value.video;
    if (status === "PROCESSING_FAILED") throw new Error("LinkedIn could not process the video");
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("Timed out waiting for LinkedIn to process the video");
}

async function createPost(body) {
  const res = await fetch(`${API_BASE}/posts`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });

  if (res.status !== 201) {
    throw new Error(`Post creation failed: ${res.status} ${await res.text()}`);
  }

  return res.headers.get("x-restli-id");
}

const postBody = {
  author: ORG_URN,
  commentary,
  visibility: "PUBLIC",
  distribution: {
    feedDistribution: "MAIN_FEED",
    targetEntities: [],
    thirdPartyDistributionChannels: [],
  },
  lifecycleState: "PUBLISHED",
  isReshareDisabledByAuthor: false,
};

if (process.argv.includes("--dry-run")) {
  console.log("---- DRY RUN: nothing sent to LinkedIn ----");
  console.log(`Media: ${imagePath ?? "none"}  Characters: ${commentary.length}`);
  console.log("Links:", (rawCommentary.match(/https?:\/\/\S+/g) ?? []).join("  ") || "NONE");
  console.log("\n" + rawCommentary);
  process.exit(0);
}

if (articleUrl) {
  const article = { source: articleUrl, title: articleTitle, ...(articleDesc ? { description: articleDesc } : {}) };
  if (imagePath) {
    console.log(`Uploading thumbnail: ${imagePath}`);
    article.thumbnail = await uploadImage(imagePath);
  }
  postBody.content = { article };
} else if (imagePath && isVideo(imagePath)) {
  console.log(`Uploading video: ${imagePath}`);
  postBody.content = { media: { id: await uploadVideo(imagePath) } };
} else if (imagePath) {
  console.log(`Uploading image: ${imagePath}`);
  const imageUrn = await uploadImage(imagePath);
  postBody.content = { media: { id: imageUrn } };
}

const postUrn = await createPost(postBody);
console.log(`Post created: ${postUrn}`);
console.log(`View at: https://www.linkedin.com/feed/update/${postUrn}/`);

const esc = (t) => t.replace(/#(?=\w)|[\\|{}@\[\]()<>#*_~]/g, (ch) => (ch === "#" ? "#" : `\\${ch}`));

if (reshareComment) {
  const PERSON_URN = process.env.LINKEDIN_PERSON_URN;
  if (!PERSON_URN) {
    console.error("\nSkipped personal reshare: LINKEDIN_PERSON_URN is not set in .env.local (run npm run linkedin:whoami).");
  } else {
    const reshareUrn = await createPost({
      author: PERSON_URN,
      commentary: esc(reshareComment),
      visibility: "PUBLIC",
      distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
      reshareContext: { parent: postUrn },
    });
    console.log(`Reshared from your profile: https://www.linkedin.com/feed/update/${reshareUrn}/`);
  }
}

// Groups: no API exists, so print a manual checklist from scripts/linkedin-groups.json.
// --topic tapcard|mailbroom|trading limits it to Groups that fit that topic.
let groups = [];
try {
  const all = JSON.parse(await readFile(new URL("./linkedin-groups.json", import.meta.url), "utf-8")).groups;
  groups = topic ? all.filter((g) => g.fits.includes(topic)) : all;
} catch {
  groups = (process.env.LINKEDIN_GROUPS || "").split("|").map((n) => ({ name: n.trim(), members: 0 })).filter((g) => g.name);
}

if (groups.length) {
  console.log(`\nNo Groups API exists. Share the post into each Group by hand${topic ? ` (topic: ${topic})` : ""}:`);
  console.log(`  1. Open https://www.linkedin.com/feed/update/${postUrn}/`);
  console.log("  2. Click the three dots, then Copy link to post.");
  console.log("  3. In each Group below, click Start a post, paste the link and add a line of your own (not just the link).");
  console.log("     (LinkedIn's Share menu often has no 'post in a group' option, so post from inside the Group.)");
  for (const g of groups) console.log(`  [ ] ${g.name}${g.members ? ` (${g.members.toLocaleString("en-GB")} members)` : ""}`);
  console.log("  Tip: tailor each intro to the Group; most Groups remove plain promotion.");
} else if (topic) {
  console.log(`\nNo Groups in scripts/linkedin-groups.json fit the topic "${topic}".`);
}
