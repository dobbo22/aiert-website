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
  const seatId = Number(body.seatId);
  const code: string | null = body.code || null;
  const guestLabel: string | null = body.guestLabel || null;

  if (!Number.isInteger(seatId) || seatId < 1 || seatId > 26) {
    return NextResponse.json({ error: "Invalid seatId" }, { status: 400 });
  }

  await sql`
    UPDATE anniversary_seats
    SET invitee_code = ${code}, guest_label = ${guestLabel}
    WHERE seat_id = ${seatId}
  `;

  return NextResponse.json({ ok: true });
}
