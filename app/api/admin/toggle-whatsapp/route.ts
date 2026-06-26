import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { isValidAdminSession, COOKIE_NAME } from "@/lib/adminAuth";

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
  const value = !!body.value;

  if (!code) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  await sql`UPDATE anniversary_invitees SET whatsapp_sent = ${value} WHERE code = ${code}`;

  return NextResponse.json({ ok: true });
}
