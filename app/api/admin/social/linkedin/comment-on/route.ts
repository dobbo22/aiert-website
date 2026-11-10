import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidAdminSession, COOKIE_NAME } from "@/lib/mailbroomAdminAuth";
import { previewPost, commentOnPost } from "@/lib/linkedinOutbound";

export async function POST(req: NextRequest) {
  const session = (await cookies()).get(COOKIE_NAME)?.value;
  if (!isValidAdminSession(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { action, url, text, author } = (await req.json().catch(() => ({}))) as { action?: string; url?: string; text?: string; author?: string };
  if (!url) return NextResponse.json({ error: "Paste a post link" }, { status: 400 });
  try {
    if (action === "preview") return NextResponse.json({ ok: true, ...(await previewPost(url)) });
    if (action === "post") return NextResponse.json({ ok: true, ...(await commentOnPost(url, text ?? "", author ?? "")) });
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}
