// Signed opt-out links for the app-user emails. Pure (no database), so it can be tested on its own.
import crypto from "crypto";
// Same host as INVITE_LINK_ORIGIN; repeated here because importing that module pulls in the database.
const INVITE_LINK_ORIGIN = "https://tapcard.aiert.co.uk";

function secret(): string {
  const s = process.env.TAPCARD_BIZ_SESSION_SECRET ?? process.env.ADMIN_PASSWORD;
  if (!s) throw new Error("Missing TAPCARD_BIZ_SESSION_SECRET (or ADMIN_PASSWORD) environment variable");
  return s;
}

const sig = (body: string) => crypto.createHmac("sha256", secret()).update(`app-user-unsub:${body}`).digest("base64url").slice(0, 22);

export function unsubToken(email: string): string {
  const body = Buffer.from(email.trim().toLowerCase()).toString("base64url");
  return `${body}.${sig(body)}`;
}

/// The address a token was made for, or null when it is malformed or the signature is wrong.
export function emailFromUnsubToken(token: string): string | null {
  const [body, given, ...rest] = token.split(".");
  if (!body || !given || rest.length) return null;
  const want = Buffer.from(sig(body));
  const got = Buffer.from(given);
  if (want.length !== got.length || !crypto.timingSafeEqual(want, got)) return null;
  const email = Buffer.from(body, "base64url").toString();
  return /^[^\s@]+@[^\s@]+$/.test(email) ? email : null;
}

export const unsubPageUrl = (email: string) => `${INVITE_LINK_ORIGIN}/au/${unsubToken(email)}`;
export const unsubPostUrl = (email: string) => `${INVITE_LINK_ORIGIN}/api/au-unsub/${unsubToken(email)}`;

