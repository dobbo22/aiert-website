import { NextResponse } from "next/server";
import { linkedinConfigured } from "@/lib/linkedinApi";
import { scanEngagement } from "@/lib/linkedinEngagement";

// Once a day via Vercel Cron: collects who reacted to or commented on the page's recent posts, and new mentions.
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!linkedinConfigured()) return NextResponse.json({ ok: true, skipped: "LinkedIn not configured" });
  try {
    return NextResponse.json({ ok: true, ...(await scanEngagement()) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}
