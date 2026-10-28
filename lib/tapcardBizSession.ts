import { cookies } from "next/headers";
import sql from "@/lib/db";
import { COOKIE_NAME, verifySessionCookie } from "@/lib/tapcardBizAuth";
import { isSupportEmail, supportAccessOpen } from "@/lib/tapcardBizSupport";

/// Reads and verifies the admin session cookie from the current request —
/// the one place route handlers and server components should check "is
/// someone signed in, and to which org" rather than touching the cookie
/// jar directly.
export async function requireBizSession(): Promise<{ orgId: string; email: string; support?: boolean } | null> {
  const value = (await cookies()).get(COOKIE_NAME)?.value;
  const session = verifySessionCookie(value);
  if (!session) return null;
  // AIERT support (signed cookie, two hours): only while the company's own support-access window is open, re-checked on every request.
  if (isSupportEmail(session.email)) return (await supportAccessOpen(session.orgId)) ? { ...session, support: true } : null;
  // The cookie lasts 30 days, so re-check the person is still an admin of that company (removed admins lose access at once).
  const rows = await sql`SELECT 1 FROM tapcard_biz_admins WHERE org_id = ${session.orgId} AND email = ${session.email} LIMIT 1`;
  return rows.length ? session : null;
}
