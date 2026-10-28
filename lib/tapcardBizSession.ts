import { cookies } from "next/headers";
import sql from "@/lib/db";
import { COOKIE_NAME, verifySessionCookie } from "@/lib/tapcardBizAuth";
import { isSupportEmail, supportAccessOpen } from "@/lib/tapcardBizSupport";

export interface BizSession { orgId: string; email: string; support?: boolean; role: "admin" | "manager"; locationIds: string[]; canPost: boolean }

/// Reads and verifies the admin session cookie from the current request, for ANY signed-in person (an admin or a shop manager).
/// Only the few places a manager may use call this directly (QR sign, their shops' staff); everything else uses requireBizSession.
export async function requireBizUser(): Promise<BizSession | null> {
  const value = (await cookies()).get(COOKIE_NAME)?.value;
  const session = verifySessionCookie(value);
  if (!session) return null;
  // AIERT support (signed cookie, two hours): only while the company's own support-access window is open, re-checked on every request.
  if (isSupportEmail(session.email)) return (await supportAccessOpen(session.orgId)) ? { ...session, support: true, role: "admin", locationIds: [], canPost: true } : null;
  // The cookie lasts 30 days, so re-check the person is still on the company's list (removed people lose access at once), and read
  // their role and shops from it.
  const rows = (await sql`SELECT role, location_ids, can_post FROM tapcard_biz_admins WHERE org_id = ${session.orgId} AND email = ${session.email} LIMIT 1`) as { role: string; location_ids: string[] | null; can_post: boolean | null }[];
  if (!rows.length) return null;
  return { ...session, role: rows[0].role === "manager" ? "manager" : "admin", locationIds: rows[0].location_ids ?? [], canPost: rows[0].can_post !== false };
}

/// An ADMIN's session (or AIERT support). A manager is refused everywhere this is used, so a new admin page or route is closed to
/// managers by default; the few things a manager may do use requireBizUser.
export async function requireBizSession(): Promise<(BizSession & { role: "admin" }) | null> {
  const s = await requireBizUser();
  return s && s.role === "admin" ? (s as BizSession & { role: "admin" }) : null;
}
