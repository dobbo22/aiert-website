import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isValidAdminSession, COOKIE_NAME } from "@/lib/mailbroomAdminAuth";
import { sendMailbroomEmail } from "@/lib/mailbroomGraphMail";

async function requireAdmin() {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  return isValidAdminSession(session);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Converts simple [text](url) markdown links to <a> tags and preserves line
// breaks, matching the format the outreach drafts have been written in.
function toHtml(text: string): string {
  const withLinks = escapeHtml(text).replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_m, label, url) => `<a href="${url}">${label}</a>`
  );
  return withLinks.replace(/\n/g, "<br>");
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const to = typeof body.to === "string" ? body.to.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const message = typeof body.message === "string" ? body.message : "";

  if (!to || !subject || !message) {
    return NextResponse.json({ error: "to, subject, and message are required" }, { status: 400 });
  }

  try {
    await sendMailbroomEmail({ to, subject, bodyHtml: toHtml(message) });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Send failed" }, { status: 500 });
  }
}
