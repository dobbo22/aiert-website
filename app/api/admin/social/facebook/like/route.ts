import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidAdminSession, COOKIE_NAME } from "@/lib/mailbroomAdminAuth";
import { likeComment } from "@/lib/facebookGraph";

export async function POST(req: NextRequest) {
  const session = (await cookies()).get(COOKIE_NAME)?.value;
  if (!isValidAdminSession(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { commentId } = await req.json();
  if (!commentId) return NextResponse.json({ error: "commentId is required" }, { status: 400 });

  try {
    await likeComment(commentId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Like failed" }, { status: 500 });
  }
}
