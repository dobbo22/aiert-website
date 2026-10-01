import { NextResponse } from "next/server";
import { INVITE_LINK_ORIGIN, getSendByToken, joinAndroidWaitlist } from "@/lib/tapcardInvites";

// The button on /w/<token>: signs up the person the invite was sent to.
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const send = await getSendByToken(token);
  if (!send) return NextResponse.redirect(`${INVITE_LINK_ORIGIN}/android-waitlist`, 303);
  const form = await req.formData().catch(() => null);
  const typed = String(form?.get("email") ?? "");
  const ok = await joinAndroidWaitlist({ email: typed || send.email, contactId: send.contact_id, sendId: send.id });
  return NextResponse.redirect(`${INVITE_LINK_ORIGIN}/w/${token}?${ok ? "done=1" : "error=1"}`, 303);
}

// GET only shows the page (see /w/<token> for why).
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return NextResponse.redirect(`${INVITE_LINK_ORIGIN}/w/${token}`, 303);
}
