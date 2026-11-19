import { NextRequest, NextResponse } from "next/server";
import { getCard } from "@/lib/tapcardDb";
import { authorizePoster } from "@/lib/tapcardPost";
import { addGroup, listGroups, listGroupsWithCounts, removeGroup } from "@/lib/tapcardGroups";

// The groups (#Kefi, #IPO Clients) of a card. GET is public and lists names only (the apps need the label when someone opens a
// group link). With the owner's edit key (or an admin allowed to post) GET also returns how many followers are in each.
// POST {name} adds one, DELETE {slug} removes it (followers keep following the card; only the label goes).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getCard(id);
  if (!card) return NextResponse.json({ error: "not found" }, { status: 404 });
  const who = req.headers.get("authorization") ? await authorizePoster(req, card) : null;
  return NextResponse.json({ groups: who?.ok ? await listGroupsWithCounts(id) : await listGroups(id) });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getCard(id);
  if (!card) return NextResponse.json({ error: "not found" }, { status: 404 });
  const who = await authorizePoster(req, card);
  if (!who.ok) return who.response;
  const body = (await req.json().catch(() => null)) as { name?: unknown } | null;
  const r = await addGroup(id, body?.name);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true, group: r.group, groups: await listGroupsWithCounts(id) });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getCard(id);
  if (!card) return NextResponse.json({ error: "not found" }, { status: 404 });
  const who = await authorizePoster(req, card);
  if (!who.ok) return who.response;
  const body = (await req.json().catch(() => null)) as { slug?: unknown } | null;
  if (typeof body?.slug !== "string" || !body.slug) return NextResponse.json({ error: "slug is required" }, { status: 400 });
  await removeGroup(id, body.slug);
  return NextResponse.json({ ok: true, groups: await listGroupsWithCounts(id) });
}
