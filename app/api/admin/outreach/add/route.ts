import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { isValidAdminSession, COOKIE_NAME } from "@/lib/mailbroomAdminAuth";

async function requireAdmin() {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  return isValidAdminSession(session);
}

function str(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, max);
  return trimmed || null;
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const name = str(body.name, 200);
  const platform = str(body.platform, 100);
  const contact = str(body.contact, 200);
  const reach = str(body.reach, 300);
  const contentFocus = str(body.contentFocus, 500);
  const status = str(body.status, 100) ?? "Not sent";

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS mailbroom_influencer_outreach (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        platform TEXT,
        contact TEXT,
        reach TEXT,
        content_focus TEXT,
        status TEXT NOT NULL DEFAULT 'Not sent',
        notes TEXT,
        sent_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

    await sql`
      INSERT INTO mailbroom_influencer_outreach (name, platform, contact, reach, content_focus, status, sent_at)
      VALUES (${name}, ${platform}, ${contact}, ${reach}, ${contentFocus}, ${status}, now())
    `;
  } catch {
    return NextResponse.json({ error: "Could not save contact" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
