import crypto from "crypto";

// TapCard for Business invite links, without AIERT storing a staff list:
// the admin's own file (CSV/vCard) stays on their computer, the browser
// asks app/api/tapcard/biz/invites to sign one link per person, and the
// person's details travel inside the link itself. Nothing is stored at
// signing time; claiming records only the invite's random id as spent
// (lib/tapcardBiz spendInvite) so a link works once.
//
// The token goes after "#" in the link (…/business/claim#<token>): a URL
// fragment is never sent to a server by a browser, so names and emails
// don't end up in request logs — only the app sends the token, once, in
// the claim request body.

const INVITE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface InvitePayload {
  /// Format version.
  v: 1;
  /// Org id, and its name (only for the landing page's "From …" line).
  o: string;
  c: string;
  /// The person: name, email, job title.
  n: string;
  e: string;
  t: string;
  /// Expiry (ms since epoch) and random single-use id.
  x: number;
  j: string;
}

function secret(): string {
  const s = process.env.TAPCARD_BIZ_SESSION_SECRET ?? process.env.ADMIN_PASSWORD;
  if (!s) throw new Error("Missing TAPCARD_BIZ_SESSION_SECRET (or ADMIN_PASSWORD) environment variable");
  return s;
}

/// Domain-separated from the admin session cookie, which uses the same secret.
function signature(body: string): Buffer {
  return crypto.createHmac("sha256", secret()).update(`tapcard-biz-invite:${body}`).digest();
}

export function signInvite(
  org: { id: string; name: string },
  person: { name: string; email: string; title: string },
  now = Date.now()
): string {
  const payload: InvitePayload = {
    v: 1,
    o: org.id,
    c: org.name,
    n: person.name,
    e: person.email,
    t: person.title,
    x: now + INVITE_TTL_MS,
    j: crypto.randomBytes(16).toString("base64url"),
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${signature(body).toString("base64url")}`;
}

/// The payload if the token is genuine and unexpired, else null. Says
/// nothing about whether it's been spent — that's spendInvite's job.
export function verifyInvite(token: string, now = Date.now()): InvitePayload | null {
  if (typeof token !== "string" || token.length > 4000) return null;
  const [body, sig, extra] = token.split(".");
  if (!body || !sig || extra !== undefined) return null;
  const given = Buffer.from(sig, "base64url");
  const expected = signature(body);
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  let payload: InvitePayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (payload?.v !== 1 || typeof payload.o !== "string" || typeof payload.j !== "string") return null;
  if (typeof payload.x !== "number" || payload.x < now) return null;
  return payload;
}

export function inviteLink(token: string): string {
  return `https://tapcard.aiert.co.uk/business/claim#${token}`;
}
