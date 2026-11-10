import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidAdminSession, COOKIE_NAME } from "@/lib/mailbroomAdminAuth";
import { sendTestCopies, parseAudience } from "@/lib/appUserCampaign";

// Sends TEST copies of chosen app-user emails to one of our own addresses. Never to the real recipients.
export async function POST(req: NextRequest) {
  const session = (await cookies()).get(COOKIE_NAME)?.value;
  if (!isValidAdminSession(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { to, emails, audience } = (await req.json().catch(() => ({}))) as { to?: string; emails?: string[]; audience?: string };
  try {
    return NextResponse.json({ ok: true, results: await sendTestCopies(to ?? "", Array.isArray(emails) ? emails.slice(0, 5) : [], parseAudience(audience)) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}
