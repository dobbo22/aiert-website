// One-time helper to complete LinkedIn's 3-legged OAuth flow and obtain an
// access token scoped to w_organization_social, for use by
// scripts/linkedin-post.mjs. Access tokens are valid for 60 days; re-run
// this script to get a fresh one once it expires (LinkedIn doesn't issue
// long-lived tokens for this scope).
//
// Prerequisites:
//   1. LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET set in .env.local
//      (from the app's Auth tab: linkedin.com/developers/apps/266289009/auth)
//   2. http://localhost:8765/callback added as an authorized Redirect URL
//      on that same Auth tab
//   3. Community Management API access approved on the app (Page management)
//
// Usage: npm run linkedin:auth
import { config } from "dotenv";
import { createServer } from "http";
import crypto from "crypto";

config({ path: ".env.local" });

const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const PORT = 8765;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const SCOPE = "w_organization_social r_organization_social";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Missing LINKEDIN_CLIENT_ID or LINKEDIN_CLIENT_SECRET in .env.local");
  process.exit(1);
}

const state = crypto.randomBytes(16).toString("hex");

const authUrl = new URL("https://www.linkedin.com/oauth/v2/authorization");
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("client_id", CLIENT_ID);
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authUrl.searchParams.set("state", state);
authUrl.searchParams.set("scope", SCOPE);

console.log("\nOpen this URL in a browser where you're logged in as a LinkedIn admin of the AIERT Ltd company page:\n");
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
    res.writeHead(400, { "Content-Type": "text/plain" }).end(`LinkedIn returned an error: ${error}`);
    console.error(`Authorization failed: ${error} — ${url.searchParams.get("error_description")}`);
    server.close();
    process.exit(1);
  }

  if (returnedState !== state) {
    res.writeHead(401, { "Content-Type": "text/plain" }).end("State mismatch — possible CSRF, aborting.");
    console.error("State mismatch — aborting.");
    server.close();
    process.exit(1);
  }

  try {
    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
      }),
    });

    const data = await tokenRes.json();

    if (!tokenRes.ok) {
      throw new Error(JSON.stringify(data));
    }

    res.writeHead(200, { "Content-Type": "text/plain" }).end("Success — you can close this tab and return to the terminal.");

    console.log("Access token obtained.\n");
    console.log(`LINKEDIN_ACCESS_TOKEN=${data.access_token}`);
    console.log(`\nExpires in ${Math.round(data.expires_in / 86400)} days. Scope granted: ${data.scope}`);
    console.log("\nPaste the LINKEDIN_ACCESS_TOKEN line above into .env.local, then run:");
    console.log("  npm run linkedin:whoami   (to find your organization URN)");
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain" }).end("Token exchange failed — see terminal.");
    console.error("Token exchange failed:", err.message);
  } finally {
    server.close();
  }
});

server.listen(PORT);
