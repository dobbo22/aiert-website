import crypto from "crypto";

const COOKIE_NAME = "mailbroom_admin";
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

function secret(): string {
  const s = process.env.ADMIN_PASSWORD;
  if (!s) throw new Error("Missing ADMIN_PASSWORD environment variable");
  return s;
}
const sign = (payload: string) => crypto.createHmac("sha256", secret()).update(`mailbroom-admin:${payload}`).digest("hex");

/// The login cookie: an expiry time and a signature of it, so a copied cookie stops working after 30 days (it used to be the same
/// fixed value for ever). Changing ADMIN_PASSWORD signs everyone out.
export function adminSessionToken(now = Date.now()): string {
  const exp = String(now + SESSION_MS);
  return `${exp}.${sign(exp)}`;
}

export function isValidAdminSession(cookieValue: string | undefined, now = Date.now()): boolean {
  if (!cookieValue) return false;
  const [exp, sig, extra] = cookieValue.split(".");
  if (!exp || !sig || extra !== undefined || !/^\d{10,16}$/.test(exp) || Number(exp) < now) return false;
  const expected = Buffer.from(sign(exp));
  const actual = Buffer.from(sig);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

/// Checks a typed password without leaking, through timing, how much of it was right.
export function passwordMatches(given: unknown): boolean {
  const want = process.env.ADMIN_PASSWORD;
  if (typeof given !== "string" || !want) return false;
  const a = crypto.createHash("sha256").update(given).digest();
  const b = crypto.createHash("sha256").update(want).digest();
  return crypto.timingSafeEqual(a, b);
}

export { COOKIE_NAME };
