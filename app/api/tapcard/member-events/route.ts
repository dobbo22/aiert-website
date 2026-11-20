import { NextRequest, NextResponse } from "next/server";
import { eventsAfter, orgForKey } from "@/lib/tapcardMemberLinks";
import { rateLimited } from "@/lib/rateLimit";

// A company collects its member-link events with its own key: GET /api/tapcard/member-events?after=<id of the last event you have>&limit=500
// (or ?since=<ISO time> for the first call). Oldest first; `next` is the cursor for the following call. Tokens only: no names or emails exist here.
export async function GET(req: NextRequest) {
  if (rateLimited(req, "member-events", 120, 60_000)) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const orgId = await orgForKey(req.headers.get("authorization"));
  if (!orgId) return NextResponse.json({ error: "A valid key is needed (Authorization: Bearer tcm_...)." }, { status: 401, headers: { "cache-control": "no-store" } });
  const u = new URL(req.url);
  const after = Math.max(0, Math.floor(Number(u.searchParams.get("after"))) || 0);
  const limit = Math.floor(Number(u.searchParams.get("limit"))) || 500;
  const r = await eventsAfter(orgId, after, limit, u.searchParams.get("since") ?? undefined);
  return NextResponse.json({ events: r.events, next: r.next }, { headers: { "cache-control": "no-store" } });
}
