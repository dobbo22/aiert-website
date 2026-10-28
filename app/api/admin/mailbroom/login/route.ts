import { NextRequest, NextResponse } from "next/server";
import { adminSessionToken, COOKIE_NAME, passwordMatches } from "@/lib/mailbroomAdminAuth";
import { rateLimited } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  // A handful of tries every ten minutes per address: the password cannot be guessed at speed.
  if (rateLimited(req, "admin-login", 8, 10 * 60_000)) return NextResponse.json({ error: "Too many attempts. Please wait a few minutes." }, { status: 429 });
  const { password } = await req.json().catch(() => ({}));
  if (!passwordMatches(password)) {
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
