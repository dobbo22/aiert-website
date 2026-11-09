import { NextResponse } from "next/server";
import { runDue } from "@/lib/socialQueue";

// Runs every 15 minutes via Vercel Cron (see vercel.json): publishes the scheduled social posts that are due.
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const r = await runDue();
    return NextResponse.json({ ok: true, processed: r.processed, sent: r.ok, failed: r.failed });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}
