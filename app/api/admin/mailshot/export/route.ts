import { isAdminRequest } from "@/lib/adminRequest";
import { mailshotQueue } from "@/lib/mailshot";

// The queue as a CSV (email, name), to run through an email-checking service.
export async function GET(req: Request) {
  if (!(await isAdminRequest())) return new Response("Unauthorized", { status: 401 });
  const campaign = (new URL(req.url).searchParams.get("campaign") ?? "").trim().slice(0, 30);
  const rows = await mailshotQueue(campaign);
  const q = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = "email,name\n" + rows.map((r) => `${q(r.email)},${q(r.name)}`).join("\n") + "\n";
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${campaign}-queue.csv"` } });
}
