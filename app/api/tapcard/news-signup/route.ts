import { NextRequest, NextResponse } from "next/server";
import { rateLimited } from "@/lib/rateLimit";
import { requestNewsSignup, validEmail } from "@/lib/tapcardNews";

// POST { email, platform } from the apps' "Email me TapCard news". Always answers ok for a well-formed address, so the reply
// never shows whether the address was already known; the person must still click the confirmation link we email.
export async function POST(req: NextRequest) {
  if (rateLimited(req, "news-signup", 6, 10 * 60_000)) return NextResponse.json({ error: "Too many tries. Please wait a few minutes." }, { status: 429 });
  const body = (await req.json().catch(() => null)) as { email?: unknown; platform?: unknown } | null;
  const email = validEmail(body?.email);
  if (!email) return NextResponse.json({ error: "Enter a full email address." }, { status: 400 });
  const platform = body?.platform === "ios" || body?.platform === "android" ? body.platform : "";
  try {
    await requestNewsSignup(email, platform, "app");
  } catch {
    return NextResponse.json({ error: "Couldn't send the confirmation email. Please try again later." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
