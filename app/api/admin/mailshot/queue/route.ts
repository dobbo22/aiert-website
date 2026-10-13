import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminRequest";
import { mailshotQueue, updateMailshotQueue, type QueueEdit } from "@/lib/mailshot";

// The people waiting to be sent: list them with their greetings, and save edits or "don't send".
export async function GET(req: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const campaign = (new URL(req.url).searchParams.get("campaign") ?? "").trim().slice(0, 30);
  if (!campaign) return NextResponse.json({ error: "campaign required" }, { status: 400 });
  return NextResponse.json({ queue: await mailshotQueue(campaign) });
}

export async function POST(req: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const campaign = String(body?.campaign ?? "").trim().slice(0, 30);
  const edits: QueueEdit[] = Array.isArray(body?.edits) ? body.edits.filter((e: QueueEdit) => e && Number.isInteger(e.id)) : [];
  if (!campaign || !edits.length) return NextResponse.json({ error: "campaign and edits are required" }, { status: 400 });
  return NextResponse.json({ ok: true, changed: await updateMailshotQueue(campaign, edits) });
}
