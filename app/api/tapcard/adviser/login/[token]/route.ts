import { NextRequest, NextResponse } from "next/server";
import { ADVISER_COOKIE, advisersForEmail, consumeAdviserLoginToken, createAdviserCookie } from "@/lib/tapcardAdvisers";

// Same shape as the company admin link: opening it (GET) only shows a button, because email scanners open links before people do;
// pressing the button (POST) spends the single-use token.
export async function GET() {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Sign in — TapCard advisers</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0b0f19;color:#e8ecf3;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:16px}main{width:100%;max-width:380px}p.k{color:#4fd1c5;font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;margin:0}h1{font-size:26px;margin:6px 0 12px}button{width:100%;padding:14px;border:0;border-radius:12px;font-size:16px;font-weight:600;background:linear-gradient(90deg,#f5c451,#eaa43a);color:#111;cursor:pointer}</style></head>
<body><main><p class="k">TapCard advisers</p><h1>Sign in to the adviser portal</h1><form method="post"><button type="submit">Sign in</button></form></main></body></html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const email = await consumeAdviserLoginToken(token);
  if (!email || !(await advisersForEmail(email)).length) return NextResponse.redirect(new URL("/business/adviser?error=expired", req.url), 303);
  const res = NextResponse.redirect(new URL("/business/adviser", req.url), 303);
  res.cookies.set(ADVISER_COOKIE, createAdviserCookie(email), { httpOnly: true, secure: true, sameSite: "lax", maxAge: 30 * 24 * 60 * 60, path: "/" });
  return res;
}
