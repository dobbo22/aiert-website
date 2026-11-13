import { requireBizSession } from "@/lib/tapcardBizSession";
import { listSharedFollowers } from "@/lib/tapcardShare";

// CSV of the followers who chose to share their details. Admins only.
export async function GET() {
  const session = await requireBizSession();
  if (!session) return new Response("Please sign in again.", { status: 401 });
  const rows = await listSharedFollowers(session.orgId);
  // A leading apostrophe stops a spreadsheet treating text that starts with = + - @ as a formula.
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return `"${(/^[=+\-@\t\r]/.test(s) ? "'" + s : s).replace(/"/g, '""')}"`;
  };
  const head = ["Name", "Email", "Phone", "Card", "Shared on"];
  const lines = rows.map((r) => [r.name, r.email, r.phone, r.company, r.consentedAt.slice(0, 10)].map(esc).join(","));
  return new Response([head.map(esc).join(","), ...lines].join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="tapcard-shared-followers.csv"' },
  });
}
