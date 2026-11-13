import { CompanyTools, CreateCompany, LifeToggle, RemoveManager } from "./Tools";
import { capFor } from "@/lib/providerCaps";
import type { SupportCompanyRow } from "@/lib/tapcardBizSupport";

const fmt = (d: string) => new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });

export default function CompaniesView({ companies, log, listError, nameOf, used, now }: {
  companies: SupportCompanyRow[]; log: { org_id: string; actor: string; action: string; detail: string; at: string }[]; listError: string;
  nameOf: Map<string, string>; used: (p: "apple" | "tomtom" | "here", period: "day" | "month") => number; now: number;
}) {
  const card = { background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.14)", borderRadius: 16, padding: 20 } as const;
  const heading = { fontWeight: 700, fontSize: 20, margin: "0 0 12px" } as const;
  const pill = (bg: string) => ({ display: "inline-block", background: bg, color: "#111", fontWeight: 700, fontSize: 12, borderRadius: 999, padding: "3px 10px" }) as const;
  return (
    <div className="text-cloud" style={{ display: "grid", gap: 24 }}>
      <section style={card}>
        <h2 style={heading}>Set a company up for them</h2>
        <CreateCompany />
      </section>

      <section>
        <h2 style={{ ...heading, margin: "0 0 12px" }}>Companies ({companies.length})</h2>
        {listError && <p style={{ color: "#fca5a5", fontSize: 14 }}>Couldn&apos;t load the companies: {listError}</p>}
        <div style={{ display: "grid", gap: 16 }}>
          {companies.map((c) => {
            const open = !!c.support_access_until && new Date(c.support_access_until).getTime() > now;
            const plan = c.free_for_life ? "Free for life" : c.seat_band === "trial" ? "Free trial" : c.seat_band === "locations" ? `${c.locations} locations` : c.seat_band || "-";
            return (
              <article key={c.id} style={card}>
                <header style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ fontWeight: 800, fontSize: 18, margin: 0 }}>{c.name || c.id}</h3>
                    <p style={{ fontSize: 14, margin: "4px 0 0" }}>Created {fmt(c.created_at)}</p>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={pill("#5eead4")}>{plan}</span>
                    <span style={pill("#e2e8f0")}>{c.billing_status}</span>
                    <span style={pill(open ? "#86efac" : "#fca5a5")}>{open ? `Support access until ${fmt(c.support_access_until!)}` : "Support access not allowed"}</span>
                  </div>
                </header>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, margin: "16px 0" }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 14, margin: "0 0 6px" }}>Cards</p>
                    <p style={{ margin: 0, fontSize: 16 }}>{c.cards} of {c.seat_limit}</p>
                    <LifeToggle orgId={c.id} on={!!c.free_for_life} />
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 14, margin: "0 0 6px" }}>People</p>
                    {(c.people ?? []).length === 0 && <p style={{ margin: 0, fontSize: 14 }}>No one yet.</p>}
                    {(c.people ?? []).map((p) => (
                      <div key={p.email} style={{ fontSize: 14, margin: "0 0 6px" }}>
                        {p.email} <span style={{ fontWeight: 700 }}>({p.role === "manager" ? "manager" : "admin"}{p.confirmed ? "" : ", not signed in yet"})</span>
                        {p.role === "manager" && open ? <RemoveManager orgId={c.id} email={p.email} /> : null}
                      </div>
                    ))}
                  </div>
                </div>

                <CompanyTools orgId={c.id} open={open} locations={c.locations || 3} />
              </article>
            );
          })}
        </div>
      </section>

      <section style={card}>
        <h2 style={heading}>Place lookups (free tiers)</h2>
        <ul style={{ fontSize: 14, margin: 0, paddingLeft: 20, display: "grid", gap: 4 }}>
          <li>Apple Maps: {used("apple", "day")} today of {capFor("apple", "day")} a day (Apple allows 25,000)</li>
          <li>TomTom: {used("tomtom", "day")} today of {capFor("tomtom", "day")} a day (free tier 2,500)</li>
          <li>HERE: {used("here", "month")} this month of {capFor("here", "month")} (free tier 250,000)</li>
        </ul>
      </section>

      <section style={card}>
        <h2 style={heading}>Support log</h2>
        {log.length === 0 ? <p style={{ margin: 0 }}>Nothing yet.</p> : (
          <ul style={{ fontSize: 14, margin: 0, paddingLeft: 20, display: "grid", gap: 4 }}>
            {log.map((l, i) => <li key={i}>{fmt(l.at)}: {nameOf.get(l.org_id) ?? l.org_id}: {l.actor} {l.action}{l.detail ? ` (${l.detail})` : ""}</li>)}
          </ul>
        )}
      </section>
    </div>
  );
}
