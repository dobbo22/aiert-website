import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidAdminSession, COOKIE_NAME } from "@/lib/mailbroomAdminAuth";
import { createTextThread } from "@/lib/threadsGraph";

export const maxDuration = 30; // container-ready polling can take a few seconds

export async function POST(req: NextRequest) {
  const session = (await cookies()).get(COOKIE_NAME)?.value;
  if (!isValidAdminSession(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { text } = await req.json();
  if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });

  try {
    const postId = await createTextThread(text);
    return NextResponse.json({ ok: true, postId });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Post failed" }, { status: 500 });
  }
}
