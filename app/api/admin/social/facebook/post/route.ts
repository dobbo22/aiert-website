import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidAdminSession, COOKIE_NAME } from "@/lib/mailbroomAdminAuth";
import { createTextPost, createPhotoPost } from "@/lib/facebookGraph";

export async function POST(req: NextRequest) {
  const session = (await cookies()).get(COOKIE_NAME)?.value;
  if (!isValidAdminSession(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const message = String(form.get("message") ?? "").trim();
  const image = form.get("image");

  if (!message) {
    return NextResponse.json({ error: "Post text is required" }, { status: 400 });
  }

  try {
    let postId: string;
    if (image instanceof File && image.size > 0) {
      const bytes = Buffer.from(await image.arrayBuffer());
      postId = await createPhotoPost(message, bytes, image.name);
    } else {
      postId = await createTextPost(message);
    }
    return NextResponse.json({ ok: true, postId });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Post failed" }, { status: 500 });
  }
}
