import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { cleanupPush, pushToFollowers } from "@/lib/tapcardPush";

// Runs daily via Vercel Cron (see vercel.json): "ends tomorrow" pushes for offers that finish within the next day, then
// housekeeping for push tokens and send records.
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // Each card can run one offer per audience: the latest of each, and only if it ends within the next 30 hours.
  const offers = (await sql`
    SELECT o.id, o.card_id, o.text, o.audience, c.name, c.company
    FROM (SELECT DISTINCT ON (card_id, audience) * FROM tapcard_offers ORDER BY card_id, audience, id DESC) o JOIN tapcard_cards c ON c.id = o.card_id
    WHERE o.expires_at > now() AND o.expires_at < now() + interval '30 hours'
  `) as { id: number; card_id: string; text: string; audience: string[] | null; name: string; company: string }[];
  let sent = 0;
  for (const o of offers) {
    const r = await pushToFollowers(o.card_id, "ending", { title: o.company || o.name, body: `Ends tomorrow: ${o.text}`, ref: String(o.id), groups: o.audience && o.audience.length ? o.audience : undefined });
    sent += r.sent;
  }
  await cleanupPush();
  return NextResponse.json({ ok: true, endingOffers: offers.length, sent });
}
