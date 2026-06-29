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

  if (!id) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  await sql`DELETE FROM mailbroom_reviewers WHERE id = ${id}`;

  return NextResponse.json({ ok: true });
}
