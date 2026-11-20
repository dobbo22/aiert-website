import { NextResponse } from "next/server";
import { deliverDue, purgeMemberLinks } from "@/lib/tapcardMemberLinks";

// Every 5 minutes via Vercel Cron: sends member-link events that are due (retries), and once a day's worth of housekeeping is cheap enough to run each time.
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const sent = await deliverDue(100).catch((e) => { console.error("member link delivery failed", e); return null; });
  const purged = new Date().getUTCMinutes() < 5 && new Date().getUTCHours() === 3 ? await purgeMemberLinks().catch(() => null) : null;
  return NextResponse.json({ delivery: sent, purged });
}
