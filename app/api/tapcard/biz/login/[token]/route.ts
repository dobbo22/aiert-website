import { NextRequest, NextResponse } from "next/server";
import { consumeLoginToken, COOKIE_NAME, createSessionCookie } from "@/lib/tapcardBizAuth";

// The link an admin clicks from their magic-link email. Consumes the
// single-use token and, if valid, sets the session cookie and redirects
// into the admin dashboard — otherwise back to the login screen with an
// error so an expired/reused link fails clearly rather than silently.
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await consumeLoginToken(token);
  if (!result || !result.orgId) {
    return NextResponse.redirect(new URL("/business/admin?error=expired", req.url));
  }

  const response = NextResponse.redirect(new URL("/business/admin", req.url));
  response.cookies.set(COOKIE_NAME, createSessionCookie(result.orgId, result.email), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
  });
  return response;
}
