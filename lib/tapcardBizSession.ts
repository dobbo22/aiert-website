import { cookies } from "next/headers";
import { COOKIE_NAME, verifySessionCookie } from "@/lib/tapcardBizAuth";

/// Reads and verifies the admin session cookie from the current request —
/// the one place route handlers and server components should check "is
/// someone signed in, and to which org" rather than touching the cookie
/// jar directly.
export async function requireBizSession(): Promise<{ orgId: string; email: string } | null> {
  const value = (await cookies()).get(COOKIE_NAME)?.value;
  return verifySessionCookie(value);
}
