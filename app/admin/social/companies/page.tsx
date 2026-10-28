import { isAdminRequest } from "@/lib/adminRequest";
import { listCompaniesForSupport, recentSupportLog } from "@/lib/tapcardBizSupport";
import { CompanyTools, CreateCompany, RemoveManager } from "./Tools";

export const metadata = { title: "TapCard companies — Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const fmt = (d: string) => new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });

// TapCard for Business companies, for AIERT support. A company opens only while ITS OWN support-access window is open: the company turns
// it on in its Admins tab (7 days), or AIERT set the company up for it here (30 days). Support sessions last two hours, cannot touch
// billing, show a banner, and every entry is logged below.
export default async function CompaniesPage() {
  if (!(await isAdminRequest())) return null;
  let listError = "";
  const [companies, log] = await Promise.all([
    listCompaniesForSupport().catch((e: unknown) => { listError = e instanceof Error ? e.message : String(e); return []; }),
    recentSupportLog().catch(() => []),
  ]);
  const nameOf = new Map(companies.map((c) => [c.id, c.name]));
  return (
    <div className="text-cloud">
      <h2 style={{ fontWeight: 700, marginBottom: ".5rem" }}>Set a company up for them</h2>
      <CreateCompany />
      <h2 style={{ fontWeight: 700, margin: "1.5rem 0 .5rem" }}>Companies ({companies.length})</h2>
      {listError && <p style={{ color: "#fca5a5", fontSize: 14 }}>Couldn&apos;t load the companies: {listError}</p>}
      <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
        <thead><tr style={{ textAlign: "left", opacity: 0.8 }}>{["Company", "Plan", "Cards", "People", "Support access", "Actions"].map((h) => <th key={h} style={{ padding: "8px 14px 8px 0" }}>{h}</th>)}</tr></thead>
        <tbody>
          {companies.map((c) => {
            const open = !!c.support_access_until && new Date(c.support_access_until).getTime() > Date.now();
            return (
              <tr key={c.id} style={{ borderTop: "1px solid rgba(255,255,255,.15)" }}>
                <td style={{ padding: "10px 14px 10px 0", verticalAlign: "top" }}>{c.name || c.id}<br /><span style={{ opacity: .7 }}>{fmt(c.created_at)}</span></td>
                <td style={{ padding: "10px 14px 10px 0", verticalAlign: "top" }}>{c.seat_band === "trial" ? "Free trial" : c.seat_band === "locations" ? `${c.locations} locations` : c.seat_band || "-"}<br /><span style={{ opacity: .7 }}>{c.billing_status}</span></td>
                <td style={{ padding: "10px 14px 10px 0", verticalAlign: "top" }}>{c.cards}/{c.seat_limit}</td>
                <td style={{ padding: "10px 14px 10px 0", verticalAlign: "top", lineHeight: 1.9 }}>
                  {(c.people ?? []).map((p) => (
                    <div key={p.email}>{p.email} <span style={{ opacity: .7 }}>({p.role === "manager" ? "manager" : "admin"}{p.confirmed ? "" : ", not signed in yet"})</span>
                      {p.role === "manager" && open ? <RemoveManager orgId={c.id} email={p.email} /> : null}
                    </div>
                  ))}
                </td>
                <td style={{ padding: "10px 14px 10px 0", verticalAlign: "top" }}>{open ? `Open until ${fmt(c.support_access_until!)}` : "Not allowed"}</td>
                <td style={{ padding: "10px 14px 10px 0", verticalAlign: "top" }}><CompanyTools orgId={c.id} open={open} locations={c.locations || 3} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <h2 style={{ fontWeight: 700, margin: "1.5rem 0 .5rem" }}>Support log</h2>
      {log.length === 0 ? <p>Nothing yet.</p> : (
        <ul style={{ fontSize: 14 }}>
          {log.map((l, i) => <li key={i}>{fmt(l.at)}: {nameOf.get(l.org_id) ?? l.org_id}: {l.actor} {l.action}{l.detail ? ` (${l.detail})` : ""}</li>)}
        </ul>
      )}
    </div>
  );
}
