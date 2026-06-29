import { NextRequest, NextResponse } from "next/server";
import { adminSessionToken, COOKIE_NAME } from "@/lib/mailbroomAdminAuth";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (typeof password !== "string" || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, adminSessionToken(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
