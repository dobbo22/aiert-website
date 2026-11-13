import { NextRequest, NextResponse } from "next/server";
import { getCard } from "@/lib/tapcardDb";
import { setFollower } from "@/lib/tapcardOffers";
import { setPushPrefs } from "@/lib/tapcardPush";
import { isListedCard, saveFollowerDetails, validateShare, withdrawFollowerDetails } from "@/lib/tapcardShare";

// A phone tells us it follows (or stopped following) a business card so the owner can see a plain
// number. `follower` is a random id the app keeps on the device; it is hashed, never listed or linked to a person.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { follower?: unknown; follow?: unknown; prefs?: { offers?: unknown; ending?: unknown; changes?: unknown; news?: unknown }; share?: unknown } | null;
  const follower = typeof body?.follower === "string" ? body.follower : "";
  if (follower.length < 16 || follower.length > 200) return NextResponse.json({ error: "follower is required" }, { status: 400 });
  if (!(await getCard(id))) return NextResponse.json({ error: "not found" }, { status: 404 });
  await setFollower(id, follower, body?.follow === true);
  const p = body?.prefs;
  await setPushPrefs(id, follower, body?.follow === true, p ? { offers: p.offers !== false, ending: p.ending !== false, changes: p.changes !== false, news: p.news !== false } : undefined).catch(() => {});
  // Listed-company cards only: the follower may choose, by tapping "Follow and share my details", to give the company a name and
  // email. `share: {name,email,phone?}` saves them; `share: null` (or unfollowing) removes them. Ordinary cards ignore it.
  const listed = await isListedCard(id);
  let shared = false;
  if (listed) {
    if (body?.follow !== true || (body && "share" in body && body.share === null)) {
      await withdrawFollowerDetails(id, follower);
    } else if (body?.share) {
      const v = validateShare(body.share);
      if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
      shared = await saveFollowerDetails(id, follower, v.details);
    }
  }
  return NextResponse.json({ ok: true, listedCompany: listed, shared });
}
