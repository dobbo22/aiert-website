import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { cleanupPush, pushToFollowers } from "@/lib/tapcardPush";

// Runs daily via Vercel Cron (see vercel.json): "ends tomorrow" pushes for offers that finish within the next day, then
// housekeeping for push tokens and send records.
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const offers = (await sql`
    SELECT DISTINCT ON (o.card_id) o.id, o.card_id, o.text, c.name, c.company
    FROM tapcard_offers o JOIN tapcard_cards c ON c.id = o.card_id
    WHERE o.expires_at > now() AND o.expires_at < now() + interval '30 hours'
    ORDER BY o.card_id, o.id DESC
  `) as { id: number; card_id: string; text: string; name: string; company: string }[];
  let sent = 0;
  for (const o of offers) {
    const r = await pushToFollowers(o.card_id, "ending", { title: o.company || o.name, body: `Ends tomorrow: ${o.text}`, ref: String(o.id) });
    sent += r.sent;
  }
  await cleanupPush();
  return NextResponse.json({ ok: true, endingOffers: offers.length, sent });
}
