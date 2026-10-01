// Email body for TapCard invites. No server imports: the Send tab renders
// exactly this as the preview before each email is sent, and the send route
// uses it for the real thing (sent from martin@mailbroom.app via Graph).

export const DAILY_EMAIL_LIMIT = 100;
export const INVITE_EMAIL_FROM_DISPLAY = "Martin Dobson <martin@mailbroom.app>";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Plain and personal (one person writing to someone they know, not a
// newsletter): the message as typed with its links made clickable, one
// button, a short signature and the "Don't send me these" link. No images
// or tracking pixel — both nudge spam filters, and opens aren't reliable.
export function inviteEmailHtml(params: { text: string; link: string; passOnLink: string; unsubscribeUrl: string }): string {
  const linkify = (html: string, url: string) =>
    url ? html.replaceAll(escapeHtml(url), `<a href="${url}" style="color:#0f766e;">${escapeHtml(url)}</a>`) : html;
  const button = `<p style="margin:4px 0 18px;"><a href="${params.link}" style="display:inline-block;background:#111318;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:10px;">Get TapCard free</a></p>`;
  const blocks = escapeHtml(params.text).split(/\n{2,}/);
  // The button goes straight under the paragraph with their link in it
  // (or at the end, if they've edited the link out of the text).
  const linkIndex = blocks.findIndex((p) => p.includes(escapeHtml(params.link)));
  const paragraphs = blocks
    .map((p, i) => {
      const html = `<p style="margin:0 0 14px;">${linkify(linkify(p.replace(/\n/g, "<br>"), params.link), params.passOnLink)}</p>`;
      return i === linkIndex ? html + button : html;
    })
    .join("");
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1f2937;max-width:560px;">
${paragraphs}
${linkIndex === -1 ? button : ""}
<p style="margin:24px 0 0;font-size:13px;color:#4b5563;line-height:1.5;"><strong style="color:#111827;">Martin Dobson</strong><br>Founder, AIERT Ltd · TapCard · MailBroom · PowerSearch</p>
<p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">You're getting this because you're in Martin's contacts. <a href="${params.unsubscribeUrl}" style="color:#9ca3af;">Don't send me these</a></p>
</div>`;
}
