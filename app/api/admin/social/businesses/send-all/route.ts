import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidAdminSession, COOKIE_NAME } from "@/lib/mailbroomAdminAuth";
import { sendCampaign, parseAudience } from "@/lib/appUserCampaign";

export const maxDuration = 120; // about 0.7 s per email

// Sends the "finish your TapCard" email to everyone still eligible. Needs the exact count and the typed word SEND.
export async function POST(req: NextRequest) {
  const session = (await cookies()).get(COOKIE_NAME)?.value;
  if (!isValidAdminSession(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { expected, confirm, audience } = (await req.json().catch(() => ({}))) as { expected?: number; confirm?: string; audience?: string };
  if (confirm !== "SEND" || !Number.isInteger(expected) || (expected as number) < 1) return NextResponse.json({ error: "Type SEND to confirm" }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, ...(await sendCampaign(expected as number, parseAudience(audience))) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}
