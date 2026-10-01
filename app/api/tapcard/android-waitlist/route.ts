import { NextResponse } from "next/server";
import { INVITE_LINK_ORIGIN, joinAndroidWaitlist } from "@/lib/tapcardInvites";

// The form on the public /android-waitlist page.
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const ok = await joinAndroidWaitlist({ email: String(form?.get("email") ?? "") });
  return NextResponse.redirect(`${INVITE_LINK_ORIGIN}/android-waitlist?${ok ? "done=1" : "error=1"}`, 303);
}
