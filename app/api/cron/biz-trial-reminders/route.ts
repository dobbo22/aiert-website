import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { ensureSchema, trialEndsAt, type BizOrg } from "@/lib/tapcardBiz";
import { sendBizTrialReminderEmail } from "@/lib/tapcardBizEmail";
import { TRIAL_REMINDER_DAYS } from "@/lib/tapcardBizBilling";

// Runs daily via Vercel Cron (see vercel.json). Emails each trial company's admins once, a few days before the
// free trial ends. Paid companies and trials already reminded are skipped.
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await ensureSchema();
  const orgs = (await sql`
    SELECT * FROM tapcard_biz_orgs WHERE seat_band = 'trial' AND billing_status = 'active' AND trial_reminded_at IS NULL
  `) as BizOrg[];
  const now = Date.now();
  let sent = 0;
  for (const org of orgs) {
    const end = trialEndsAt(org);
    if (!end) continue;
    const daysLeft = (end.getTime() - now) / 86_400_000;
    if (daysLeft < 0 || daysLeft > TRIAL_REMINDER_DAYS) continue;
    const admins = (await sql`SELECT email FROM tapcard_biz_admins WHERE org_id = ${org.id}`) as { email: string }[];
    const endsOn = end.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    for (const a of admins) {
      await sendBizTrialReminderEmail(a.email, org.name || "your company", endsOn).catch((e) => console.error("trial reminder failed", e));
    }
    await sql`UPDATE tapcard_biz_orgs SET trial_reminded_at = now() WHERE id = ${org.id}`;
    sent++;
  }
  return NextResponse.json({ ok: true, checked: orgs.length, reminded: sent });
}
