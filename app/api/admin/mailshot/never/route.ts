import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { isAdminRequest } from "@/lib/adminRequest";
import { ensureMailshotSchema } from "@/lib/mailshot";

// "Remove for good": the person is flagged never to be contacted (the same flag as an unsubscribe, which the
// Send invites page also respects) and is dropped from every mailshot queue. Their record is kept so a later
// re-import does not bring them back.
export async function POST(req: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const ids: number[] = Array.isArray(body?.ids) ? body.ids.filter((n: unknown) => Number.isInteger(n)) : [];
  if (!ids.length) return NextResponse.json({ error: "people are required" }, { status: 400 });
  await ensureMailshotSchema();
  for (const id of ids) {
    await sql`UPDATE tapcard_invite_contacts SET do_not_contact = true WHERE id = ${id}`;
    await sql`UPDATE tapcard_mailshot_list SET status = 'skipped' WHERE contact_id = ${id}`;
  }
  return NextResponse.json({ ok: true, removed: ids.length });
}
