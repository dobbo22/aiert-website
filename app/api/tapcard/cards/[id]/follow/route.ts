import { NextRequest, NextResponse } from "next/server";
import { getCard } from "@/lib/tapcardDb";
import { setFollower } from "@/lib/tapcardOffers";
import { setPushPrefs } from "@/lib/tapcardPush";

// A phone tells us it follows (or stopped following) a business card so the owner can see a plain
// number. `follower` is a random id the app keeps on the device; it is hashed, never listed or linked to a person.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { follower?: unknown; follow?: unknown; prefs?: { offers?: unknown; ending?: unknown; changes?: unknown; news?: unknown } } | null;
  const follower = typeof body?.follower === "string" ? body.follower : "";
  if (follower.length < 16 || follower.length > 200) return NextResponse.json({ error: "follower is required" }, { status: 400 });
  if (!(await getCard(id))) return NextResponse.json({ error: "not found" }, { status: 404 });
  await setFollower(id, follower, body?.follow === true);
  const p = body?.prefs;
  await setPushPrefs(id, follower, body?.follow === true, p ? { offers: p.offers !== false, ending: p.ending !== false, changes: p.changes !== false, news: p.news !== false } : undefined).catch(() => {});
  return NextResponse.json({ ok: true });
}
