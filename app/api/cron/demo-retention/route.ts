import { NextResponse } from "next/server";
import { purgeDemoData } from "@/lib/tapcardPrebuilt";

// Runs daily via Vercel Cron (see vercel.json): deletes "Build my TapCard" demo data past its retention period
// (DEMO_RETENTION_DAYS in lib/tapcardPrebuilt.ts, stated on the privacy page).
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const deleted = await purgeDemoData();
  return NextResponse.json({ ok: true, deleted });
}
