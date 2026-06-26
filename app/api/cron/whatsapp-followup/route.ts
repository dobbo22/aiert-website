import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { sendWhatsAppFollowUpDigest } from "@/lib/email";

type Row = {
  code: string;
  name: string;
  invite_sent_at: string;
};

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = (await sql`
    SELECT code, name, invite_sent_at
    FROM anniversary_invitees
    WHERE invite_sent_at IS NOT NULL
      AND invite_sent_at <= now() - interval '48 hours'
      AND invite_opened_at IS NULL
      AND view_count = 0
      AND rsvp_status IS NULL
    ORDER BY invite_sent_at ASC
  `) as Row[];

  if (rows.length > 0) {
    await sendWhatsAppFollowUpDigest({
      guests: rows.map((r) => ({ name: r.name, code: r.code, sentAt: r.invite_sent_at })),
    });
  }

  return NextResponse.json({ ok: true, flagged: rows.length });
}
