// Pure helpers for "comment on someone else's post": turn a pasted LinkedIn link into the post IDs the API accepts, read the
// public preview, and offer short starter comments. No network here.

export const SHORT_HOSTS = ["lnkd.in", "www.lnkd.in"];
export const LINKEDIN_HOSTS = ["www.linkedin.com", "linkedin.com", "uk.linkedin.com"];

// The number in a /posts/...-share-<n>-xxxx link is the SHARE id (not the activity id); the API wants urn:li:share:<n>.
// Candidates are tried in order; LinkedIn answers 404 for a wrong kind, so only the right one ever posts.
export function parsePostLink(url: string): { key: string; candidates: string[] } | null {
  let u: URL;
  try { u = new URL(url.trim()); } catch { return null; }
  if (!LINKEDIN_HOSTS.includes(u.hostname)) return null;
  const full = decodeURIComponent(u.pathname);
  const urn = /urn:li:(share|ugcPost|activity):(\d{10,})/.exec(full);
  if (urn) {
    const [, kind, n] = urn;
    return { key: n, candidates: [`urn:li:${kind}:${n}`, ...(["share", "ugcPost", "activity"].filter((k) => k !== kind).map((k) => `urn:li:${k}:${n}`))] };
  }
  const m = /-(share|ugcPost|activity)-(\d{10,})/.exec(full);
  if (!m) return null;
  const [, kind, n] = m;
  return { key: n, candidates: [`urn:li:${kind}:${n}`, ...(["share", "ugcPost", "activity"].filter((k) => k !== kind).map((k) => `urn:li:${k}:${n}`))] };
}

const unescapeHtml = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

export type Preview = { author: string; text: string };
export function parsePreview(html: string): Preview {
  const meta = (p: string) => {
    const m = new RegExp(`property="${p}" content="([^"]*)"`).exec(html);
    return m ? unescapeHtml(m[1]) : "";
  };
  const title = meta("og:title");
  const author = title.includes(" | ") ? title.slice(title.lastIndexOf(" | ") + 3).trim() : (/^(.*?) on LinkedIn/.exec(title)?.[1] ?? "").trim();
  return { author, text: meta("og:description").slice(0, 600) };
}

// Short, plain starters the person edits. Never a pitch: a page comment that sells reads as spam.
export function starters(author: string): { label: string; text: string }[] {
  const first = author.trim().split(/\s+/)[0];
  const to = first ? `, ${first}` : "";
  return [
    { label: "Good luck", text: `Good luck${to}! Wishing you every success.` },
    { label: "Congratulations", text: `Congratulations${to}! Great to see this.` },
    { label: "Thanks for sharing", text: `Thanks for sharing${to}. This is useful.` },
  ];
}

export const MAX_OUTBOUND_PER_DAY = 5;

// Refuse anything that looks like a pitch or a link: this tool is for being a good neighbour, not advertising.
export function commentProblem(text: string): string | null {
  const t = text.trim();
  if (!t) return "Write a comment first";
  if (t.length > 1250) return "A LinkedIn comment can be at most 1,250 characters";
  if (/https?:\/\/|www\.|\.co\.uk|\.com\b|tapcard\.aiert/i.test(t)) return "Leave links out of comments on other people's posts";
  return null;
}
