import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { isAdminRequest } from "@/lib/adminRequest";
import { ensureInviteSchema } from "@/lib/tapcardInvites";

// Per-contact housekeeping from the Invites tab: mark do-not-contact, or
// delete (which also removes their sends and clicks, via ON DELETE CASCADE).
export async function POST(req: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = Number(body?.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "id required" }, { status: 400 });

  await ensureInviteSchema();
  if (body.action === "delete") {
    await sql`DELETE FROM tapcard_invite_contacts WHERE id = ${id}`;
  } else if (typeof body.doNotContact === "boolean") {
    await sql`UPDATE tapcard_invite_contacts SET do_not_contact = ${body.doNotContact} WHERE id = ${id}`;
  } else {
    return NextResponse.json({ error: "Nothing to do" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
