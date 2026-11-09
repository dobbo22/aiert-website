import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidAdminSession, COOKIE_NAME } from "@/lib/mailbroomAdminAuth";
import { createTextPost, createPhotoPost } from "@/lib/facebookGraph";
import { createLinkedInPost, linkedinConfigured } from "@/lib/linkedinApi";

export async function POST(req: NextRequest) {
  const session = (await cookies()).get(COOKIE_NAME)?.value;
  if (!isValidAdminSession(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const message = String(form.get("message") ?? "").trim();
  const image = form.get("image");
  const alsoLinkedIn = form.get("alsoLinkedIn") === "on";

  if (!message) {
    return NextResponse.json({ error: "Post text is required" }, { status: 400 });
  }

  try {
    let postId: string;
    const bytes = image instanceof File && image.size > 0 ? Buffer.from(await image.arrayBuffer()) : null;
    if (bytes && image instanceof File) {
      postId = await createPhotoPost(message, bytes, image.name);
    } else {
      postId = await createTextPost(message);
    }

    // Cross-post to the AIERT LTD LinkedIn page. A LinkedIn failure must not hide that Facebook worked.
    let linkedin: { ok: true; url: string } | { ok: false; error: string } | undefined;
    if (alsoLinkedIn) {
      if (!linkedinConfigured()) {
        linkedin = { ok: false, error: "LinkedIn is not set up (LINKEDIN_ACCESS_TOKEN / LINKEDIN_ORG_URN)" };
      } else {
        try {
          const li = await createLinkedInPost(message, bytes ? { bytes } : undefined);
          linkedin = { ok: true, url: li.url };
        } catch (err) {
          linkedin = { ok: false, error: err instanceof Error ? err.message : "LinkedIn post failed" };
        }
      }
    }
    return NextResponse.json({ ok: true, postId, linkedin });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Post failed" }, { status: 500 });
  }
}
