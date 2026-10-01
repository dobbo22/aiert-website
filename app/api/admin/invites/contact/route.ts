import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { isAdminRequest } from "@/lib/adminRequest";
import { ensureInviteSchema, normaliseFacebookUrl, normaliseLinkedinUrl } from "@/lib/tapcardInvites";

// Per-contact housekeeping from the Invites tab: mark do-not-contact, set
// their LinkedIn / Facebook profile, correct their email address, or delete (which also removes their sends and clicks, via ON DELETE CASCADE).
export async function POST(req: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = Number(body?.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "id required" }, { status: 400 });

  await ensureInviteSchema();
  if (body.action === "delete") {
    await sql`DELETE FROM tapcard_invite_contacts WHERE id = ${id}`;
  } else if (typeof body.doNotContact === "boolean") {
    await sql`UPDATE tapcard_invite_contacts SET do_not_contact = ${body.doNotContact} WHERE id = ${id}`;
  } else if (typeof body.email === "string") {
    // Only the address changes: the contact keeps its import key, so a later
    // iCloud re-import still finds this person (and, with email_edited, keeps
    // the corrected address).
    const email = body.email.trim().slice(0, 200);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "That email address doesn't look right" }, { status: 400 });
    }
    await sql`UPDATE tapcard_invite_contacts SET email = ${email}, email_edited = true WHERE id = ${id}`;
  } else if (typeof body.linkedinUrl === "string" || typeof body.facebookUrl === "string") {
    const linkedin = typeof body.linkedinUrl === "string" ? normaliseLinkedinUrl(body.linkedinUrl) : null;
    const facebook = typeof body.facebookUrl === "string" ? normaliseFacebookUrl(body.facebookUrl) : null;
    if ((linkedin === "" && body.linkedinUrl.trim()) || (facebook === "" && body.facebookUrl.trim())) {
      return NextResponse.json({ error: "That doesn't look like a LinkedIn / Facebook profile link" }, { status: 400 });
    }
    await sql`
      UPDATE tapcard_invite_contacts
      SET linkedin_url = COALESCE(${linkedin}, linkedin_url), facebook_url = COALESCE(${facebook}, facebook_url)
      WHERE id = ${id}
    `;
  } else {
    return NextResponse.json({ error: "Nothing to do" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
