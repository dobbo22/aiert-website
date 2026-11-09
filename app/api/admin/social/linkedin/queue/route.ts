import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidAdminSession, COOKIE_NAME } from "@/lib/mailbroomAdminAuth";
import { dismissQueuedReply, sendQueuedReply } from "@/lib/linkedinReplies";

export async function POST(req: NextRequest) {
  const session = (await cookies()).get(COOKIE_NAME)?.value;
  if (!isValidAdminSession(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, action, text } = (await req.json().catch(() => ({}))) as { id?: string; action?: string; text?: string };
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  try {
    if (action === "send") await sendQueuedReply(id, text ?? "");
    else if (action === "dismiss") await dismissQueuedReply(id);
    else return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
