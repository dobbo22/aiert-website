import { requireBizSession } from "@/lib/tapcardBizSession";
import { listAudit } from "@/lib/tapcardNewsPolicy";

// The company's headline audit trail as a CSV file (admins only).
const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
export async function GET() {
  const session = await requireBizSession();
  if (!session) return new Response("Please sign in again.", { status: 401 });
  const rows = await listAudit(session.orgId, 5000);
  const lines = ["when (UTC),action,type,by,headline,link,groups,details", ...rows.map((r) => [r.at, r.action, r.kind, r.actor, r.text, r.link, r.groups.join(" "), JSON.stringify(r.detail)].map(cell).join(","))];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="headline-audit-trail.csv"', "Cache-Control": "no-store" } });
}
