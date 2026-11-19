import { adviserOverview } from "@/lib/tapcardAdviserAdmin";
import { ADVISER_TERMS_VERSION, poundsPerMonth } from "@/lib/tapcardAdviserPricing";
import { CreateAdviser, ExtendTrial, StaffEditor, TierSet } from "./AdvisersAdmin";

export const metadata = { title: "Advisers — Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" }) : "–");
const cell = { padding: "6px 10px", textAlign: "left" as const, verticalAlign: "top" as const };
const STATUS: Record<string, { text: string; colour: string }> = {
  trial: { text: "Free trial", colour: "#FBBF24" }, active: { text: "Paying", colour: "#4ade80" }, past_due: { text: "Payment failed", colour: "#fca5a5" }, canceled: { text: "Cancelled", colour: "#fca5a5" },
};
const COVER: Record<string, string> = { none: "Not covering", active: "Paying for it", ending: "Ending", ended: "Cover ended" };
const box = { border: "1px solid rgba(255,255,255,.2)", borderRadius: 12, padding: "12px 16px" } as const;

// AIERT's overview of advisers (IR firms and brokers): set them up, confirm each company's price band, see who pays for what.
export default async function AdvisersPage() {
  const o = await adviserOverview();
  const t = o.totals;
  return (
    <div>
      <p style={{ maxWidth: 780 }}>Advisers pay AIERT for the investor-relations companies they look after (price by company market cap), separately from TapCard for Business. Each company approves its adviser itself. AIERT confirms the price band, because we hold no market data.</p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "14px 0" }}>
        {[["Advisers", String(t.advisers)], ["Paying", String(t.active)], ["On trial", String(t.trial)], ["Companies paid for", String(t.covered)], ["Monthly, ex VAT", poundsPerMonth(t.mrrPence)], ["Bands to confirm", String(t.tiersToCheck)]].map(([k, v]) => (
          <div key={k} style={{ ...box, minWidth: 130, borderColor: k === "Bands to confirm" && t.tiersToCheck > 0 ? "#FBBF24" : undefined }}><div style={{ fontSize: 13, opacity: 0.85 }}>{k}</div><div style={{ fontSize: 24, fontWeight: 800 }}>{v}</div></div>
        ))}
      </div>
      <p style={{ fontSize: 13, opacity: 0.85, marginTop: -4 }}>Monthly counts advisers who are paying now. Terms version in force: {ADVISER_TERMS_VERSION}.</p>

      <h2 style={{ fontSize: 18, margin: "18px 0 8px" }}>Set up an adviser</h2>
      <CreateAdviser />

      <h2 style={{ fontSize: 18, margin: "18px 0 8px" }}>Advisers</h2>
      {o.advisers.length === 0 ? <p>None yet.</p> : (
        <div style={{ display: "grid", gap: 10 }}>
          {o.advisers.map((a, i) => {
            const s = STATUS[a.billingStatus] ?? { text: a.billingStatus, colour: "#cbd5e1" };
            return (
              <details key={a.id} open={i === 0 || a.tiersToCheck > 0} style={box}>
                <summary style={{ cursor: "pointer", display: "flex", flexWrap: "wrap", gap: "4px 14px", alignItems: "baseline" }}>
                  <strong style={{ fontSize: 17 }}>{a.name}</strong>
                  <span style={{ color: s.colour, fontWeight: 700 }}>{s.text}</span>
                  <span>{a.coveredCount} {a.coveredCount === 1 ? "company" : "companies"} paid for · {poundsPerMonth(a.monthlyPence)} a month</span>
                  {a.tiersToCheck > 0 && <span style={{ color: "#FBBF24", fontWeight: 700 }}>{a.tiersToCheck} band{a.tiersToCheck === 1 ? "" : "s"} to confirm</span>}
                </summary>
                <div style={{ marginTop: 10, display: "grid", gap: 12 }}>
                  <div style={{ fontSize: 14 }}>
                    {a.billingStatus === "trial" && <>Trial company: {a.trialOrgName ?? "none yet (starts when a company accepts their payment)"}{a.trialEndsAt ? ` · ends ${day(a.trialEndsAt)}` : ""} · <ExtendTrial adviserId={a.id} /><br /></>}
                    {a.billingStatus !== "trial" && <>Paid through {day(a.paidThrough)} · {a.stripeSubscription ? `subscription ${a.stripeSubscription}` : "no subscription"}<br /></>}
                    Terms: {a.termsAcceptedAt ? `accepted ${day(a.termsAcceptedAt)} by ${a.termsAcceptedBy} (${a.termsVersion})` : "not yet accepted"} · set up {day(a.createdAt)}
                  </div>
                  <div><strong>Staff</strong><StaffEditor adviserId={a.id} users={a.users} /></div>
                  <div style={{ overflowX: "auto" }}>
                    <strong>Companies</strong>
                    {a.links.length === 0 ? <p style={{ margin: "6px 0" }}>No company has been asked yet.</p> : (
                      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 4 }}>
                        <thead><tr style={{ borderBottom: "1px solid rgba(255,255,255,.25)" }}>{["Company", "Access", "Cover", "Stated market cap", "Price band", "Monthly", "Minimum term to"].map((h) => <th key={h} style={cell}>{h}</th>)}</tr></thead>
                        <tbody>
                          {a.links.map((l) => (
                            <tr key={l.linkId} style={{ borderBottom: "1px solid rgba(255,255,255,.12)" }}>
                              <td style={cell}><strong>{l.orgName}</strong><br /><span style={{ fontSize: 13, opacity: 0.8 }}>asked by {l.requestedBy}, {day(l.requestedAt)}</span></td>
                              <td style={cell}>{l.status}{l.canRegulatory ? " · may post regulatory" : ""}</td>
                              <td style={cell}>{COVER[l.coverStatus] ?? l.coverStatus}{l.coverEndsAt ? ` (to ${day(l.coverEndsAt)})` : ""}</td>
                              <td style={cell}>{l.capStatedM === null ? "–" : `£${l.capStatedM}m`}{l.suggestedTier ? <><br /><span style={{ fontSize: 13, opacity: 0.8 }}>suggests band {l.suggestedTier}</span></> : null}</td>
                              <td style={cell}><TierSet linkId={l.linkId} tier={l.tier} suggested={l.suggestedTier} confirmed={l.tierConfirmed} /></td>
                              <td style={cell}>{l.monthlyPence ? poundsPerMonth(l.monthlyPence) : "–"}</td>
                              <td style={cell}>{day(l.committedUntil)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}

      <h2 style={{ fontSize: 18, margin: "22px 0 8px" }}>Who pays for each investor-relations company</h2>
      {o.whoPays.length === 0 ? <p>No investor-relations companies yet.</p> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ borderBottom: "1px solid rgba(255,255,255,.25)" }}>{["Company", "Paid by", "Detail"].map((h) => <th key={h} style={cell}>{h}</th>)}</tr></thead>
            <tbody>{o.whoPays.map((w) => <tr key={w.orgId} style={{ borderBottom: "1px solid rgba(255,255,255,.12)" }}><td style={cell}><strong>{w.orgName}</strong></td><td style={cell}>{w.payer}</td><td style={cell}>{w.detail}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
