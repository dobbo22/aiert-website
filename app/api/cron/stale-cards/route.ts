import { NextResponse } from "next/server";
import { deleteCard } from "@/lib/tapcardDb";
import { staleCards } from "@/lib/tapcardCardLimits";

// Runs daily via Vercel Cron (see vercel.json). Finds personal-plan cards that nobody has opened, saved or used and that have not been
// touched for 90 days (see lib/tapcardCardLimits.ts). It only LISTS them (a dry run, in the response and the logs) unless the
// environment variable TAPCARD_STALE_CLEANUP is "1", when it also deletes up to 200 a day.
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const cards = await staleCards(90).catch((e) => { console.error("stale cards query failed", e); return null; });
  if (!cards) return NextResponse.json({ error: "query failed" }, { status: 500 });
  const deleting = process.env.TAPCARD_STALE_CLEANUP === "1";
  console.log(`stale cards: ${cards.length} found, ${deleting ? "deleting" : "dry run (nothing deleted)"}`);
  if (deleting) for (const c of cards) await deleteCard(c.id).catch((e) => console.error("stale card delete failed", c.id, e));
  return NextResponse.json({ found: cards.length, deleted: deleting ? cards.length : 0, dryRun: !deleting, cards: cards.slice(0, 50) });
}
