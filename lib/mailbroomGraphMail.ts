// Sends outbound email as martin@mailbroom.app via Microsoft Graph, using a
// refresh token obtained once via scripts/mailbroom-graph-auth.mjs. Reuses
// MailBroom's existing Azure app registration (MAILBROOM_GRAPH_CLIENT_ID).
const TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const GRAPH_SEND_MAIL_URL = "https://graph.microsoft.com/v1.0/me/sendMail";
// Mail.ReadWrite is already consented at the app level (from mailbroom-web's
// own usage of this Azure app), so requesting it here needs no extra Azure
// Portal changes — only Mail.Send required that one-time addition.
const SCOPE = "offline_access Mail.Send Mail.ReadWrite";

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

export type MailboxMessage = {
  id: string;
  subject: string;
  bodyPreview: string;
  receivedDateTime: string;
  webLink: string;
  from?: { emailAddress?: { name?: string; address?: string } };
};

// Reuses the already-granted Mail.ReadWrite scope (from the app's existing
// mailbroom-web consent) — no extra Azure permission needed beyond Mail.Send.
export async function listRepliesFrom(email: string): Promise<MailboxMessage[]> {
  const accessToken = await getAccessToken();
  const url = new URL("https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages");
  url.searchParams.set("$filter", `from/emailAddress/address eq '${email.replace(/'/g, "''")}'`);
  url.searchParams.set("$select", "subject,bodyPreview,receivedDateTime,webLink,from");
  url.searchParams.set("$top", "10");
  // No $orderby — Graph rejects combining it with a nested-property $filter
  // ("restriction or sort order is too complex") without extra ConsistencyLevel
  // headers, so sort client-side instead.

  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `Graph inbox lookup failed (${res.status})`);
  const messages = (json.value ?? []) as MailboxMessage[];
  return messages.sort((a, b) => b.receivedDateTime.localeCompare(a.receivedDateTime));
}

// Kept as a plain function (not a template literal with backticks inside
// the calling file) so it renders consistently across email clients —
// table-based layout, inline styles, no external CSS.
export function mailbroomSignatureHtml(): string {
  return `
<table cellpadding="0" cellspacing="0" style="margin-top:28px;border-top:1px solid #e2e8f0;padding-top:16px;font-family:Arial,Helvetica,sans-serif;">
  <tr>
    <td style="vertical-align:top;padding-right:14px;">
      <img src="https://mailbroom.app/mailbroom-icon.png" width="42" height="42" style="border-radius:9px;display:block;" alt="MailBroom" />
    </td>
    <td style="vertical-align:top;font-size:13px;color:#333333;line-height:1.5;">
      <div style="font-weight:bold;font-size:14px;color:#111111;">Martin Dobson</div>
      <div style="color:#666666;">Founder, MailBroom</div>
      <div style="margin-top:8px;">
        <a href="https://apps.apple.com/gb/app/mailbroom/id6766489663" style="color:#b45309;text-decoration:none;font-weight:600;">iOS App</a>
        <span style="color:#cccccc;">&nbsp;·&nbsp;</span>
        <a href="https://business.mailbroom.app" style="color:#b45309;text-decoration:none;font-weight:600;">Microsoft 365</a>
        <span style="color:#cccccc;">&nbsp;·&nbsp;</span>
        <a href="https://mailbroom.app" style="color:#b45309;text-decoration:none;font-weight:600;">mailbroom.app</a>
      </div>
    </td>
  </tr>
</table>`.trim();
}

export async function sendMailbroomEmail(params: { to: string; subject: string; bodyHtml: string }): Promise<void> {
  const accessToken = await getAccessToken();

  const fullBody = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1a1a1a;line-height:1.6;">${params.bodyHtml}${mailbroomSignatureHtml()}</div>`;

  const res = await fetch(GRAPH_SEND_MAIL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        subject: params.subject,
        body: { contentType: "HTML", content: fullBody },
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
