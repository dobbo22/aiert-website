import { lookup } from "node:dns/promises";
import net from "node:net";

// A company's icon, found the way link previews (Messages, Slack) find it:
// the page's own <link rel="apple-touch-icon"> / <link rel="icon">, then
// /apple-touch-icon.png and /favicon.ico. Google's favicon service is only
// the last resort — it caches icons for weeks, so a site that changes its
// logo keeps showing the old one there (aiert.co.uk still showed Vercel's
// default triangle long after getting its own logo).
//
// The domain comes from whatever someone typed as their website, so every
// fetch is locked down: public hostnames only (re-checked on each redirect),
// HTTPS, short timeouts and size caps, and the result must sniff as a real
// raster image. SVG is never returned: served from our origin it could
// carry script.

const TIMEOUT_MS = 4000;
const MAX_HTML_BYTES = 256 * 1024;
const MAX_IMAGE_BYTES = 512 * 1024;
const MAX_REDIRECTS = 3;
const MAX_CANDIDATES = 6;

export type SiteIcon = { bytes: Buffer; contentType: string };

/// Lowercased hostname, or null unless it's a plain public-looking domain.
export function normalizeDomain(input: string): string | null {
  const domain = input.trim().toLowerCase().replace(/\.$/, "");
  if (domain.length > 253 || net.isIP(domain)) return null;
  const label = "(?!-)[a-z0-9-]{1,63}(?<!-)";
  if (!new RegExp(`^${label}(\\.${label})+$`).test(domain)) return null;
  if (/^\d+$/.test(domain.split(".").pop()!)) return null;
  return domain;
}

export async function findSiteIcon(domain: string, { allowIco = true } = {}): Promise<SiteIcon | null> {
  const page = await safeFetch(`https://${domain}/`);
  const candidates: string[] = [];
  let origin = `https://${domain}`;
  if (page && (page.res.headers.get("content-type") ?? "").includes("text/html")) {
    origin = page.url.origin;
    const html = await readLimited(page.res, MAX_HTML_BYTES);
    if (html) candidates.push(...iconLinks(html.toString("utf8"), page.url));
  }
  candidates.push(`${origin}/apple-touch-icon.png`, `${origin}/favicon.ico`);

  for (const url of [...new Set(candidates)].slice(0, MAX_CANDIDATES)) {
    const icon = await fetchIcon(url);
    if (icon && (allowIco || icon.contentType !== "image/x-icon")) return icon;
  }
  return fetchIcon(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`);
}

/// <link> icons in the page, best first: apple-touch-icon (large, made for
/// exactly this), then other icons by declared size. SVG is skipped.
function iconLinks(html: string, base: URL): string[] {
  const found: { url: string; score: number }[] = [];
  for (const [tag] of html.matchAll(/<link\b[^>]*>/gi)) {
    const attr = (name: string) => new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i").exec(tag)?.[1] ?? "";
    const rel = attr("rel").toLowerCase();
    const href = attr("href");
    if (!href || !/\b(apple-touch-icon(-precomposed)?|icon)\b/.test(rel)) continue;
    if (/svg/i.test(attr("type")) || /\.svg(\?|$)/i.test(href)) continue;
    let url: URL;
    try {
      url = new URL(href.replace(/&amp;/g, "&"), base);
    } catch {
      continue;
    }
    const size = Math.max(0, ...[...attr("sizes").matchAll(/(\d+)x\d+/g)].map((m) => Number(m[1])));
    found.push({ url: url.toString(), score: (rel.includes("apple-touch-icon") ? 10_000 : 0) + size });
  }
  return found.sort((a, b) => b.score - a.score).map((f) => f.url);
}

async function fetchIcon(url: string): Promise<SiteIcon | null> {
  const got = await safeFetch(url);
  if (!got) return null;
  const bytes = await readLimited(got.res, MAX_IMAGE_BYTES);
  const contentType = bytes && sniffImage(bytes);
  return bytes && contentType ? { bytes, contentType } : null;
}

/// Follows redirects by hand so every hop is re-checked as HTTPS to a public address.
async function safeFetch(start: string): Promise<{ res: Response; url: URL } | null> {
  let url: URL;
  try {
    url = new URL(start);
  } catch {
    return null;
  }
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (url.protocol !== "https:" || !(await isPublicHost(url.hostname))) return null;
    let res: Response;
    try {
      res = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { "user-agent": "TapCardIconFetcher/1.0 (+https://tapcard.aiert.co.uk)" },
      });
    } catch {
      return null;
    }
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return null;
      try {
        url = new URL(location, url);
      } catch {
        return null;
      }
      continue;
    }
    return res.ok ? { res, url } : null;
  }
  return null;
}

async function isPublicHost(hostname: string): Promise<boolean> {
  if (net.isIP(hostname) || !normalizeDomain(hostname)) return false;
  try {
    const addresses = await lookup(hostname, { all: true });
    return addresses.length > 0 && addresses.every((a) => isPublicAddress(a.address));
  } catch {
    return false;
  }
}

function isPublicAddress(ip: string): boolean {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip)?.[1];
  if (mapped) return isPublicAddress(mapped);
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return !(
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  const v6 = ip.toLowerCase();
  return !(v6 === "::" || v6 === "::1" || /^f[cd]/.test(v6) || /^fe[89ab]/.test(v6) || v6.startsWith("ff"));
}

async function readLimited(res: Response, max: number): Promise<Buffer | null> {
  if (!res.body) return null;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > max) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  }
  return Buffer.concat(chunks);
}

/// The type from the file's own bytes — never trusted from the server's header.
function sniffImage(b: Buffer): string | null {
  if (b.length < 12) return null;
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.toString("ascii", 0, 3) === "GIF") return "image/gif";
  if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (b[0] === 0 && b[1] === 0 && b[2] === 1 && b[3] === 0) return "image/x-icon";
  return null;
}
