import { Resvg, type ResvgRenderOptions } from "@resvg/resvg-js";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import type { TapCardRecord } from "@/lib/tapcardDb";
import { effectiveStyle, type PassStyle } from "@/lib/tapcardPassStyle";

// The picture parts of TapCard's Wallet passes — the Apple store-card strip,
// the Google hero banner, and the Apple header logo. Wallet only allows the
// system font for pass text, so the name is drawn into the strip here, in
// Sora (the brand font). resvg renders the text: sharp's SVG text needs the
// font installed system-wide, which a Vercel function doesn't have.
//
// Three styles, chosen per card in the apps: "artwork" (default — the AIERT
// circuit artwork, made with Artlist), "photo" (the person's own photo,
// blurred) and "brand" (TapCard's navy→violet gradient).

const ASSETS = path.join(process.cwd(), "lib/tapcardPassAssets");
const FONT_FILES = ["Sora-Regular.ttf", "Sora-SemiBold.ttf", "Sora-Bold.ttf"].map((f) => path.join(ASSETS, "fonts", f));
const RESVG: ResvgRenderOptions = { font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: "Sora" } };
const GOLD = "#f6d27a";

let artworkCache: Promise<Buffer> | null = null;
const artwork = () => (artworkCache ??= fs.readFile(path.join(ASSETS, "artwork-circuit.jpg")));
let markCache: Promise<Buffer> | null = null;
const tapcardMark = () => (markCache ??= fs.readFile(path.join(ASSETS, "tapcard-mark.png")));

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const dataUri = (png: Buffer) => `data:image/png;base64,${png.toString("base64")}`;

function renderSvg(svg: string): Buffer {
  return new Resvg(svg, RESVG).render().asPng();
}

function textWidth(text: string, size: number, weight: number, spacing = 0): number {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(size * text.length * 1.2 + 10)}" height="${Math.ceil(size * 2)}">
    <text x="0" y="${size * 1.4}" font-family="Sora" font-weight="${weight}" font-size="${size}" letter-spacing="${spacing}">${esc(text)}</text></svg>`;
  return new Resvg(svg, RESVG).getBBox()?.width ?? 0;
}

/// Shrinks toward `minSize` to fit `maxWidth`, then shortens with "…".
function fitText(text: string, weight: number, size: number, minSize: number, maxWidth: number, spacingEm = 0) {
  let s = size;
  while (s > minSize && textWidth(text, s, weight, s * spacingEm) > maxWidth) s -= Math.max(1, size * 0.04);
  let t = text;
  while (t.length > 1 && textWidth(t, s, weight, s * spacingEm) > maxWidth) t = `${t.slice(0, -2).trimEnd()}…`;
  return { text: t, size: s, width: textWidth(t, s, weight, s * spacingEm) };
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

async function fetchPhoto(url: string | null): Promise<Buffer | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

export interface BannerOptions {
  width: number;
  height: number;
  /// Name and title drawn in (Apple strip); Google shows those as pass text already.
  withText: boolean;
  style?: PassStyle;
}

/// The wide picture across the pass: background for the style, round photo
/// (or initials), and — with `withText` — name, title · company and a gold rule.
export async function renderBanner(card: TapCardRecord, opts: BannerOptions): Promise<Buffer> {
  const { width: w, height: h } = opts;
  const style = effectiveStyle(card, opts.style);
  const photo = await fetchPhoto(card.photo_url);

  let background = "";
  if (style === "artwork") {
    const bg = await sharp(await artwork()).resize(w, h, { fit: "cover", position: "right" }).png().toBuffer();
    background = `<image href="${dataUri(bg)}" width="${w}" height="${h}"/>`;
  } else if (style === "photo" && photo) {
    const bg = await sharp(photo).resize(w, h, { fit: "cover" }).blur(Math.max(1, h * 0.05)).modulate({ brightness: 0.9, saturation: 1.1 }).png().toBuffer();
    background = `<image href="${dataUri(bg)}" width="${w}" height="${h}"/>
      <rect width="${w}" height="${h}" fill="url(#shade)"/>`;
  } else {
    background = `<rect width="${w}" height="${h}" fill="url(#brand)"/><rect width="${w}" height="${h}" fill="url(#dots)"/>`;
  }

  const pad = w * 0.043;
  const d = Math.round(h * 0.53);
  const ring = Math.max(2, d * 0.04);
  const cy = h / 2;
  const avatarRight = style === "brand";
  const cx = avatarRight ? w - pad - d / 2 : pad + d / 2;

  let avatar: string;
  if (photo) {
    const face = await sharp(photo).resize(d * 2, d * 2, { fit: "cover" }).png().toBuffer();
    avatar = `<image href="${dataUri(face)}" x="${cx - d / 2}" y="${cy - d / 2}" width="${d}" height="${d}" clip-path="url(#round)"/>`;
  } else {
    avatar = `<circle cx="${cx}" cy="${cy}" r="${d / 2}" fill="rgba(255,255,255,0.14)"/>
      <text x="${cx}" y="${cy + d * 0.13}" text-anchor="middle" font-family="Sora" font-weight="700" font-size="${d * 0.36}" fill="#fff">${esc(initials(card.name))}</text>`;
  }

  let text = "";
  if (opts.withText && card.name) {
    const gap = h * 0.097;
    const textX = avatarRight ? pad : pad + d + gap;
    const maxW = w - pad * 2 - d - gap;
    const name = fitText(card.name, 700, h * 0.139, h * 0.1, maxW);
    const roleText = [card.title, card.company].filter(Boolean).join(" · ");
    const role = roleText ? fitText(roleText, 400, h * 0.087, h * 0.07, maxW) : null;
    const ruleH = Math.max(2, h * 0.014);
    const blockH = name.size * 1.1 + (role ? h * 0.021 + role.size * 1.3 : 0) + h * 0.028 + ruleH;
    const top = cy - blockH / 2;
    const nameY = top + name.size * 0.9;
    const roleY = role ? top + name.size * 1.1 + h * 0.021 + role.size * 0.95 : nameY;
    const ruleY = (role ? roleY + role.size * 0.35 : nameY + name.size * 0.25) + h * 0.028;
    text = `<text x="${textX}" y="${nameY}" font-family="Sora" font-weight="700" font-size="${name.size}" fill="#fff">${esc(name.text)}</text>
      ${role ? `<text x="${textX}" y="${roleY}" font-family="Sora" font-weight="400" font-size="${role.size}" fill="rgba(255,255,255,0.92)">${esc(role.text)}</text>` : ""}
      <rect x="${textX}" y="${ruleY}" width="${h * 0.236}" height="${ruleH}" rx="${ruleH / 2}" fill="${GOLD}"/>`;
  }

  const dot = h * 0.083;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs>
      <linearGradient id="brand" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1a2138"/><stop offset="0.48" stop-color="#2a2350"/><stop offset="1" stop-color="#422975"/></linearGradient>
      <pattern id="dots" width="${dot}" height="${dot}" patternUnits="userSpaceOnUse"><circle cx="${dot / 2}" cy="${dot / 2}" r="${Math.max(1, dot * 0.09)}" fill="rgba(255,255,255,0.14)"/></pattern>
      <linearGradient id="shade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="rgb(10,12,20)" stop-opacity="0.45"/><stop offset="1" stop-color="rgb(10,12,20)" stop-opacity="0.75"/></linearGradient>
      <clipPath id="round"><circle cx="${cx}" cy="${cy}" r="${d / 2}"/></clipPath>
      <filter id="lift" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${d * 0.08}"/></filter>
    </defs>
    ${background}
    <circle cx="${cx}" cy="${cy + d * 0.05}" r="${d / 2}" fill="rgba(0,0,0,0.35)" filter="url(#lift)"/>
    ${avatar}
    <circle cx="${cx}" cy="${cy}" r="${d / 2 - ring / 2}" fill="none" stroke="#fff" stroke-width="${ring}"/>
    ${text}
  </svg>`;
  return sharp(renderSvg(svg)).png({ compressionLevel: 9 }).toBuffer();
}

/// Google Wallet's round logo (list view and card corner), 660px square:
/// the company icon on white when it's big enough to stay sharp, else the
/// company's initials in gold Sora on navy — tiny favicons blown up to this
/// size just blur.
export async function renderRoundLogo(card: TapCardRecord, companyIcon: Buffer | null): Promise<Buffer> {
  const S = 660;
  const iconWidth = companyIcon ? (await sharp(companyIcon).metadata()).width ?? 0 : 0;
  if (companyIcon && iconWidth >= 128) {
    const inner = Math.round(S * 0.62);
    const icon = await sharp(companyIcon).resize(inner, inner, { fit: "contain", background: "#fff" }).flatten({ background: "#fff" }).png().toBuffer();
    return sharp({ create: { width: S, height: S, channels: 3, background: "#fff" } })
      .composite([{ input: icon, gravity: "centre" }]).png().toBuffer();
  }
  const letters = initials(card.company || card.name || "TapCard");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1a2138"/><stop offset="1" stop-color="#422975"/></linearGradient></defs>
    <rect width="${S}" height="${S}" fill="url(#g)"/>
    <text x="${S / 2}" y="${S / 2 + S * 0.13}" text-anchor="middle" font-family="Sora" font-weight="700" font-size="${S * 0.36}" fill="${GOLD}">${esc(letters)}</text>
  </svg>`;
  return renderSvg(svg);
}

/// Apple header logo, `height` px tall: TapCard mark | company icon tile +
/// company name in gold Sora. Width varies with the name, capped at 3.2×
/// height (Wallet's 160×50 pt logo slot).
export async function renderLogoLockup(card: TapCardRecord, companyIcon: Buffer | null, height: number): Promise<Buffer> {
  const H = height;
  const maxW = Math.floor(H * 3.2);
  const mark = H * 0.7;
  const tile = H * 0.76;
  const gapA = H * 0.1;
  const markPng = await sharp(await tapcardMark()).resize(Math.round(mark * 2)).png().toBuffer();

  const parts: string[] = [];
  let x = 0;
  parts.push(`<clipPath id="mk"><rect x="${x}" y="${(H - mark) / 2}" width="${mark}" height="${mark}" rx="${mark * 0.24}"/></clipPath>
    <image href="${dataUri(markPng)}" x="${x}" y="${(H - mark) / 2}" width="${mark}" height="${mark}" clip-path="url(#mk)"/>`);
  x += mark + gapA;
  parts.push(`<rect x="${x}" y="${H * 0.25}" width="${Math.max(2, H * 0.02)}" height="${H * 0.5}" fill="rgba(255,255,255,0.28)"/>`);
  x += Math.max(2, H * 0.02) + gapA;

  // Tiny favicons (often 32px) blur at this size — leave them out and give
  // the name the room instead.
  const iconWidth = companyIcon ? (await sharp(companyIcon).metadata()).width ?? 0 : 0;
  if (companyIcon && iconWidth >= 96) {
    const inner = Math.round(tile * 0.76);
    const iconPng = await sharp(companyIcon).resize(inner * 2, inner * 2, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toBuffer();
    parts.push(`<rect x="${x}" y="${(H - tile) / 2}" width="${tile}" height="${tile}" rx="${tile * 0.26}" fill="#fff"/>
      <image href="${dataUri(iconPng)}" x="${x + (tile - inner) / 2}" y="${(H - inner) / 2}" width="${inner}" height="${inner}"/>`);
    x += tile + gapA;
  }

  // Legal suffixes go first — the header has room for about a dozen letters.
  const wordText = (card.company || card.name || "TapCard").replace(/[\s,]+(ltd\.?|limited|llc|inc\.?|plc|gmbh|l\.?l\.?p\.?)$/i, "");
  const word = fitText(wordText, 700, H * 0.46, H * 0.22, maxW - x, 0.04);
  parts.push(`<text x="${x}" y="${H / 2 + word.size * 0.36}" font-family="Sora" font-weight="700" font-size="${word.size}" letter-spacing="${word.size * 0.04}" fill="${GOLD}">${esc(word.text)}</text>`);
  x += word.width;

  const width = Math.min(maxW, Math.ceil(x + 2));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${H}">${parts.join("\n")}</svg>`;
  return renderSvg(svg);
}
