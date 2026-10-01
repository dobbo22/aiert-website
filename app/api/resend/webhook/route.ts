import crypto from "crypto";
import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { ensureInviteSchema } from "@/lib/tapcardInvites";

// Resend delivery events for TapCard invite emails (delivered, bounced,
// opened, complained), matched to a send by Resend's email id. Set up in
// Resend → Webhooks with this URL; its signing secret goes in Vercel as
// RESEND_WEBHOOK_SECRET. Resend signs with Svix: HMAC-SHA256 over
// "<svix-id>.<svix-timestamp>.<body>", keyed with the base64 part of the
// "whsec_..." secret.
function verify(body: string, headers: Headers, secret: string): boolean {
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signatures = headers.get("svix-signature");
  if (!id || !timestamp || !signatures) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = crypto.createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest();
  return signatures.split(" ").some((entry) => {
    const sig = Buffer.from(entry.split(",")[1] ?? "", "base64");
    return sig.length === expected.length && crypto.timingSafeEqual(sig, expected);
  });
}

export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });

  const body = await req.text();
  if (!verify(body, req.headers, secret)) return NextResponse.json({ error: "Bad signature" }, { status: 401 });

  const event = JSON.parse(body) as { type?: string; data?: { email_id?: string } };
  const emailId = event.data?.email_id;
  if (!emailId) return NextResponse.json({ ok: true });

  await ensureInviteSchema();
  switch (event.type) {
    case "email.delivered":
      await sql`UPDATE tapcard_invite_sends SET delivered_at = COALESCE(delivered_at, now()) WHERE resend_id = ${emailId}`;
      break;
    case "email.opened":
      await sql`UPDATE tapcard_invite_sends SET opened_at = COALESCE(opened_at, now()) WHERE resend_id = ${emailId}`;
      break;
    case "email.bounced":
      await sql`UPDATE tapcard_invite_sends SET bounced_at = COALESCE(bounced_at, now()) WHERE resend_id = ${emailId}`;
      break;
    case "email.complained":
      // Marked as spam: never email them again.
      await sql`
        UPDATE tapcard_invite_contacts SET do_not_contact = true
        WHERE id = (SELECT contact_id FROM tapcard_invite_sends WHERE resend_id = ${emailId})
      `;
      break;
  }
  return NextResponse.json({ ok: true });
}
