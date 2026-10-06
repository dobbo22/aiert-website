import crypto from "crypto";
import sql from "@/lib/db";
import { ensureSchema } from "@/lib/tapcardBiz";

// Passwordless admin sign-in for TapCard for Business — modeled on
// mailbroom-web's affiliate magic-link pattern (lib/affiliate-auth.ts
// there): a single-use, short-lived token emailed to the admin, then an
// HMAC-signed cookie for the session itself, verified on every request
// with no DB hit. A dedicated secret (not aiert-website's existing
// ADMIN_PASSWORD, which gates an unrelated internal admin surface —
// mixing those blast radii is a smell) — falls back to ADMIN_PASSWORD
// only so local dev doesn't need a new env var just to try this out.

export const COOKIE_NAME = "tapcard_biz_admin";
const LOGIN_TOKEN_TTL_MS = 15 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function secret(): string {
  const s = process.env.TAPCARD_BIZ_SESSION_SECRET ?? process.env.ADMIN_PASSWORD;
  if (!s) throw new Error("Missing TAPCARD_BIZ_SESSION_SECRET (or ADMIN_PASSWORD) environment variable");
  return s;
}

function hmac(input: string): string {
  return crypto.createHmac("sha256", secret()).update(input).digest("hex");
}

/// Stores a single-use login token (hashed) and returns the raw token to
/// email — the raw value only ever exists in that one email, never stored.
export async function createLoginToken(email: string, orgId: string | null): Promise<string> {
  await ensureSchema();
  const token = crypto.randomBytes(32).toString("base64url");
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  await sql`
    INSERT INTO tapcard_biz_login_tokens (token_hash, admin_email, org_id, expires_at)
    VALUES (${hash}, ${email.toLowerCase().trim()}, ${orgId}, now() + interval '15 minutes')
  `;
  return token;
}

/// Consumes the token (it can never be used again, even if this call
/// fails downstream) and returns the email/org it was issued for, or null
/// if invalid/expired/already used.
export async function consumeLoginToken(token: string): Promise<{ email: string; orgId: string | null } | null> {
  await ensureSchema();
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const rows = (await sql`
    UPDATE tapcard_biz_login_tokens
    SET consumed_at = now()
    WHERE token_hash = ${hash} AND expires_at > now() AND consumed_at IS NULL
    RETURNING admin_email, org_id
  `) as { admin_email: string; org_id: string | null }[];
  const row = rows[0];
  return row ? { email: row.admin_email, orgId: row.org_id } : null;
}

/// cookie value: "<orgId>.<email-base64url>.<expiresAtMs>.<hmac>" — the
/// email is base64url-encoded since it can contain characters that would
/// otherwise collide with the "." separator in an unusual edge case.
export function createSessionCookie(orgId: string, email: string): string {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const emailPart = Buffer.from(email.toLowerCase().trim()).toString("base64url");
  const payload = `${orgId}.${emailPart}.${expiresAt}`;
  return `${payload}.${hmac(payload)}`;
}

export function verifySessionCookie(value: string | undefined): { orgId: string; email: string } | null {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 4) return null;
  const [orgId, emailPart, expiresAtStr, sig] = parts;
  const payload = `${orgId}.${emailPart}.${expiresAtStr}`;
  const expected = Buffer.from(hmac(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;
  let email: string;
  try {
    email = Buffer.from(emailPart, "base64url").toString("utf8");
  } catch {
    return null;
  }
  return { orgId, email };
}

