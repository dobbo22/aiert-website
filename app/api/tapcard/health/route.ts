import { NextResponse } from "next/server";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

// A health check for an outside uptime monitor: answers 200 {"ok":true} when the site is up AND the database answers, and 503 otherwise.
// It reads nothing from any table and returns no data about anyone. Point the monitor at it and alert on anything but 200.
export async function GET() {
  const headers = { "Cache-Control": "no-store, max-age=0" };
  try {
    await Promise.race([
      sql`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error("database timeout")), 8000)),
    ]);
    return NextResponse.json({ ok: true }, { headers });
  } catch (e) {
    console.error("health check failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false }, { status: 503, headers });
  }
}
