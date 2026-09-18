// One-time helper to sign in as martin@mailbroom.app via Microsoft's OAuth
// flow and obtain a refresh token with Mail.Send, so the outreach tracker
// can send replies directly via Microsoft Graph (POST /me/sendMail).
// Reuses MailBroom's existing Azure app registration (same one mailbroom-web
// uses for customer sign-in) — Mail.Send must be added as a Delegated
// permission on that app first, with admin consent granted.
//
// Prerequisites:
//   1. MAILBROOM_GRAPH_CLIENT_ID and MAILBROOM_GRAPH_CLIENT_SECRET set in
//      .env.local (copied from mailbroom-web's Azure app credentials)
//   2. Mail.Send (Delegated) added under API permissions on that Azure app,
//      with admin consent granted
//   3. http://localhost:8767/callback added as a redirect URI under that
//      app's Authentication settings
//
// Usage: npm run mailbroom-graph:auth
import { config } from "dotenv";
import { createServer } from "http";
import crypto from "crypto";

config({ path: ".env.local" });

const CLIENT_ID = process.env.MAILBROOM_GRAPH_CLIENT_ID;
const CLIENT_SECRET = process.env.MAILBROOM_GRAPH_CLIENT_SECRET;
const PORT = 8767;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const SCOPE = "offline_access Mail.Send";
const TENANT = "common";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Missing MAILBROOM_GRAPH_CLIENT_ID or MAILBROOM_GRAPH_CLIENT_SECRET in .env.local");
  process.exit(1);
}

const state = crypto.randomBytes(16).toString("hex");

const authUrl = new URL(`https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize`);
authUrl.searchParams.set("client_id", CLIENT_ID);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authUrl.searchParams.set("response_mode", "query");
authUrl.searchParams.set("scope", SCOPE);
authUrl.searchParams.set("state", state);

console.log("\nOpen this URL and sign in as martin@mailbroom.app:\n");
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
    res.writeHead(400, { "Content-Type": "text/plain" }).end(`Microsoft returned an error: ${error}`);
    console.error(`Authorization failed: ${error} — ${url.searchParams.get("error_description")}`);
    server.close();
    process.exit(1);
  }

  if (returnedState !== state) {
    res.writeHead(401, { "Content-Type": "text/plain" }).end("State mismatch — possible CSRF, aborting.");
    console.error("State mismatch — aborting.");
    console.error(`  expected: ${state}`);
    console.error(`  received: ${returnedState}`);
    console.error(`  full callback URL: ${req.url}`);
    server.close();
    process.exit(1);
  }

  try {
    const tokenRes = await fetch(`https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI,
        code,
        scope: SCOPE,
      }),
    });

    const data = await tokenRes.json();

    if (!tokenRes.ok) {
      throw new Error(JSON.stringify(data));
    }

    res.writeHead(200, { "Content-Type": "text/plain" }).end("Success — you can close this tab and return to the terminal.");

    console.log("Refresh token obtained.\n");
    console.log(`MAILBROOM_GRAPH_REFRESH_TOKEN=${data.refresh_token}`);
    console.log("\nPaste the line above into .env.local, replacing the empty MAILBROOM_GRAPH_REFRESH_TOKEN value.");
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain" }).end("Token exchange failed — see terminal.");
    console.error("Token exchange failed:", err.message);
  } finally {
    server.close();
  }
});

server.listen(PORT);
