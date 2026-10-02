import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { isAdminRequest } from "@/lib/adminRequest";
import { ensureInviteSchema } from "@/lib/tapcardInvites";

// "Reset" on Track invites: deletes one send (its clicks go with it, via ON
// DELETE CASCADE). The contact itself is untouched.
export async function POST(req: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const sendId = Number(body?.sendId);
  if (!Number.isInteger(sendId)) return NextResponse.json({ error: "sendId required" }, { status: 400 });
  await ensureInviteSchema();
  await sql`DELETE FROM tapcard_invite_sends WHERE id = ${sendId}`;
  return NextResponse.json({ ok: true });
}
