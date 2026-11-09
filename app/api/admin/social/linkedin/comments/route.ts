import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidAdminSession, COOKIE_NAME } from "@/lib/mailbroomAdminAuth";
import { listLinkedInComments, replyAsPage } from "@/lib/linkedinApi";

async function authorised() {
  const session = (await cookies()).get(COOKIE_NAME)?.value;
  return isValidAdminSession(session);
}

const POST_URN = /^urn:li:(share|ugcPost):\d+$/;

export async function GET(req: NextRequest) {
  if (!(await authorised())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const urn = req.nextUrl.searchParams.get("urn") ?? "";
  if (!POST_URN.test(urn)) return NextResponse.json({ error: "Invalid post" }, { status: 400 });
  try {
    return NextResponse.json({ comments: await listLinkedInComments(urn) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to load comments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await authorised())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { urn, text, parent } = (await req.json().catch(() => ({}))) as { urn?: string; text?: string; parent?: string };
  if (!urn || !POST_URN.test(urn)) return NextResponse.json({ error: "Invalid post" }, { status: 400 });
  try {
    await replyAsPage(urn, text ?? "", parent);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Reply failed" }, { status: 500 });
  }
}
