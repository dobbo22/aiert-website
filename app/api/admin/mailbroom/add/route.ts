import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { isValidAdminSession, COOKIE_NAME } from "@/lib/mailbroomAdminAuth";
import { hashReviewerEmail } from "@/lib/mailbroomReviewerHash";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requireAdmin() {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  return isValidAdminSession(session);
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const email = typeof body.email === "string" ? body.email.trim().slice(0, 320) : "";
  const label = typeof body.label === "string" ? body.label.trim().slice(0, 200) : null;

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const emailHash = hashReviewerEmail(email);

  try {
    await sql`
      INSERT INTO mailbroom_reviewers (email, email_hash, label)
      VALUES (${email.toLowerCase()}, ${emailHash}, ${label})
      ON CONFLICT (email) DO UPDATE SET label = EXCLUDED.label
    `;
  } catch {
    return NextResponse.json({ error: "Could not save reviewer" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
