import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { TRACKED_LINKS } from "@/lib/trackedLinks";

// Slugs must be allowlisted here — this endpoint is public (it has to be,
// it fires from anyone's browser before they land on an external site), so
// without this check anyone could write arbitrary rows into link_clicks.
const ALLOWED_SLUGS = new Set(Object.keys(TRACKED_LINKS));

// Zeroes the host portion of an IP before it's ever stored, so what we keep
// (~/24 for IPv4, ~/64 for IPv6 — roughly ISP/city granularity) doesn't
// identify an individual and isn't personal data under UK GDPR. Do this
// here, not at read time — an unanonymized IP must never reach the DB.
function anonymizeIp(ip: string | null): string | null {
  if (!ip) return null;
  if (ip.includes(":")) {
    const groups = ip.split(":");
    return groups.length >= 4 ? `${groups.slice(0, 4).join(":")}::` : null;
  }
  const octets = ip.split(".");
  return octets.length === 4 ? `${octets[0]}.${octets[1]}.${octets[2]}.0` : null;
}

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

  const rawIp = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
  const anonymizedIp = anonymizeIp(rawIp);
  const country = req.headers.get("x-vercel-ip-country") || null;
  const userAgent = req.headers.get("user-agent") || null;

  // Self-migrating: no separate deploy step needs prod DB access this way.
  // IF NOT EXISTS makes repeating this on every request cheap and safe.
  await sql`
    CREATE TABLE IF NOT EXISTS link_clicks (
      id SERIAL PRIMARY KEY,
      slug TEXT NOT NULL,
      clicked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      country TEXT,
      ip_truncated TEXT,
      user_agent TEXT
    )
  `;
  await sql`ALTER TABLE link_clicks ADD COLUMN IF NOT EXISTS country TEXT`;
  await sql`ALTER TABLE link_clicks ADD COLUMN IF NOT EXISTS ip_truncated TEXT`;
  await sql`ALTER TABLE link_clicks ADD COLUMN IF NOT EXISTS user_agent TEXT`;

  await sql`
    INSERT INTO link_clicks (slug, country, ip_truncated, user_agent)
    VALUES (${slug}, ${country}, ${anonymizedIp}, ${userAgent})
  `;

  return NextResponse.json({ ok: true });
}
