// One-time helper to sign in with the Reddit account MailBroom posts as and
// obtain a permanent refresh token, so the admin/social/reddit tab can list
// subscribed subreddits and submit posts via Reddit's OAuth API.
//
// Prerequisites:
//   1. Create an app at https://www.reddit.com/prefs/apps — click
//      "create app", choose type "web app", and set the redirect URI to
//      http://localhost:8768/callback
//   2. Copy the client ID (under the app name) and client secret into
//      .env.local as REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET
//   3. Set REDDIT_USER_AGENT in .env.local, e.g.
//      "mailbroom-social-ops/1.0 (by /u/<your-reddit-username>)" — Reddit
//      rate-limits/blocks requests with a generic or missing User-Agent
//
// Usage: npm run reddit:auth
import { config } from "dotenv";
import { createServer } from "http";
import crypto from "crypto";

config({ path: ".env.local" });

const CLIENT_ID = process.env.REDDIT_CLIENT_ID;
const CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET;
const USER_AGENT = process.env.REDDIT_USER_AGENT;
const PORT = 8768;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
// identity: whoami · mysubreddits: list subscribed subs · submit: post ·
// history/read: show recent posts back in the admin UI
const SCOPE = "identity mysubreddits submit history read";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Missing REDDIT_CLIENT_ID or REDDIT_CLIENT_SECRET in .env.local");
  process.exit(1);
}
if (!USER_AGENT) {
  console.error("Missing REDDIT_USER_AGENT in .env.local — set it before running this script.");
  process.exit(1);
}

const state = crypto.randomBytes(16).toString("hex");

const authUrl = new URL("https://www.reddit.com/api/v1/authorize");
authUrl.searchParams.set("client_id", CLIENT_ID);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("state", state);
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authUrl.searchParams.set("duration", "permanent");
authUrl.searchParams.set("scope", SCOPE);

console.log("\nOpen this URL and log in as the Reddit account MailBroom should post as:\n");
console.log(authUrl.toString());
console.log(`\nWaiting for callback on ${REDIRECT_URI} ...\n`);

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname !== "/callback") {
    res.writeHead(404).end();
    return;
  }

  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    res.writeHead(400, { "Content-Type": "text/plain" }).end(`Reddit returned an error: ${error}`);
    console.error(`Authorization failed: ${error}`);
    server.close();
    process.exit(1);
  }

  if (returnedState !== state) {
    res.writeHead(401, { "Content-Type": "text/plain" }).end("State mismatch — possible CSRF, aborting.");
    console.error("State mismatch — aborting.");
    console.error(`  expected: ${state}`);
    console.error(`  received: ${returnedState}`);
    server.close();
    process.exit(1);
  }

  try {
    const tokenRes = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`,
        "User-Agent": USER_AGENT,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    const data = await tokenRes.json();

    if (!tokenRes.ok) {
      throw new Error(JSON.stringify(data));
    }

    res.writeHead(200, { "Content-Type": "text/plain" }).end("Success — you can close this tab and return to the terminal.");

    console.log("Refresh token obtained.\n");
    console.log(`REDDIT_REFRESH_TOKEN=${data.refresh_token}`);
    console.log("\nPaste the line above into .env.local, replacing the empty REDDIT_REFRESH_TOKEN value.");
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain" }).end("Token exchange failed — see terminal.");
    console.error("Token exchange failed:", err.message);
  } finally {
    server.close();
  }
});

server.listen(PORT);
