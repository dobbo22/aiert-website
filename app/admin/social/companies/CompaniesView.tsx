import { capFor } from "@/lib/providerCaps";
import type { SupportCompanyRow } from "@/lib/tapcardBizSupport";
import CompanyList, { type CompanyData } from "./CompanyList";
import CompaniesTabs from "./CompaniesTabs";
import { CreateCompany } from "./Tools";

const fmt = (d: string) => new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
const iso = (d: unknown) => (d ? new Date(d as string).toISOString() : null);

export default function CompaniesView({ companies, log, listError, nameOf, used, now }: {
  companies: SupportCompanyRow[]; log: { org_id: string; actor: string; action: string; detail: string; at: string }[]; listError: string;
  nameOf: Map<string, string>; used: (p: "apple" | "tomtom" | "here", period: "day" | "month") => number; now: number;
}) {
  const card = { background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.14)", borderRadius: 12, padding: 20 } as const;
  const heading = { fontWeight: 700, fontSize: 20, margin: "0 0 12px" } as const;
  const data: CompanyData[] = companies.map((c) => {
    const until = iso(c.support_access_until);
    return {
      id: c.id, name: c.name, createdAt: iso(c.created_at) ?? "", listed: !!c.listed, freeForLife: !!c.free_for_life, seatBand: c.seat_band, locations: c.locations, seatLimit: c.seat_limit,
      billingStatus: c.billing_status, cards: c.cards, supportUntil: until, supportOpen: !!until && new Date(until).getTime() > now, people: (c.people ?? []).map((p) => ({ email: p.email, role: p.role, confirmed: p.confirmed })),
    };
  });

  const companiesPane = (
    <div style={{ display: "grid", gap: 20 }}>
      <details style={card}>
        <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 16 }}>+ Set a company up for them</summary>
        <div style={{ marginTop: 14 }}><CreateCompany /></div>
      </details>
      <CompanyList companies={data} error={listError} />
    </div>
  );

  const logsPane = (
    <section style={card}>
      <h2 style={heading}>Support log</h2>
      {log.length === 0 ? <p style={{ margin: 0 }}>Nothing yet.</p> : (
        <ul style={{ fontSize: 14, margin: 0, paddingLeft: 20, display: "grid", gap: 6 }}>
          {log.map((l, i) => <li key={i}>{fmt(l.at)}: {nameOf.get(l.org_id) ?? l.org_id}: {l.actor} {l.action}{l.detail ? ` (${l.detail})` : ""}</li>)}
        </ul>
      )}
    </section>
  );

  const lookupsPane = (
    <section style={card}>
      <h2 style={heading}>Place lookups (free tiers)</h2>
      <ul style={{ fontSize: 14, margin: 0, paddingLeft: 20, display: "grid", gap: 6 }}>
        <li>Apple Maps: {used("apple", "day")} today of {capFor("apple", "day")} a day (Apple allows 25,000)</li>
        <li>TomTom: {used("tomtom", "day")} today of {capFor("tomtom", "day")} a day (free tier 2,500)</li>
        <li>HERE: {used("here", "month")} this month of {capFor("here", "month")} (free tier 250,000)</li>
      </ul>
    </section>
  );

  return (
    <div className="text-cloud">
      <CompaniesTabs panes={[
        { id: "companies", label: "Companies", count: data.length, node: companiesPane },
        { id: "logs", label: "Logs", count: log.length, node: logsPane },
        { id: "lookups", label: "Lookups", node: lookupsPane },
      ]} />
    </div>
  );
}
