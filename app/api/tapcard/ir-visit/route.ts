import { NextRequest, NextResponse } from "next/server";
import { rateLimited } from "@/lib/rateLimit";
import { recordIrVisit } from "@/lib/tapcardIrOutreach";

// What a reader of a personal investors link did on the page (opened, stayed, clicked a tab, played the video). Always answers 204, so a
// guessed code cannot be told apart from a real one. See lib/tapcardIrOutreach.ts for what is and is not kept.
export async function POST(req: NextRequest) {
  const done = new NextResponse(null, { status: 204 });
  if (rateLimited(req, "ir-visit", 120)) return done;
  const b = (await req.json().catch(() => null)) as { v?: unknown; kind?: unknown; detail?: unknown } | null;
  if (!b || typeof b.v !== "string" || typeof b.kind !== "string") return done;
  await recordIrVisit(b.v, b.kind, typeof b.detail === "string" ? b.detail : "", req.headers.get("user-agent")).catch(() => false);
  return done;
}
