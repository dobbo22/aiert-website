import { NextRequest, NextResponse } from "next/server";
import { logLinkClick } from "@/lib/linkClicks";
import { TRACKED_LINKS } from "@/lib/trackedLinks";

// Slugs must be allowlisted here — this endpoint is public (it has to be,
// it fires from anyone's browser before they land on an external site), so
// without this check anyone could write arbitrary rows into link_clicks.
const ALLOWED_SLUGS = new Set(Object.keys(TRACKED_LINKS));

export async function POST(req: NextRequest) {
  let slug: unknown;
  try {
    ({ slug } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (typeof slug !== "string" || !ALLOWED_SLUGS.has(slug)) {
    return NextResponse.json({ error: "Unknown slug" }, { status: 400 });
  }

  await logLinkClick(slug, req.headers);
  return NextResponse.json({ ok: true });
}
