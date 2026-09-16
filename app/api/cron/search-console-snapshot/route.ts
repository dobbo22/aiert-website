import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { getDailySnapshot } from "@/lib/googleSearchConsole";

// Runs daily via Vercel Cron (see vercel.json). Search Console data lags
// 2-3 days, so we snapshot the day from 3 days ago rather than "yesterday" —
// querying too recent a date returns incomplete rows.
const SNAPSHOT_LAG_DAYS = 3;
const ALL_HOSTS_KEY = "__all__";

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS search_console_snapshots (
      id SERIAL PRIMARY KEY,
      snapshot_date DATE NOT NULL,
      host TEXT NOT NULL,
      clicks INTEGER NOT NULL,
      impressions INTEGER NOT NULL,
      ctr NUMERIC NOT NULL,
      position NUMERIC NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (snapshot_date, host)
    )
  `;
}

async function writeSnapshot(snapshotDate: string) {
  const snapshot = await getDailySnapshot(snapshotDate);

  const rows = [
    { host: ALL_HOSTS_KEY, ...snapshot.overall },
    ...snapshot.byHost.map((h) => ({
      host: h.host,
      clicks: h.clicks,
      impressions: h.impressions,
      ctr: h.ctr,
      position: h.position,
    })),
  ];

  for (const row of rows) {
    await sql`
      INSERT INTO search_console_snapshots (snapshot_date, host, clicks, impressions, ctr, position)
      VALUES (${snapshotDate}, ${row.host}, ${row.clicks}, ${row.impressions}, ${row.ctr}, ${row.position})
      ON CONFLICT (snapshot_date, host)
      DO UPDATE SET clicks = EXCLUDED.clicks, impressions = EXCLUDED.impressions,
                    ctr = EXCLUDED.ctr, position = EXCLUDED.position
    `;
  }

  return rows.length;
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureTable();

  const url = new URL(req.url);
  const backfillDays = Math.min(Number(url.searchParams.get("backfill")) || 1, 90);

  const results: { date: string; hosts: number }[] = [];
  for (let i = 0; i < backfillDays; i++) {
    const date = new Date();
    date.setDate(date.getDate() - SNAPSHOT_LAG_DAYS - i);
    const snapshotDate = date.toISOString().slice(0, 10);
    const hosts = await writeSnapshot(snapshotDate);
    results.push({ date: snapshotDate, hosts });
  }

  return NextResponse.json({ ok: true, days: results.length, results });
}
