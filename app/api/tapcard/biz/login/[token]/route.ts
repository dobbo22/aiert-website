import { NextRequest, NextResponse } from "next/server";
import { consumeLoginToken, COOKIE_NAME, createSessionCookie } from "@/lib/tapcardBizAuth";

// The link an admin clicks from their magic-link email. Opening it (GET)
// only shows a "Sign in" button; pressing that (POST, back to this same
// URL) consumes the single-use token. Email link scanners — Microsoft 365
// Safe Links, Gmail, corporate gateways — fetch every link in a message
// before the person does, so a GET that consumed the token spent it before
// the admin ever clicked, and they landed on "expired". Scanners don't
// submit forms.
export async function GET() {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Sign in — TapCard for Business</title>
<style>
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
         background: #0b0f19; color: #e8ecf3; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 16px; }
  main { width: 100%; max-width: 380px; }
  p.kicker { color: #4fd1c5; font-size: 13px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; margin: 0; }
  h1 { font-size: 26px; margin: 6px 0 12px; }
  button { width: 100%; padding: 14px; border: 0; border-radius: 12px; font-size: 16px; font-weight: 600;
           background: linear-gradient(90deg, #f5c451, #eaa43a); color: #111; cursor: pointer; }
</style>
</head>
<body>
<main>
  <p class="kicker">TapCard for Business</p>
  <h1>Sign in to your admin</h1>
  <form method="post"><button type="submit">Sign in</button></form>
</main>
</body>
</html>`;
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}

// Consumes the token and, if valid, sets the session cookie and redirects
// into the admin dashboard — otherwise back to the login screen with an
// error so an expired/reused link fails clearly rather than silently.
// 303 so the browser follows with a GET.
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await consumeLoginToken(token);
  if (!result || !result.orgId) {
    return NextResponse.redirect(new URL("/business/admin?error=expired", req.url), 303);
  }

  const response = NextResponse.redirect(new URL("/business/admin", req.url), 303);
  response.cookies.set(COOKIE_NAME, createSessionCookie(result.orgId, result.email), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
  });
  return response;
}
