import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidAdminSession, COOKIE_NAME } from "@/lib/mailbroomAdminAuth";
import { listReplies, replyToThread } from "@/lib/threadsGraph";

export const maxDuration = 30; // container-ready polling can take a few seconds

async function requireAdmin() {
  const session = (await cookies()).get(COOKIE_NAME)?.value;
  return isValidAdminSession(session);
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const threadId = req.nextUrl.searchParams.get("threadId");
  if (!threadId) return NextResponse.json({ error: "threadId is required" }, { status: 400 });

  try {
    const replies = await listReplies(threadId);
    return NextResponse.json({ replies });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to load replies" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { threadId, message } = await req.json();
  if (!threadId || !message) {
    return NextResponse.json({ error: "threadId and message are required" }, { status: 400 });
  }

  try {
    const id = await replyToThread(threadId, message);
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Reply failed" }, { status: 500 });
  }
}
