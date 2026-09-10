// Posts a text (and optionally single-image) update to the AIERT Ltd
// LinkedIn Company Page via the Posts API. Requires a LinkedIn Developer
// App with Community Management API access (w_organization_social scope)
// and a member access token generated via the 3-legged OAuth flow.
//
// Usage:
//   npm run linkedin:post -- "Post text here"
//   npm run linkedin:post -- "Post text here" ./path/to/image.jpg
//
// Required env vars (see .env.local):
//   LINKEDIN_ACCESS_TOKEN   OAuth2 access token with w_organization_social
//   LINKEDIN_ORG_URN        e.g. urn:li:organization:12345678
import { config } from "dotenv";
import { readFile } from "fs/promises";

config({ path: ".env.local" });

const LINKEDIN_VERSION = "202604"; // YYYYMM — bump periodically per LinkedIn's versioning schedule
const API_BASE = "https://api.linkedin.com/rest";

const ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;
const ORG_URN = process.env.LINKEDIN_ORG_URN;

if (!ACCESS_TOKEN || !ORG_URN) {
  console.error("Missing LINKEDIN_ACCESS_TOKEN or LINKEDIN_ORG_URN in .env.local");
  process.exit(1);
}

const [commentary, imagePath] = process.argv.slice(2);

if (!commentary) {
  console.error('Usage: npm run linkedin:post -- "Post text" [path/to/image.jpg]');
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

if (imagePath) {
  console.log(`Uploading image: ${imagePath}`);
  const imageUrn = await uploadImage(imagePath);
  postBody.content = { media: { id: imageUrn } };
}

const postUrn = await createPost(postBody);
console.log(`Post created: ${postUrn}`);
console.log(`View at: https://www.linkedin.com/feed/update/${postUrn}/`);
