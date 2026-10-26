import { NextResponse } from "next/server";
import { INVITE_LINK_ORIGIN } from "@/lib/tapcardInvites";
import { recordUnsubscribe } from "@/lib/marketing";

// POST: the email's one-click List-Unsubscribe header, or the button on /mku/<token>. GET only shows the confirmation page.
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await recordUnsubscribe(token).catch((e) => console.error("mk unsubscribe failed", e));
  if ((req.headers.get("content-type") ?? "").includes("form-urlencoded") && !(await req.text()).includes("List-Unsubscribe")) {
    return NextResponse.redirect(`${INVITE_LINK_ORIGIN}/mku/${token}?done=1`, 303);
  }
  return NextResponse.json({ ok: true });
}

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return NextResponse.redirect(`${INVITE_LINK_ORIGIN}/mku/${token}`, 303);
}
