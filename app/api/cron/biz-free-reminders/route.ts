import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { ensureSchema } from "@/lib/tapcardBiz";
import { sendBizFreeEndingEmail } from "@/lib/tapcardBizEmail";
import { REMINDER_STEPS, dueStep } from "@/lib/tapcardFreeReminder";

// Daily (vercel.json). For a company AIERT has given free months (free_until set, no Stripe subscription, not free for life)
// emails its admins at 30, 14 and 7 days before free_until. Each step goes once (free_reminders remembers which).
// This only reminds: access is not switched off automatically.
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await ensureSchema();
  const orgs = (await sql`
    SELECT id, name, locations, free_until, free_reminders FROM tapcard_biz_orgs
    WHERE free_until IS NOT NULL AND free_for_life = false AND stripe_subscription_id IS NULL AND billing_status = 'active'
  `) as { id: string; name: string; locations: number; free_until: string; free_reminders: string }[];
  let sent = 0;
  for (const org of orgs) {
    const end = new Date(org.free_until);
    const daysLeft = (end.getTime() - Date.now()) / 86_400_000;
    const done = (org.free_reminders || "").split(",").filter(Boolean).map(Number);
    const step = dueStep(daysLeft, done);
    if (step === null) continue;
    const admins = (await sql`SELECT email FROM tapcard_biz_admins WHERE org_id = ${org.id}`) as { email: string }[];
    const endsOn = end.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    for (const a of admins) {
      await sendBizFreeEndingEmail(a.email, org.name || "your company", endsOn, Math.max(1, Math.ceil(daysLeft)), org.locations).catch((e) => console.error("free-ending reminder failed", e));
    }
    // A step skipped by a late setup is marked too, so the larger ones do not follow later.
    const all = [...new Set([...done, ...REMINDER_STEPS.filter((d) => d >= step)])].join(",");
    await sql`UPDATE tapcard_biz_orgs SET free_reminders = ${all} WHERE id = ${org.id}`;
    sent++;
  }
  return NextResponse.json({ ok: true, checked: orgs.length, reminded: sent });
}
