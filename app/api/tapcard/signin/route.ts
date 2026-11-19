import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { rateLimited } from "@/lib/rateLimit";
import { findAdminOrgsByEmail } from "@/lib/tapcardBiz";
import { createLoginToken } from "@/lib/tapcardBizAuth";
import { advisersForEmail, createAdviserLoginToken, recentAdviserTokens } from "@/lib/tapcardAdvisers";
import { sendAdviserLoginEmail, sendBizLoginEmail } from "@/lib/tapcardBizEmail";

// One sign-in for company administrators and advisers. The person enters their email; if it is a company administrator they get the
// administrator link, if it is an adviser's staff member they get the adviser link, and if it is both they get both. The answer is the
// same whatever the address is, so this page never reveals who has an account. (The two separate sign-in pages still work as before.)
export async function POST(req: NextRequest) {
  if (rateLimited(req, "signin", 8, 10 * 60_000)) return NextResponse.json({ error: "Too many attempts. Please wait a few minutes." }, { status: 429 });
  const body = (await req.json().catch(() => null)) as { email?: string } | null;
  const email = (body?.email ?? "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "a valid email is required" }, { status: 400 });
  const origin = "https://tapcard.aiert.co.uk";

  const admins = await findAdminOrgsByEmail(email).catch(() => []);
  if (admins.length) {
    // At most 5 sign-in emails per address an hour, the same limit as the administrator page.
    const [{ n }] = (await sql`SELECT count(*)::int AS n FROM tapcard_biz_login_tokens WHERE admin_email = ${email} AND expires_at > now() - interval '45 minutes'`) as { n: number }[];
    if (n < 5) {
      const token = await createLoginToken(email, admins[0].org_id);
      await sendBizLoginEmail(email, `${origin}/api/biz/login/${token}`).catch((e) => console.error("signin: admin email failed:", e));
    }
  }
  const advisers = await advisersForEmail(email).catch(() => []);
  if (advisers.length && (await recentAdviserTokens(email)) < 5) {
    const token = await createAdviserLoginToken(email);
    await sendAdviserLoginEmail(email, advisers[0].name, `${origin}/api/tapcard/adviser/login/${token}`).catch((e) => console.error("signin: adviser email failed:", e));
  }
  return NextResponse.json({ ok: true });
}
