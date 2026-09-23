import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { deleteCard, getCard, updateCard } from "@/lib/tapcardDb";

// "Stop sharing" — the delete/revoke control called for in the plan's
// privacy section. Once deleted, the id 404s everywhere (public page,
// vCard download, Wallet pass) until the app re-shares and gets a fresh id.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deleted = await deleteCard(id);
  if (!deleted) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

// Photo upload for an existing card. Kept as its own endpoint (multipart)
// rather than folded into the JSON POST /api/tapcard/cards route, since a
// photo is optional and separately-sized from the rest of the fields.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await getCard(id);
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "photo is required" }, { status: 400 });
  }

  const blob = await put(`tapcard/${id}-${Date.now()}`, file, { access: "public" });
  await updateCard(id, { ...existing, photo_url: blob.url });
  return NextResponse.json({ url: blob.url });
}
