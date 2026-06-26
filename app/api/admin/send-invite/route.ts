import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { isValidAdminSession, COOKIE_NAME } from "@/lib/adminAuth";
import { sendInviteEmail } from "@/lib/email";

async function requireAdmin() {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  return isValidAdminSession(session);
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const code = typeof body.code === "string" ? body.code : "";
  if (!code) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const rows = await sql`
    SELECT name, guest_email FROM anniversary_invitees WHERE code = ${code}
  `;
  if (rows.length === 0) {
    return NextResponse.json({ error: "Invitee not found" }, { status: 404 });
  }

  const { name, guest_email: email } = rows[0] as { name: string; guest_email: string | null };
  if (!email) {
    return NextResponse.json({ error: "No email on file for this invitee" }, { status: 400 });
  }

  const baseUrl = process.env.SITE_URL || "https://aiert.co.uk";
  await sendInviteEmail({ name, email, inviteUrl: `${baseUrl}/invite/${code}`, code });

  await sql`UPDATE anniversary_invitees SET invite_sent_at = now() WHERE code = ${code}`;

  return NextResponse.json({ ok: true });
}
