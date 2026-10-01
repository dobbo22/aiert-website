import sql from "@/lib/db";

// Shared by every writer to link_clicks: /api/track-click (the MailBroom
// marketing redirects), /go/<slug> on tapcard.aiert.co.uk (promo links on
// TapCard card pages) and /api/promo-event (taps on the promos inside the
// TapCard apps). Only slugs in lib/trackedLinks.ts should ever be logged.

// Zeroes the host portion of an IP before it's ever stored, so what we keep
// (~/24 for IPv4, ~/64 for IPv6 — roughly ISP/city granularity) doesn't
// identify an individual and isn't personal data under UK GDPR. Do this
// here, not at read time — an unanonymized IP must never reach the DB.
export function anonymizeIp(ip: string | null): string | null {
  if (!ip) return null;
  if (ip.includes(":")) {
    const groups = ip.split(":");
    return groups.length >= 4 ? `${groups.slice(0, 4).join(":")}::` : null;
  }
  const octets = ip.split(".");
  return octets.length === 4 ? `${octets[0]}.${octets[1]}.${octets[2]}.0` : null;
}

let tableReady: Promise<unknown> | null = null;
function ensureTable(): Promise<unknown> {
  // Self-migrating: no separate deploy step needs prod DB access this way.
  tableReady ??= sql`
    CREATE TABLE IF NOT EXISTS link_clicks (
      id SERIAL PRIMARY KEY,
      slug TEXT NOT NULL,
      clicked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      country TEXT,
      ip_truncated TEXT,
      user_agent TEXT
    )
  `
    .then(() => sql`ALTER TABLE link_clicks ADD COLUMN IF NOT EXISTS country TEXT`)
    .then(() => sql`ALTER TABLE link_clicks ADD COLUMN IF NOT EXISTS ip_truncated TEXT`)
    .then(() => sql`ALTER TABLE link_clicks ADD COLUMN IF NOT EXISTS user_agent TEXT`)
    .catch((err) => {
      tableReady = null;
      throw err;
    });
  return tableReady;
}

export async function logLinkClick(slug: string, headers: Headers): Promise<void> {
  const rawIp = (headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
  await ensureTable();
  await sql`
    INSERT INTO link_clicks (slug, country, ip_truncated, user_agent)
    VALUES (${slug}, ${headers.get("x-vercel-ip-country") || null}, ${anonymizeIp(rawIp)}, ${headers.get("user-agent") || null})
  `;
}
