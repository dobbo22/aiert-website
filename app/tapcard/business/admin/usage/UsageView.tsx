import type { UsageReport } from "@/lib/tapcardUsage";

const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });

/// The usage report as tiles and a group table. Counts only: used by the company's admin and by the read-only link.
export default function UsageView({ r }: { r: UsageReport }) {
  const tile = (v: number | string, label: string, sub?: string) => (
    <div className="rounded-2xl bg-charcoal px-4 py-3 ring-1 ring-white/10">
      <div className="text-2xl font-black text-cloud">{v}</div>
      <div className="text-sm font-semibold text-cloud">{label}</div>
      {sub && <div className="text-sm text-cloud">{sub}</div>}
    </div>
  );
  const heading = "mt-8 mb-3 text-lg font-bold text-cloud";
  return (
    <div className="text-cloud">
      <p className="text-sm">As of {when(r.asOf)}. These are counts only: no names, emails or other details of anyone who follows or uses a card.</p>

      <h2 className={heading}>Cards</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tile(r.cards.issued, "Cards issued", `of ${r.cards.limit} included`)}
        {tile(r.cards.inUse, "Cards in use", "opened, saved or followed")}
        {tile(r.cards.locations, "Location cards")}
        {tile(r.cards.staff, "Staff cards")}
      </div>

      <h2 className={heading}>Followers and reach</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tile(r.followers.total, "Followers", `${r.followers.last30} new in the last 30 days`)}
        {tile(r.reach.qrScans, "QR scans")}
        {tile(r.reach.views, "Card views")}
        {tile(r.reach.saves, "Saves")}
        {tile(r.reach.installs, "Installs from your cards")}
      </div>

      <h2 className={heading}>Offers and news</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tile(r.offers.liveNow, "Offers live now")}
        {tile(r.offers.posted, "Offers posted")}
        {tile(r.offers.claims, "Offers claimed", `${r.offers.claimsLast30} in the last 30 days`)}
        {tile(r.offers.used, "Offers used")}
        {tile(r.news.posted, "News posted", `${r.news.postedLast30} in the last 30 days`)}
      </div>

      <h2 className={heading}>Groups</h2>
      {r.groups.length === 0 ? <p>No groups yet.</p> : (
        <table className="w-full max-w-xl text-left text-sm">
          <thead><tr className="border-b border-white/30"><th className="py-2 pr-4">Group</th><th className="py-2 pr-4">On cards</th><th className="py-2">Followers</th></tr></thead>
          <tbody>
            {r.groups.map((g) => (
              <tr key={g.label} className="border-b border-white/10"><td className="py-2 pr-4 font-semibold">#{g.label}</td><td className="py-2 pr-4">{g.cards}</td><td className="py-2">{g.followers}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
