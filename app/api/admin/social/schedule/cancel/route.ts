import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidAdminSession, COOKIE_NAME } from "@/lib/mailbroomAdminAuth";
import { cancelItem } from "@/lib/socialQueue";

export async function POST(req: NextRequest) {
  const session = (await cookies()).get(COOKIE_NAME)?.value;
  if (!isValidAdminSession(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = (await req.json().catch(() => ({}))) as { id?: number };
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await cancelItem(id as number);
  return NextResponse.json({ ok: true });
}
