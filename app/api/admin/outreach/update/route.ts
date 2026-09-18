import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { isValidAdminSession, COOKIE_NAME } from "@/lib/mailbroomAdminAuth";

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
  const id = Number.isInteger(body.id) ? (body.id as number) : null;
  const status = typeof body.status === "string" ? body.status.trim().slice(0, 100) : null;
  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 2000) : null;

  if (!id || !status) {
    return NextResponse.json({ error: "id and status are required" }, { status: 400 });
  }

  await sql`
    UPDATE mailbroom_influencer_outreach
    SET status = ${status}, notes = ${notes}
    WHERE id = ${id}
  `;

  return NextResponse.json({ ok: true });
}
