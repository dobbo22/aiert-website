import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminRequest";
import { mailshotBounces, mailshotStats } from "@/lib/mailshot";

export async function GET(req: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const campaign = (new URL(req.url).searchParams.get("campaign") ?? "").trim().slice(0, 30);
  if (!campaign) return NextResponse.json({ error: "campaign required" }, { status: 400 });
  return NextResponse.json({ stats: await mailshotStats(campaign), bounces: await mailshotBounces(campaign) });
}
