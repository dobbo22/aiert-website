import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { isAdminRequest } from "@/lib/adminRequest";
import { ensureMailshotSchema } from "@/lib/mailshot";
import { hasMail } from "@/lib/dnsCheck";

export const maxDuration = 60;

// Everyone marked don't send for this campaign (but not permanently removed), so they can be checked by hand.
// People at domains with no mail server are tagged, and listed first. POST puts people back in the queue.
export async function GET(req: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const campaign = (new URL(req.url).searchParams.get("campaign") ?? "").trim().slice(0, 30);
  if (!campaign) return NextResponse.json({ error: "campaign required" }, { status: 400 });
  await ensureMailshotSchema();
  const rows = (await sql`
    SELECT c.id, c.name, c.email, l.skip_reason
    FROM tapcard_mailshot_list l JOIN tapcard_invite_contacts c ON c.id = l.contact_id
    WHERE l.campaign = ${campaign} AND l.status = 'skipped' AND NOT c.do_not_contact
    ORDER BY lower(c.email)
  `) as { id: number; name: string; email: string; skip_reason: string | null }[];
  // Older rows have no reason recorded; check their domains now so the list says which had no mail server.
  const domains = [...new Set(rows.map((r) => r.email.split("@")[1]?.toLowerCase()).filter(Boolean))];
  const dead = new Set<string>();
  let next = 0;
  await Promise.all(Array.from({ length: 12 }, async () => {
    while (next < domains.length) {
      const d = domains[next++];
      if (!(await hasMail(d))) dead.add(d);
    }
  }));
  const out = rows.map((r) => {
    const domain = r.email.split("@")[1]?.toLowerCase() ?? "";
    return { id: r.id, name: r.name, email: r.email, reason: dead.has(domain) ? "no mail server" : "unticked" };
  }).sort((a, b) => (a.reason === b.reason ? a.email.localeCompare(b.email) : a.reason === "no mail server" ? -1 : 1));
  return NextResponse.json({ skipped: out });
}

export async function POST(req: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const campaign = String(body?.campaign ?? "").trim().slice(0, 30);
  const ids: number[] = Array.isArray(body?.ids) ? body.ids.filter((n: unknown) => Number.isInteger(n)) : [];
  if (!campaign || !ids.length) return NextResponse.json({ error: "campaign and people are required" }, { status: 400 });
  await ensureMailshotSchema();
  for (const id of ids) {
    await sql`UPDATE tapcard_mailshot_list SET status = 'queued', skip_reason = NULL WHERE campaign = ${campaign} AND contact_id = ${id} AND status = 'skipped'`;
  }
  return NextResponse.json({ ok: true, restored: ids.length });
}
