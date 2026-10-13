import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminRequest";
import { addCandidatesToMailshot, contactsCandidates } from "@/lib/mailshot";

// Preview (GET) and add (POST) the people in your contacts who have not had an invite yet.
export async function GET(req: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const campaign = (new URL(req.url).searchParams.get("campaign") ?? "").trim().slice(0, 30);
  if (!campaign) return NextResponse.json({ error: "campaign required" }, { status: 400 });
  return NextResponse.json({ candidates: await contactsCandidates(campaign) });
}

export async function POST(req: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const campaign = String(body?.campaign ?? "").trim().slice(0, 30);
  const ids: number[] = Array.isArray(body?.ids) ? body.ids.filter((n: unknown) => Number.isInteger(n)) : [];
  if (!campaign || !ids.length) return NextResponse.json({ error: "campaign and people are required" }, { status: 400 });
  // Only ever add people the preview would have offered (not unsubscribed, not bounced, business-looking).
  const allowed = new Set((await contactsCandidates(campaign)).ok.map((r) => r.id));
  const added = await addCandidatesToMailshot(campaign, ids.filter((id) => allowed.has(id)));
  return NextResponse.json({ ok: true, added });
}
