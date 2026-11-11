import { NextResponse } from "next/server";
import { INVITE_LINK_ORIGIN } from "@/lib/tapcardInvites";
import { emailFromUnsubToken, recordAppUserUnsub } from "@/lib/appUserUnsub";

// POST: the email's one-click List-Unsubscribe header, or the button on /au/<token>. GET only shows the confirmation page,
// because link scanners in company mail systems open every link.
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const email = emailFromUnsubToken(token);
  if (!email) return NextResponse.json({ error: "Invalid link" }, { status: 400 });
  await recordAppUserUnsub(email, "link");
  if ((req.headers.get("content-type") ?? "").includes("form-urlencoded") && !(await req.text()).includes("List-Unsubscribe")) {
    return NextResponse.redirect(`${INVITE_LINK_ORIGIN}/au/${token}?done=1`, 303);
  }
  return NextResponse.json({ ok: true });
}

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return NextResponse.redirect(`${INVITE_LINK_ORIGIN}/au/${token}`, 303);
}
