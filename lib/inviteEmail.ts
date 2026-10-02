// Email body for TapCard invites. No server imports: the Send tab renders
// exactly this as the preview before each email is sent, and the send route
// uses it for the real thing (see lib/inviteEmailRoute.ts for the sender).


function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const MD_LINK = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
const PERSONAL_NOTE = /\[personali[sz]e here[^\]]*\]/gi;
const BULLET = /^\s*[-*•]\s+/;

const LINK_STYLE = "color:#0f766e;";

/// One line of the message: escaped, with **bold**, [label](url) links and
/// bare URLs made clickable. A leftover "[personalise here…]" is
/// highlighted so it can't be missed in the preview.
function inline(raw: string): string {
  let out = "";
  let last = 0;
  const pattern = new RegExp(`${MD_LINK.source}|(https?:\\/\\/[^\\s<]*[^\\s<.,;:!?)])`, "g");
  const text = (s: string) =>
    escapeHtml(s)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(PERSONAL_NOTE, (m) => `<mark style="background:#fde68a;">${m}</mark>`);
  for (const m of raw.matchAll(pattern)) {
    out += text(raw.slice(last, m.index));
    const url = m[2] ?? m[3];
    out += `<a href="${escapeHtml(url)}" style="${LINK_STYLE}">${escapeHtml(m[1] ?? url)}</a>`;
    last = m.index + m[0].length;
  }
  return out + text(raw.slice(last));
}

/// An example card (Alex Morgan, the made-up person from the App Store
/// screenshots), shown where the message has a {cardImage} paragraph.
export const CARD_IMAGE_URL = "https://www.aiert.co.uk/tapcard-email-card.png";
/// Normally their own card instead (lib/inviteCardImage.tsx), via cardImageUrl.
function cardImageHtml(url: string): string {
  return `<p style="margin:4px 0 18px;"><img src="${escapeHtml(url)}" width="280" alt="A TapCard: name, company, tap-to-call, email and website" style="display:block;width:280px;max-width:100%;height:auto;border:0;border-radius:18px;"></p>`;
}

// Official Apple/Google download badges — self-hosted PNGs (converted from
// Apple's own badge API, since SVG isn't reliably rendered by Outlook and
// other email clients) rather than the generic black/white pill button.
// Which badge to use is decided by *which template slot* a link came from
// (params.link = iOS, params.androidLink = Android — see buttonUrls below),
// not by sniffing the URL's domain: params.link is deliberately the tracked
// /i/<token> redirect, not a literal apps.apple.com URL, so it can log our
// own click count and (for WhatsApp, which previews the first link) show
// the recipient's own card picture rather than Apple's App Store preview.
const APP_STORE_BADGE_URL = "https://www.aiert.co.uk/tapcard-badges/app-store-badge.png";
const GOOGLE_PLAY_BADGE_URL = "https://www.aiert.co.uk/tapcard-badges/google-play-badge.png";

function button(url: string, kind: "ios" | "android"): string {
  const badge =
    kind === "ios"
      ? { src: APP_STORE_BADGE_URL, alt: "Download on the App Store", width: 144, height: 48 }
      : { src: GOOGLE_PLAY_BADGE_URL, alt: "Get it on Google Play", width: 124, height: 48 };
  return `<a href="${escapeHtml(url)}" style="display:inline-block;margin:4px 12px 18px 0;"><img src="${badge.src}" width="${badge.width}" height="${badge.height}" alt="${escapeHtml(badge.alt)}" style="display:block;border:0;"></a>`;
}

/// A paragraph: ordinary lines become a <p>, runs of "- " lines a list.
function block(raw: string): string {
  let html = "";
  let para: string[] = [];
  let items: string[] = [];
  const flush = () => {
    if (para.length) html += `<p style="margin:0 0 14px;">${para.map(inline).join("<br>")}</p>`;
    if (items.length) html += `<ul style="margin:0 0 14px;padding-left:22px;">${items.map((i) => `<li style="margin:0 0 8px;">${inline(i)}</li>`).join("")}</ul>`;
    para = [];
    items = [];
  };
  for (const line of raw.split("\n")) {
    if (BULLET.test(line)) {
      if (para.length) {
        // Keep the lead-in line ("What makes it even better:") tight to its list.
        html += `<p style="margin:0 0 6px;">${para.map(inline).join("<br>")}</p>`;
        para = [];
      }
      items.push(line.replace(BULLET, ""));
    } else {
      if (items.length) flush();
      para.push(line);
    }
  }
  flush();
  return html;
}

// Plain and personal (one person writing to someone they know, not a
// newsletter): the message as typed, with its links made clickable, its
// download and Android links as buttons, a short signature and the "Don't
// send me these" link. Just one hosted picture (the example card) and no
// tracking pixel: image-heavy mail nudges spam filters, and opens aren't
// reliable anyway.
export function inviteEmailHtml(params: {
  text: string;
  link: string;
  passOnLink: string;
  androidLink?: string;
  /// Picture of their own card; the example card if not given.
  cardImageUrl?: string;
  unsubscribeUrl: string;
}): string {
  const buttonUrls = new Map<string, "ios" | "android">([[params.link, "ios"]]);
  if (params.androidLink) buttonUrls.set(params.androidLink, "android");
  let linkShown = false;

  const body = params.text
    .trim()
    .split(/\n{2,}/)
    .map((raw) => {
      if (raw.trim() === "{cardImage}") return cardImageHtml(params.cardImageUrl ?? CARD_IMAGE_URL);
      // [label](their link) or [label](android link) → a badge under the
      // paragraph's own words ("If you have an iPhone, you can use it today:").
      const buttons: string[] = [];
      let text = raw.replace(MD_LINK, (whole, _label: string, url: string) => {
        if (!buttonUrls.has(url)) return whole;
        buttons.push(button(url, buttonUrls.get(url)!));
        if (url === params.link) linkShown = true;
        return "";
      });
      // Older templates put the bare link in the text: keep it, add the badge.
      if (raw.includes(params.link) && !linkShown) {
        buttons.push(button(params.link, "ios"));
        linkShown = true;
      }
      text = text.replace(/[ \t]+$/gm, "").trim();
      return (text ? block(text) : "") + buttons.join("");
    })
    .join("");

  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1f2937;max-width:560px;">
${body}
${linkShown ? "" : button(params.link, "ios")}
<p style="margin:24px 0 0;font-size:13px;color:#4b5563;line-height:1.5;"><strong style="color:#111827;">Martin Dobson</strong><br>Founder, AIERT Ltd · TapCard · MailBroom · PowerSearch</p>
<p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">You're getting this because you're in Martin's contacts. <a href="${escapeHtml(params.unsubscribeUrl)}" style="color:#9ca3af;">Don't send me these</a></p>
</div>`;
}

/// The plain-text part (Resend only): links written out in full.
export function inviteEmailText(text: string): string {
  return text
    .replace(/\{cardImage\}/g, CARD_IMAGE_URL)
    .replace(MD_LINK, "$1 ($2)")
    .replace(/\*\*(.+?)\*\*/g, "$1");
}
