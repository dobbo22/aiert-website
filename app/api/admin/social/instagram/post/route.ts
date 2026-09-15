import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidAdminSession, COOKIE_NAME } from "@/lib/mailbroomAdminAuth";
import { createMediaContainer, publishMediaContainer } from "@/lib/instagramGraph";

export async function POST(req: NextRequest) {
  const session = (await cookies()).get(COOKIE_NAME)?.value;
  if (!isValidAdminSession(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { caption, imageUrl } = await req.json();
  if (!caption || !imageUrl) {
    return NextResponse.json({ error: "caption and imageUrl are required" }, { status: 400 });
  }

  try {
    const containerId = await createMediaContainer(caption, imageUrl);
    const postId = await publishMediaContainer(containerId);
    return NextResponse.json({ ok: true, postId });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Post failed" }, { status: 500 });
  }
}
