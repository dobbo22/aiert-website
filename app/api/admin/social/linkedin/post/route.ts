import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidAdminSession, COOKIE_NAME } from "@/lib/mailbroomAdminAuth";
import { createLinkedInPost } from "@/lib/linkedinApi";

export async function POST(req: NextRequest) {
  const session = (await cookies()).get(COOKIE_NAME)?.value;
  if (!isValidAdminSession(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const message = String(form.get("message") ?? "").trim();
  const image = form.get("image");
  if (!message) return NextResponse.json({ error: "Post text is required" }, { status: 400 });

  try {
    const media = image instanceof File && image.size > 0 ? { bytes: Buffer.from(await image.arrayBuffer()) } : undefined;
    const post = await createLinkedInPost(message, media);
    return NextResponse.json({ ok: true, ...post });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Post failed" }, { status: 500 });
  }
}
