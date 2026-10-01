import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { INVITE_LINK_ORIGIN, ensureInviteSchema } from "@/lib/tapcardInvites";

async function unsubscribe(token: string) {
  await ensureInviteSchema();
  await sql`
    UPDATE tapcard_invite_contacts SET do_not_contact = true
    WHERE id = (SELECT contact_id FROM tapcard_invite_sends WHERE token = ${token})
  `;
}

// POST: the email's List-Unsubscribe one-click header (Gmail/Apple Mail's
// own "Unsubscribe" button), or the button on /u/<token>.
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await unsubscribe(token);
  // The /u/ page's form expects to land back on a confirmation; one-click
  // senders just need a 2xx.
  if ((req.headers.get("content-type") ?? "").includes("form-urlencoded") && !(await req.text()).includes("List-Unsubscribe")) {
    return NextResponse.redirect(`${INVITE_LINK_ORIGIN}/u/${token}?done=1`, 303);
  }
  return NextResponse.json({ ok: true });
}

// GET only shows the confirmation page — link scanners in corporate mail
// systems open every link, and that mustn't unsubscribe anyone.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return NextResponse.redirect(`${INVITE_LINK_ORIGIN}/u/${token}`, 303);
}
