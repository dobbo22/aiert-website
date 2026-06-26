import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { sendRsvpNotification, sendGuestConfirmation } from "@/lib/email";
import { guestCountForName } from "@/lib/guestCount";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { code, status, email, dietaryNotes, message, menuChoices } = body;

  if (typeof code !== "string" || !code) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }
  if (status !== "accepted" && status !== "declined") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const guestEmail = typeof email === "string" ? email.trim().slice(0, 320) : "";
  if (status === "accepted" && !EMAIL_RE.test(guestEmail)) {
    return NextResponse.json({ error: "A valid email is required to accept" }, { status: 400 });
  }

  const existing = await sql`SELECT name FROM anniversary_invitees WHERE code = ${code}`;
  if (existing.length === 0) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }
  const name = existing[0].name as string;
  const guests = status === "accepted" ? guestCountForName(name) : null;

  const notes = typeof dietaryNotes === "string" ? dietaryNotes.slice(0, 1000) : "";
  const msg = typeof message === "string" ? message.slice(0, 1000) : "";

  const ALLOWED_CHOICES = ["", "meat", "fish", "vegetarian"];
  const sanitizedMenuChoices =
    status === "accepted" && Array.isArray(menuChoices)
      ? menuChoices.slice(0, 10).map((m) => ({
          name: typeof m?.name === "string" ? m.name.slice(0, 100) : "",
          choice: ALLOWED_CHOICES.includes(m?.choice) ? m.choice : "",
          notes: typeof m?.notes === "string" ? m.notes.slice(0, 300) : "",
        }))
      : null;

  await sql`
    UPDATE anniversary_invitees
    SET
      rsvp_status = ${status},
      guest_count = ${guests},
      guest_email = ${guestEmail || null},
      dietary_notes = ${notes},
      message = ${msg},
      menu_choices = ${sanitizedMenuChoices ? JSON.stringify(sanitizedMenuChoices) : null},
      responded_at = now()
    WHERE code = ${code}
  `;

  try {
    await sendRsvpNotification({
      name,
      status,
      guestCount: guests ?? 0,
      dietaryNotes: notes,
      message: msg,
      menuChoices: sanitizedMenuChoices,
    });
  } catch (err) {
    console.error("Failed to send RSVP notification email:", err);
  }

  if (status === "accepted") {
    try {
      await sendGuestConfirmation({ name, email: guestEmail, menuChoices: sanitizedMenuChoices });
    } catch (err) {
      console.error("Failed to send guest confirmation email:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
