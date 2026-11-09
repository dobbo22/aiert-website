import { NextResponse } from "next/server";
import { linkedinConfigured } from "@/lib/linkedinApi";
import { runCommentCheck } from "@/lib/linkedinReplies";

// Runs every few hours via Vercel Cron (see vercel.json): auto-replies to basic pricing/download questions and queues the rest
// for approval in the admin LinkedIn tab.
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!linkedinConfigured()) return NextResponse.json({ ok: true, skipped: "LinkedIn not configured" });
  try {
    return NextResponse.json({ ok: true, ...(await runCommentCheck()) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}
