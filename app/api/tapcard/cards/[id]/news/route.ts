import { NextRequest, NextResponse } from "next/server";
import { getCard } from "@/lib/tapcardDb";
import { recentAnnouncements } from "@/lib/tapcardOffers";

// The card's recent news, newest first (public: what anyone with the card can see). For the apps' and the web page's news list.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await getCard(id))) return NextResponse.json({ error: "not found" }, { status: 404 });
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 20) || 20;
  return NextResponse.json({ items: await recentAnnouncements(id, limit) }, { headers: { "Cache-Control": "public, max-age=60" } });
}
