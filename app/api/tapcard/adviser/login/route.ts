import { NextRequest, NextResponse } from "next/server";
import { rateLimited } from "@/lib/rateLimit";
import { advisersForEmail, createAdviserLoginToken, recentAdviserTokens } from "@/lib/tapcardAdvisers";
import { sendAdviserLoginEmail } from "@/lib/tapcardBizEmail";

// An adviser's staff member asks for a sign-in link. Only people AIERT has set up for an adviser get one; the answer is the same either way
// (a short "if that address is set up, a link is on its way"), so the page doesn't reveal who is on an adviser's list.
export async function POST(req: NextRequest) {
  if (rateLimited(req, "adviser-login", 8, 10 * 60_000)) return NextResponse.json({ error: "Too many attempts. Please wait a few minutes." }, { status: 429 });
  const body = (await req.json().catch(() => null)) as { email?: string } | null;
  const email = (body?.email ?? "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "a valid email is required" }, { status: 400 });
  const advisers = await advisersForEmail(email);
  if (advisers.length && (await recentAdviserTokens(email)) < 5) {
    const token = await createAdviserLoginToken(email);
    await sendAdviserLoginEmail(email, advisers[0].name, `https://tapcard.aiert.co.uk/api/tapcard/adviser/login/${token}`).catch((e) => console.error("adviser login email failed:", e));
  }
  return NextResponse.json({ ok: true });
}
