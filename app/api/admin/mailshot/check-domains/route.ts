import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { isAdminRequest } from "@/lib/adminRequest";
import { ensureMailshotSchema } from "@/lib/mailshot";
import { hasMail } from "@/lib/dnsCheck";

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const campaign = String(body?.campaign ?? "").trim().slice(0, 30);
  if (!campaign) return NextResponse.json({ error: "campaign required" }, { status: 400 });
  await ensureMailshotSchema();
  const queue = (await sql`
    SELECT c.id, c.email FROM tapcard_mailshot_list l JOIN tapcard_invite_contacts c ON c.id = l.contact_id
    WHERE l.campaign = ${campaign} AND l.status = 'queued' AND NOT c.do_not_contact
      AND NOT EXISTS (SELECT 1 FROM tapcard_invite_sends s WHERE s.contact_id = c.id AND s.campaign = ${campaign})
  `) as { id: number; email: string }[];
  const byDomain = new Map<string, number[]>();
  for (const q of queue) {
    const d = q.email.split("@")[1]?.toLowerCase().trim();
    if (d) byDomain.set(d, [...(byDomain.get(d) ?? []), q.id]);
  }
  const domains = [...byDomain.keys()];
  const dead: string[] = [];
  let next = 0;
  await Promise.all(Array.from({ length: 12 }, async () => {
    while (next < domains.length) {
      const d = domains[next++];
      if (!(await hasMail(d))) dead.push(d);
    }
  }));
  let removed = 0;
  for (const d of dead) {
    for (const id of byDomain.get(d) ?? []) {
      await sql`UPDATE tapcard_mailshot_list SET status = 'skipped', skip_reason = 'no mail server' WHERE campaign = ${campaign} AND contact_id = ${id}`;
      removed++;
    }
  }
  return NextResponse.json({ ok: true, domainsChecked: domains.length, deadDomains: dead.sort(), removed });
}
