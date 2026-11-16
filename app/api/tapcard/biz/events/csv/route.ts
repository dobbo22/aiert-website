import { NextRequest } from "next/server";
import { requireBizSession } from "@/lib/tapcardBizSession";
import { orgIsListed } from "@/lib/tapcardListedAdmin";
import { listEventAttendees, listEvents } from "@/lib/tapcardEvents";

// CSV of the people who registered at one event and chose to share their details. Admins of a listed company only.
export async function GET(req: NextRequest) {
  const session = await requireBizSession();
  if (!session) return new Response("Please sign in again.", { status: 401 });
  if (!(await orgIsListed(session.orgId))) return new Response("Event lists are for listed companies.", { status: 403 });
  const code = new URL(req.url).searchParams.get("code") ?? "";
  const event = (await listEvents(session.orgId)).find((e) => e.code === code);
  if (!event) return new Response("That event was not found.", { status: 404 });
  const rows = (await listEventAttendees(session.orgId))[code]?.named ?? [];
  // A leading apostrophe stops a spreadsheet treating text that starts with = + - @ as a formula.
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return `"${(/^[=+\-@\t\r]/.test(s) ? "'" + s : s).replace(/"/g, '""')}"`;
  };
  const head = ["Name", "Email", "Slot", "Registered at"];
  const lines = rows.map((r) => [r.name, r.email, r.slot, r.at.slice(0, 16).replace("T", " ")].map(esc).join(","));
  const safe = event.label.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "event";
  return new Response([head.map(esc).join(","), ...lines].join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="tapcard-${safe}.csv"` },
  });
}
