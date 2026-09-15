import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidAdminSession, COOKIE_NAME } from "@/lib/mailbroomAdminAuth";
import { listComments, replyToComment } from "@/lib/facebookGraph";

async function requireAdmin() {
  const session = (await cookies()).get(COOKIE_NAME)?.value;
  return isValidAdminSession(session);
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const postId = req.nextUrl.searchParams.get("postId");
  if (!postId) return NextResponse.json({ error: "postId is required" }, { status: 400 });

  try {
    const comments = await listComments(postId);
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
    const id = await replyToComment(commentId, message);
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Reply failed" }, { status: 500 });
  }
}
