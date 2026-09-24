import { NextRequest, NextResponse } from "next/server";
import { getCard } from "@/lib/tapcardDb";

// Same no-auth model as the rest of TapCard's API (see cards/route.ts) — the
// unguessable id is the credential, and view/save counts carry no more
// sensitivity than the card fields already exposed at the public /c/[id] page.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getCard(id);
  if (!card) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ views: card.view_count, saves: card.save_count });
}
