import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { deleteCard, getCard, updateCard } from "@/lib/tapcardDb";
import { canEdit, readEditToken } from "@/lib/tapcardAuth";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

// "Stop sharing" — the delete/revoke control called for in the plan's
// privacy section. Once deleted, the id 404s everywhere (public page,
// vCard download, Wallet pass) until the app re-shares and gets a fresh id.
// Needs the card's edit token (lib/tapcardAuth.ts) — the id alone is public.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await getCard(id);
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!(await canEdit(existing, readEditToken(req)))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  await deleteCard(id);
  return NextResponse.json({ ok: true });
}

// Photo upload for an existing card. Kept as its own endpoint (multipart)
// rather than folded into the JSON POST /api/tapcard/cards route, since a
// photo is optional and separately-sized from the rest of the fields.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await getCard(id);
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!(await canEdit(existing, readEditToken(req)))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "photo is required" }, { status: 400 });
  }
  if (!["image/jpeg", "image/png", "image/heic"].includes(file.type) || file.size > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: "photo must be a JPEG/PNG/HEIC under 5 MB" }, { status: 400 });
  }

  const blob = await put(`tapcard/${id}-${Date.now()}`, file, { access: "public" });
  await updateCard(id, { ...existing, photo_url: blob.url });
  return NextResponse.json({ url: blob.url });
}
