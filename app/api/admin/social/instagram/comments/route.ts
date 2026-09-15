import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidAdminSession, COOKIE_NAME } from "@/lib/mailbroomAdminAuth";
import { listInstagramComments, replyToInstagramComment } from "@/lib/instagramGraph";

async function requireAdmin() {
  const session = (await cookies()).get(COOKIE_NAME)?.value;
  return isValidAdminSession(session);
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const mediaId = req.nextUrl.searchParams.get("mediaId");
  if (!mediaId) return NextResponse.json({ error: "mediaId is required" }, { status: 400 });

  try {
    const comments = await listInstagramComments(mediaId);
    return NextResponse.json({ comments });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to load comments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { commentId, message } = await req.json();
  if (!commentId || !message) {
    return NextResponse.json({ error: "commentId and message are required" }, { status: 400 });
  }

  try {
    const id = await replyToInstagramComment(commentId, message);
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Reply failed" }, { status: 500 });
  }
}
