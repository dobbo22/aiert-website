// Exchanges a short-lived Facebook User access token for a long-lived Page
// access token (Page tokens derived from a long-lived User token do not
// expire), and writes the result straight into .env.local. Never prints the
// token values to stdout — keeps secrets out of shell history/logs.
//
// Usage:
//   1. In Graph API Explorer, select "User Token" with the usual 7
//      permissions, hit Generate Access Token, and paste it into
//      FACEBOOK_USER_ACCESS_TOKEN in .env.local.
//   2. npm run facebook:refresh-token
import { config } from "dotenv";
import { readFile, writeFile } from "fs/promises";

config({ path: ".env.local" });

const GRAPH_VERSION = "v26.0";
const API_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
const ENV_PATH = ".env.local";

const { FACEBOOK_APP_ID, FACEBOOK_APP_SECRET, FACEBOOK_PAGE_ID, FACEBOOK_USER_ACCESS_TOKEN } = process.env;

if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET || !FACEBOOK_PAGE_ID) {
  console.error("Missing FACEBOOK_APP_ID, FACEBOOK_APP_SECRET, or FACEBOOK_PAGE_ID in .env.local");
  process.exit(1);
}

if (!FACEBOOK_USER_ACCESS_TOKEN) {
  console.error("Paste a short-lived User token into FACEBOOK_USER_ACCESS_TOKEN in .env.local first.");
  process.exit(1);
}

async function exchangeForLongLivedUserToken() {
  const url = new URL(`${API_BASE}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", FACEBOOK_APP_ID);
  url.searchParams.set("client_secret", FACEBOOK_APP_SECRET);
  url.searchParams.set("fb_exchange_token", FACEBOOK_USER_ACCESS_TOKEN);

  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`User token exchange failed: ${res.status} ${JSON.stringify(json)}`);
  }
  return json.access_token;
}

async function getLongLivedPageToken(longLivedUserToken) {
  const url = new URL(`${API_BASE}/${FACEBOOK_PAGE_ID}`);
  url.searchParams.set("fields", "access_token");
  url.searchParams.set("access_token", longLivedUserToken);

  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Fetching Page token failed: ${res.status} ${JSON.stringify(json)}`);
  }
  return json.access_token;
}

const longLivedUserToken = await exchangeForLongLivedUserToken();
const longLivedPageToken = await getLongLivedPageToken(longLivedUserToken);

let envContents = await readFile(ENV_PATH, "utf-8");
envContents = envContents.replace(/^FACEBOOK_PAGE_ACCESS_TOKEN=.*$/m, `FACEBOOK_PAGE_ACCESS_TOKEN=${longLivedPageToken}`);
envContents = envContents.replace(/^FACEBOOK_USER_ACCESS_TOKEN=.*$/m, "FACEBOOK_USER_ACCESS_TOKEN=");
await writeFile(ENV_PATH, envContents);

console.log("Long-lived Page token written to FACEBOOK_PAGE_ACCESS_TOKEN in .env.local.");
console.log("FACEBOOK_USER_ACCESS_TOKEN cleared.");
