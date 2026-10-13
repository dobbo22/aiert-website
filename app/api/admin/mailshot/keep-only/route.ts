import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { isAdminRequest } from "@/lib/adminRequest";
import { ensureMailshotSchema, parseMailshotList } from "@/lib/mailshot";

// After an email-checking service: give the list of addresses it says are valid; everyone else in the queue is
// marked don't send.
export async function POST(req: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const campaign = String(body?.campaign ?? "").trim().slice(0, 30);
  const valid = new Set(parseMailshotList(String(body?.text ?? "")).map((r) => r.email.toLowerCase()));
  if (!campaign || valid.size === 0) return NextResponse.json({ error: "No email addresses found in that list" }, { status: 400 });
  await ensureMailshotSchema();
  const queue = (await sql`
    SELECT c.id, c.email FROM tapcard_mailshot_list l JOIN tapcard_invite_contacts c ON c.id = l.contact_id
    WHERE l.campaign = ${campaign} AND l.status = 'queued' AND NOT c.do_not_contact
      AND NOT EXISTS (SELECT 1 FROM tapcard_invite_sends s WHERE s.contact_id = c.id AND s.campaign = ${campaign})
  `) as { id: number; email: string }[];
  const matched = queue.filter((q) => valid.has(q.email.toLowerCase())).length;
  // Safety: if almost nothing matches, the file is probably the wrong one; change nothing.
  if (matched < Math.min(5, queue.length)) {
    return NextResponse.json({ error: `Only ${matched} of the ${queue.length} queued people are in that list, so I changed nothing.` }, { status: 409 });
  }
  let skipped = 0;
  for (const q of queue) {
    if (!valid.has(q.email.toLowerCase())) {
      await sql`UPDATE tapcard_mailshot_list SET status = 'skipped' WHERE campaign = ${campaign} AND contact_id = ${q.id}`;
      skipped++;
    }
  }
  return NextResponse.json({ ok: true, kept: matched, skipped });
}
