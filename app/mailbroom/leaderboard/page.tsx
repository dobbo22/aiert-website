import type { Metadata } from "next";
import mailbroomSql from "@/lib/mailbroomDb";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "MailBroom for Business – Company Leaderboard | AIERT Ltd",
  description: "See how companies using MailBroom for Business rank on CO₂ and mailbox storage saved — opt-in only, real company names.",
  metadataBase: new URL("https://aiert.co.uk"),
};

// Same 7-tier CO2 award system as the mailbroom-web app (lib/co2-tiers.ts) —
// duplicated here (not imported) since this is a separate repo/deployment,
// but thresholds/badges must stay in sync so a company's badge matches
// whether viewed internally or on this public page.
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
  if (g >= 1_000_000) return `${(g / 1_000_000).toFixed(1)} t`;
  if (g >= 1_000) return `${(g / 1_000).toFixed(1)} kg`;
  return `${g.toFixed(g >= 1 ? 0 : 1)} g`;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${(bytes / 1_000).toFixed(1)} KB`;
}

interface RankedCompany {
  companyName: string;
  domain: string;
  bytes: number;
}

// Only opted-in companies are ever returned — see the publicLeaderboardOptIn
// toggle on the company's own Admin page in mailbroom-web. No per-employee
// data is ever exposed here. Domain is used only to fetch a favicon (via
// Google's public favicon service below) — never printed as text — for a
// company that has already agreed to publish its name publicly.
async function getCompanyLeaderboard(): Promise<RankedCompany[]> {
  try {
    const rows = (await mailbroomSql`
      SELECT o."companyName" AS "companyName", o.domain AS domain, COALESCE(SUM(ue.bytes), 0) AS bytes
      FROM "Organization" o
      JOIN "OrgMember" om ON om."organizationId" = o.id
      JOIN "UsageEvent" ue ON ue."userId" = om."userId" AND ue.action IN ('sweep_delete', 'sweep_unsubscribe')
      WHERE o."publicLeaderboardOptIn" = true AND o."companyName" IS NOT NULL
      GROUP BY o.id
      ORDER BY bytes DESC
      LIMIT 20
    `) as { companyName: string; domain: string; bytes: string }[];
    return rows.map((r) => ({ companyName: r.companyName, domain: r.domain, bytes: Number(r.bytes) }));
  } catch {
    return [];
  }
}

export default async function MailBroomLeaderboardPage() {
  const companies = await getCompanyLeaderboard();

  return (
    <div className="min-h-screen hero-gradient grid-bg">
      <nav className="nav-glass sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between">
          <a href="/" className="flex items-center gap-4">
            <div className="nav-logo-icon w-11 h-11 rounded-lg flex items-center justify-center font-black text-base">
              AI
            </div>
            <span className="font-bold text-2xl tracking-tight text-cloud">
              AIERT<span className="text-sm font-normal ml-1 text-mist">Ltd</span>
            </span>
          </a>
          <div className="hidden md:flex items-center gap-10 text-base text-mist">
            <a href="/mailbroom/webapp" className="hover:text-white transition-colors font-medium">MailBroom for Business</a>
            <a href="/mailbroom" className="hover:text-white transition-colors font-medium">MailBroom for iOS</a>
          </div>
          <a href="https://app.mailbroom.app" className="btn-gold px-6 py-3 rounded-full text-base hidden md:block">
            Sign in
          </a>
        </div>
      </nav>

      <section className="max-w-4xl mx-auto px-6 pt-20 pb-24">
        <div className="text-center mb-14">
          <div className="badge-live inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-gold animate-pulse inline-block" />
            MailBroom for Business
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-cloud mb-4">
            Company <span className="gold-text">leaderboard</span>
          </h1>
          <p className="text-mist max-w-xl mx-auto leading-relaxed">
            Companies using MailBroom for Business, ranked by CO₂ and storage saved. Appearing
            here is entirely opt-in — every company below chose to share their name and savings publicly.
          </p>
        </div>

        {companies.length === 0 ? (
          <div className="card-glass rounded-2xl p-10 text-center max-w-lg mx-auto">
            <p className="text-cloud font-semibold">No companies have opted in yet</p>
            <p className="text-mist text-sm mt-2">
              Using MailBroom for Business? Opt in from your{" "}
              <a href="https://app.mailbroom.app/billing" className="text-gold hover:underline">Billing page</a>{" "}
              to be the first on the leaderboard.
            </p>
          </div>
        ) : (
          <div className="card-glass rounded-3xl overflow-hidden max-w-2xl mx-auto divide-y divide-white/10">
            {companies.map((c, i) => {
              const co2Grams = (c.bytes / 1_000_000_000) * 0.233 * 1000;
              const tier = currentTier(co2Grams);
              return (
                <div key={c.companyName} className="flex items-center gap-4 px-6 py-4">
                  <div className="w-6 text-center text-sm font-bold text-mist shrink-0">{i + 1}</div>
                  <div className="w-9 h-9 rounded-lg bg-white shrink-0 flex items-center justify-center overflow-hidden shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(c.domain)}&sz=64`}
                      alt=""
                      width={36}
                      height={36}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="text-2xl shrink-0">{tier.badge}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-cloud font-semibold truncate">{c.companyName}</p>
                    <p className="text-xs text-mist">{tier.title}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold gold-text">{formatGrams(co2Grams)}</p>
                    <p className="text-xs text-mist">{formatBytes(c.bytes)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center text-xs text-mist mt-10">
          Want your company here? Opt in from the{" "}
          <a href="https://app.mailbroom.app/billing" className="text-gold hover:underline">Billing page</a>{" "}
          in MailBroom for Business — once you have, you can also embed your own badge on your
          company&apos;s website, straight from the same page.
        </p>
      </section>

      <footer className="footer-wrap">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="nav-logo-icon w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs">
                AI
              </div>
              <div>
                <div className="font-bold text-cloud">AIERT Ltd</div>
                <div className="text-xs text-mist">Registered in England &amp; Wales · No. 16587000</div>
              </div>
            </div>
            <div className="flex gap-6 text-sm text-mist flex-wrap justify-center">
              <a href="/mailbroom/webapp" className="hover:text-white transition-colors">MailBroom for Business</a>
              <a href="/mailbroom" className="hover:text-white transition-colors">MailBroom for iOS</a>
              <a href="/" className="hover:text-white transition-colors">AIERT Home</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
