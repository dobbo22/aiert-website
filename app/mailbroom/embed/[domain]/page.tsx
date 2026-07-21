import type { Metadata } from "next";
import mailbroomSql from "@/lib/mailbroomDb";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "MailBroom Impact Badge",
  robots: { index: false, follow: false },
};

const CO2_TIERS = [
  { title: "Seedling", badge: "🌱", threshold: 0 },
  { title: "Sprout", badge: "🌿", threshold: 10 },
  { title: "Sapling", badge: "🪴", threshold: 100 },
  { title: "Tree", badge: "🌳", threshold: 1_000 },
  { title: "Grove", badge: "🌲", threshold: 10_000 },
  { title: "Forest", badge: "🌲🌲", threshold: 50_000 },
  { title: "Earth Hero", badge: "🌍", threshold: 100_000 },
];

function currentTier(grams: number) {
  return [...CO2_TIERS].reverse().find((t) => grams >= t.threshold) ?? CO2_TIERS[0];
}

function formatGrams(g: number): string {
  if (g >= 1_000_000) return `${(g / 1_000_000).toFixed(1)} t CO₂`;
  if (g >= 1_000) return `${(g / 1_000).toFixed(1)} kg CO₂`;
  return `${g.toFixed(g >= 1 ? 0 : 1)} g CO₂`;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${(bytes / 1_000).toFixed(1)} KB`;
}

// Only ever returns data for a domain whose org has explicitly opted in to
// the public leaderboard — the same publicLeaderboardOptIn flag gates both
// this widget and aiert.co.uk/mailbroom/leaderboard. companyName is shown;
// the domain itself is only ever used to fetch a favicon, never printed —
// same convention as the full leaderboard page.
async function getCompanyImpact(domain: string) {
  try {
    const rows = (await mailbroomSql`
      SELECT o."companyName" AS "companyName", COALESCE(SUM(ue.bytes), 0) AS bytes
      FROM "Organization" o
      LEFT JOIN "OrgMember" om ON om."organizationId" = o.id
      LEFT JOIN "UsageEvent" ue ON ue."userId" = om."userId" AND ue.action IN ('sweep_delete', 'sweep_unsubscribe')
      WHERE o.domain = ${domain} AND o."publicLeaderboardOptIn" = true AND o."companyName" IS NOT NULL
      GROUP BY o.id
    `) as { companyName: string; bytes: string }[];
    if (rows.length === 0) return null;
    return { companyName: rows[0].companyName, bytes: Number(rows[0].bytes) };
  } catch {
    return null;
  }
}

export default async function EmbedBadgePage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const impact = await getCompanyImpact(domain.toLowerCase());

  return (
    <>
      {/* This route is only ever meant to sit inside a customer's own <iframe>,
          so it overrides the site's dark body background with a transparent one. */}
      <style>{`html, body { background: transparent !important; margin: 0; }`}</style>
      <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
        {impact ? (
          <a
            href="https://business.mailbroom.app"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              padding: "16px 20px",
              maxWidth: "360px",
              borderRadius: "14px",
              border: "1px solid #E2E8F0",
              background: "#FFFFFF",
              textDecoration: "none",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ fontSize: "32px", lineHeight: 1 }}>
              {currentTier((impact.bytes / 1_000_000_000) * 0.233 * 1000).badge}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#0B0F1A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {impact.companyName}
              </p>
              <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#64748B" }}>
                {currentTier((impact.bytes / 1_000_000_000) * 0.233 * 1000).title} · MailBroom for Business
              </p>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 800, color: "#B45309" }}>
                {formatGrams((impact.bytes / 1_000_000_000) * 0.233 * 1000)}
              </p>
              <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#64748B" }}>{formatBytes(impact.bytes)} freed</p>
            </div>
          </a>
        ) : (
          <div
            style={{
              padding: "16px 20px",
              maxWidth: "360px",
              borderRadius: "14px",
              border: "1px dashed #CBD5E1",
              background: "#F8FAFC",
              fontSize: "12px",
              color: "#94A3B8",
              textAlign: "center",
            }}
          >
            Badge not available
          </div>
        )}
      </div>
    </>
  );
}
