import { NextRequest, NextResponse } from "next/server";
import { del, put } from "@vercel/blob";
import sql from "@/lib/db";
import { isAdminRequest } from "@/lib/adminRequest";
import { ensureInviteSchema } from "@/lib/tapcardInvites";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

// A real photo for a contact's invite card picture (e.g. dragged in from
// their LinkedIn profile on the Send tab) — takes priority over the company
// logo/initials in lib/inviteCardImage.tsx. Multipart, like TapCard's own
// card photo upload (app/api/tapcard/cards/[id]/route.ts).
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return NextResponse.json({ error: "id required" }, { status: 400 });

  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "photo is required" }, { status: 400 });
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: "photo must be a JPEG/PNG/WebP under 5 MB" }, { status: 400 });
  }

  await ensureInviteSchema();
  const existing = (await sql`SELECT photo_url FROM tapcard_invite_contacts WHERE id = ${id}`) as { photo_url: string }[];
  if (!existing.length) return NextResponse.json({ error: "not found" }, { status: 404 });

  const blob = await put(`tapcard-invites/${id}-${Date.now()}`, file, { access: "public" });
  await sql`UPDATE tapcard_invite_contacts SET photo_url = ${blob.url} WHERE id = ${id}`;
  // Each upload gets a new URL, so remove the photo it replaced.
  if (existing[0]!.photo_url) await del(existing[0]!.photo_url).catch(() => {});
  return NextResponse.json({ url: blob.url });
}

// Revert to the generated avatar (company logo / initials).
export async function DELETE(req: NextRequest) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return NextResponse.json({ error: "id required" }, { status: 400 });

  await ensureInviteSchema();
  const existing = (await sql`SELECT photo_url FROM tapcard_invite_contacts WHERE id = ${id}`) as { photo_url: string }[];
  if (!existing.length) return NextResponse.json({ error: "not found" }, { status: 404 });

  await sql`UPDATE tapcard_invite_contacts SET photo_url = '' WHERE id = ${id}`;
  if (existing[0]!.photo_url) await del(existing[0]!.photo_url).catch(() => {});
  return NextResponse.json({ ok: true });
}
