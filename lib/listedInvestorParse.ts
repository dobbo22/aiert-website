// Pure parts of the investor-pages check (no network, no database), so they can be tested on their own.
// Finds the links on a company's pages that lead to its investor relations area, regulatory announcements, reports and share price,
// and says whether a page shows the company's share price or market cap itself.

export type IrRole = "ir" | "rns" | "reports" | "price";
export interface Anchor { href: string; text: string }
export interface IrLink { role: IrRole; url: string; text: string }
export interface Seen { state: "yes" | "widget" | "no"; snippet: string }

const SOCIAL = /(^|\.)(facebook|twitter|x|linkedin|instagram|youtube|tiktok|wa\.me|whatsapp)\.[a-z.]+$/i;

export function extractAnchors(html: string, base: string): Anchor[] {
  const out: Anchor[] = [];
  const seen = new Set<string>();
  for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(m[1]);
    const raw = href?.[1] ?? href?.[2];
    if (!raw || /^(#|mailto:|tel:|javascript:)/i.test(raw)) continue;
    let url: URL;
    try { url = new URL(raw.replace(/&amp;/g, "&"), base); } catch { continue; }
    if (!/^https?:$/.test(url.protocol) || SOCIAL.test(url.hostname)) continue;
    url.hash = "";
    const text = m[2].replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim().slice(0, 80);
    const key = url.toString() + "|" + text;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ href: url.toString(), text });
  }
  return out;
}

/// What a link is for, from what it says and where it goes. "" when it is none of these.
export function classifyLink(text: string, href: string): IrRole | "" {
  let path = "";
  try { path = new URL(href).pathname.toLowerCase(); } catch { return ""; }
  const t = text.toLowerCase().replace(/[→»>]+/g, "").replace(/\s+/g, " ").trim();
  if (/\.(pdf|docx?|xlsx?|zip|jpe?g|png)$/.test(path)) return "";
  if (/^(rns|rns announcements?|regulatory (news|announcements?)|regulatory|stock exchange announcements?|company announcements?|announcements|rns (&|and) news)$/.test(t) || /\/(rns|regulatory-news|regulatory-announcements?|stock-exchange-announcements?)\/?$/.test(path)) return "rns";
  if (/^(share price|stock quote|share price (&|and) charts?|share information|share data|stock information)$/.test(t) || /\/(share-price|stock-quote|share-information)\/?$/.test(path)) return "price";
  if (/^(reports?|reports (&|and) (results|presentations)|results (&|and) reports|financial (reports?|results)|annual reports?|results|reports and presentations)$/.test(t) || /\/(financial-reports?|reports-and-results|results-and-reports|annual-reports?)\/?$/.test(path)) return "reports";
  if (/^(investors?|investor relations|investor centre|investor information|for investors|shareholders?|shareholder information|investors? (&|and) shareholders|investors? (&|and) media|ir)$/.test(t) || /^\/(investors?|investor-relations|investor-centre|shareholders?|ir)\/?$/.test(path)) return "ir";
  return "";
}

/// The best link for each role, in the page's order, one per role.
export function pickLinks(anchors: Anchor[]): IrLink[] {
  const best = new Map<IrRole, IrLink>();
  for (const a of anchors) {
    const role = classifyLink(a.text, a.href);
    if (!role || best.has(role)) continue;
    best.set(role, { role, url: a.href, text: a.text });
  }
  return [...best.values()];
}

/// Where a listed company's investor area usually is, tried when the home page does not link to it.
export const COMMON_IR_PATHS = ["/investors", "/investor-relations", "/investor-centre", "/investors/", "/investor", "/shareholders", "/ir"];

const WIDGET_HOSTS = /(tickerscope|euroland|investis|irwebhub|lse\.co\.uk|tradingview|marketscreener|morningstar|londonstockexchange|investegate|advfn|quotemedia|shareprice|tickertape|irservices|sharesdata|ixbrl|equiniti|investor-?centre)/i;

/// Does this page show the company's share price or market cap itself (in its text, or in an embedded widget)? Static HTML only: a figure
/// that a script loads after the page opens is not seen, and the result says so by being "no".
export function detectFigures(html: string): { price: Seen; cap: Seen } {
  const text = html.replace(/<(script|style|noscript|svg)\b[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ");
  const price = /((?:latest |current |last )?(?:share|stock) price|last price|latest price|price per share)[^0-9£$€]{0,80}(?:[£$€]\s?)?\d[\d,]*(?:\.\d+)?\s?(?:p\b|pence|gbp|gbx|usd|eur)?/i.exec(text);
  const cap = /(market (?:capitali[sz]ation|cap)\b)[^0-9£$€]{0,60}[£$€]\s?\d[\d,.]*\s?(?:m\b|bn\b|million|billion|k\b)?/i.exec(text);
  const widgets = [...html.matchAll(/<(?:iframe|script)\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]).filter((s) => WIDGET_HOSTS.test(s));
  const snip = (m: RegExpExecArray | null) => (m ? m[0].slice(0, 110).trim() : "");
  const widgetHost = (() => { try { return widgets.length ? new URL(widgets[0], "https://x.invalid").hostname || widgets[0] : ""; } catch { return widgets[0] ?? ""; } })();
  return {
    price: price ? { state: "yes", snippet: snip(price) } : widgets.length ? { state: "widget", snippet: `embedded from ${widgetHost}` } : { state: "no", snippet: "" },
    cap: cap ? { state: "yes", snippet: snip(cap) } : { state: "no", snippet: "" },
  };
}

/// Fold several pages' answers into one: "yes" beats "widget" beats "no".
export function bestSeen(list: Seen[]): Seen {
  return list.find((s) => s.state === "yes") ?? list.find((s) => s.state === "widget") ?? { state: "no", snippet: "" };
}
