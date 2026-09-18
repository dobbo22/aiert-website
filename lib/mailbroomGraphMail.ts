// Sends outbound email as martin@mailbroom.app via Microsoft Graph, using a
// refresh token obtained once via scripts/mailbroom-graph-auth.mjs. Reuses
// MailBroom's existing Azure app registration (MAILBROOM_GRAPH_CLIENT_ID).
const TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const GRAPH_SEND_MAIL_URL = "https://graph.microsoft.com/v1.0/me/sendMail";
const SCOPE = "offline_access Mail.Send";

async function getAccessToken(): Promise<string> {
  const clientId = process.env.MAILBROOM_GRAPH_CLIENT_ID;
  const clientSecret = process.env.MAILBROOM_GRAPH_CLIENT_SECRET;
  const refreshToken = process.env.MAILBROOM_GRAPH_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing MAILBROOM_GRAPH_CLIENT_ID, MAILBROOM_GRAPH_CLIENT_SECRET, or MAILBROOM_GRAPH_REFRESH_TOKEN");
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      scope: SCOPE,
    }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.error_description || "Failed to refresh Microsoft Graph token");
  return json.access_token as string;
}

export async function sendMailbroomEmail(params: { to: string; subject: string; bodyHtml: string }): Promise<void> {
  const accessToken = await getAccessToken();

  const res = await fetch(GRAPH_SEND_MAIL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        subject: params.subject,
        body: { contentType: "HTML", content: params.bodyHtml },
        toRecipients: [{ emailAddress: { address: params.to } }],
      },
      saveToSentItems: true,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph sendMail failed (${res.status}): ${text}`);
  }
}
