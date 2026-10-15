import { NextRequest, NextResponse } from "next/server";
import { readLimited, safeFetch } from "@/lib/siteIcon";

// A script-free snapshot of one of the visitor's OWN website's pages, so the demo phone can show it inside its screen even
// though the site itself refuses to be framed. Only the same host as the site the visitor typed (never an open proxy);
// scripts, frames and handlers are stripped, and the CSP `sandbox` (no scripts, no same-origin) makes it inert regardless.
const MAX_HTML = 1.5 * 1024 * 1024;
const host = (u: string) => { try { return new URL(/^https?:\/\//i.test(u) ? u : `https://${u}`).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; } };

function deny(status = 404) {
  return new NextResponse("This page can't be shown here.", { status, headers: { "content-type": "text/plain", "X-Frame-Options": "SAMEORIGIN" } });
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url") ?? "";
  const site = req.nextUrl.searchParams.get("site") ?? "";
  let u: URL;
  try { u = new URL(raw); } catch { return deny(400); }
  if (u.protocol !== "https:" || raw.length > 400 || !host(site) || host(raw) !== host(site)) return deny(403);
  const page = await safeFetch(u.toString()).catch(() => null);
  if (!page || !(page.res.headers.get("content-type") ?? "").includes("text/html")) return deny();
  const buf = await readLimited(page.res, MAX_HTML);
  if (!buf) return deny();
  let html = buf.toString("utf8");
  html = html
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<(noscript|iframe|object|embed|template)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<meta[^>]+http-equiv\s*=\s*["']?(refresh|content-security-policy)[^>]*>/gi, "")
    .replace(/<base\b[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src|action)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"');
  const base = `<base href="${page.url.toString().replace(/"/g, "&quot;")}" target="_blank">`;
  html = /<head\b[^>]*>/i.test(html) ? html.replace(/<head\b[^>]*>/i, (m) => `${m}${base}`) : `${base}${html}`;
  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-security-policy": "default-src 'none'; img-src * data: blob:; style-src * 'unsafe-inline'; font-src * data:; media-src *; sandbox allow-popups allow-popups-to-escape-sandbox",
      "X-Frame-Options": "SAMEORIGIN",
      "referrer-policy": "no-referrer",
      "cache-control": "public, s-maxage=600",
    },
  });
}
