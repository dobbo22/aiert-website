import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidAdminSession, COOKIE_NAME } from "@/lib/mailbroomAdminAuth";
import { submitTextPost } from "@/lib/redditApi";

export async function POST(req: NextRequest) {
  const session = (await cookies()).get(COOKIE_NAME)?.value;
  if (!isValidAdminSession(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const subreddit = String(body.subreddit ?? "").trim().replace(/^r\//, "");
  const title = String(body.title ?? "").trim();
  const text = String(body.text ?? "").trim();

  if (!subreddit || !title) {
    return NextResponse.json({ error: "Subreddit and title are required" }, { status: 400 });
  }

  try {
    const url = await submitTextPost(subreddit, title, text);
    return NextResponse.json({ ok: true, url });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Post failed" }, { status: 500 });
  }
}
