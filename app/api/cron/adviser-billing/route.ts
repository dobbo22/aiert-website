import { NextResponse } from "next/server";
import { markReminded, runAdviserDaily, adviserSummary } from "@/lib/tapcardAdviserBilling";
import { sendAdviserTrialReminderEmail } from "@/lib/tapcardBizEmail";
import { monthlyTotalPence, poundsPerMonth } from "@/lib/tapcardAdviserPricing";
import sql from "@/lib/db";

// Daily. Ends adviser covers whose 6-month term is over (and updates the subscription), and emails each trial adviser's senior staff
// 14 days before the trial ends, with what the first charge will be.
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const r = await runAdviserDaily();
  let sent = 0;
  for (const a of r.reminders) {
    const s = await adviserSummary(a.adviserId);
    const staff = (await sql`SELECT email FROM tapcard_adviser_users WHERE adviser_id = ${a.adviserId} AND senior`) as { email: string }[];
    const total = poundsPerMonth(monthlyTotalPence(s.covers.map((c) => c.tier ?? 0)));
    const endsOn = a.trialEndsAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    for (const u of staff) { await sendAdviserTrialReminderEmail(u.email, a.name, endsOn, s.covers.length ? total : "", "https://tapcard.aiert.co.uk/business/adviser").then(() => sent++).catch((e) => console.error("adviser reminder failed", e)); }
    await markReminded(a.adviserId);
  }
  return NextResponse.json({ ok: true, ended: r.ended, reminders: r.reminders.length, sent });
}
