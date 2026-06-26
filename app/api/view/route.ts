import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

export async function POST(req: NextRequest) {
  const { code } = await req.json();
  if (typeof code !== "string" || !code) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  await sql`
    UPDATE anniversary_invitees
    SET
      view_count = view_count + 1,
      first_viewed_at = COALESCE(first_viewed_at, now()),
      last_viewed_at = now()
    WHERE code = ${code}
  `;

  return NextResponse.json({ ok: true });
}
