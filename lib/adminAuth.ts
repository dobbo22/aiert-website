import crypto from "crypto";

const COOKIE_NAME = "anniversary_admin";

export function adminSessionToken(): string {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) throw new Error("Missing ADMIN_PASSWORD environment variable");
  return crypto.createHmac("sha256", secret).update("anniversary-admin").digest("hex");
}

export function isValidAdminSession(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;
  const expected = Buffer.from(adminSessionToken());
  const actual = Buffer.from(cookieValue);
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

export { COOKIE_NAME };
