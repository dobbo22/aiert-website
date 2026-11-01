import { isAdminRequest } from "@/lib/adminRequest";
import { weeklyNumbers } from "@/lib/weeklyNumbers";

export const metadata = { title: "Weekly numbers — Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const cell: React.CSSProperties = { padding: "6px 12px", textAlign: "right" };
const left: React.CSSProperties = { ...cell, textAlign: "left" };
const row: React.CSSProperties = { borderTop: "1px solid rgba(255,255,255,.1)" };
const h2: React.CSSProperties = { margin: "2rem 0 .5rem", fontSize: "1.1rem", fontWeight: 600 };

export default async function NumbersPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  if (!(await isAdminRequest())) return null;
  const days = Math.min(365, Math.max(1, Number((await searchParams).days) || 7));
  const d = await weeklyNumbers(days);
  const t = d.totals;
  const tiles: [string, number][] = [
    ["Cards", t.cards], [`New cards (${days}d)`, t.newCards], ["Card page views", t.views], ["…from a QR code", t.qr],
    ["Saved to contacts", t.saves], ["Followers", t.followers], ["Installs from a card", t.installs], ["Offers claimed", t.claims], ["Offers used", t.used],
  ];
  return (
    <div className="text-cloud">
      <p style={{ marginBottom: "1rem" }}>
        Everything on one page. Funnel, link and mailshot figures cover the last {days} days (<a href="?days=7" className="underline">7</a> · <a href="?days=30" className="underline">30</a> · <a href="?days=90" className="underline">90</a>); card figures are all-time totals.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {tiles.map(([k, v]) => (
          <div key={k} style={{ border: "1px solid rgba(255,255,255,.15)", borderRadius: 8, padding: "10px 16px", minWidth: 130 }}>
            <div style={{ fontSize: "1.6rem", fontWeight: 700 }}>{v}</div><div>{k}</div>
          </div>
        ))}
      </div>

      <h2 style={h2}>Businesses</h2>
      {!d.cards ? <p>Not available.</p> : d.cards.length === 0 ? <p>No business cards yet.</p> : (
        <div style={{ overflowX: "auto" }}><table style={{ borderCollapse: "collapse" }}>
          <thead><tr><th style={left}>Business</th><th style={cell}>Views</th><th style={cell}>QR</th><th style={cell}>Saves</th><th style={cell}>Followers</th><th style={cell}>Installs</th><th style={cell}>Claimed</th><th style={cell}>Used</th><th style={cell}>Created</th></tr></thead>
          <tbody>{d.cards.map((c) => (
            <tr key={c.id} style={row}>
              <td style={left}><a className="underline" href={`https://tapcard.aiert.co.uk/c/${c.id}`}>{c.company || c.name || c.id}</a></td>
              <td style={cell}>{c.views}</td><td style={cell}>{c.qr}</td><td style={cell}>{c.saves}</td><td style={cell}>{c.followers}</td>
              <td style={cell}>{c.installs}</td><td style={cell}>{c.claims}</td><td style={cell}>{c.used}</td><td style={cell}>{c.created}</td>
            </tr>))}</tbody>
        </table></div>
      )}

      <h2 style={h2}>Setup funnel ({days} days)</h2>
      {!d.funnel ? <p>Not available.</p> : d.funnel.length === 0 ? <p>No events yet. <a className="underline" href="/admin/social/funnel">Full funnel</a></p> : (
        <table style={{ borderCollapse: "collapse" }}><tbody>{d.funnel.map((f) => (
          <tr key={f.step} style={row}><td style={left}>{f.step.replace(/_/g, " ")}</td><td style={cell}><strong>{f.n}</strong></td></tr>))}
        </tbody></table>
      )}

      <h2 style={h2}>Link clicks ({days} days) — includes the referral link</h2>
      {!d.links ? <p>Not available.</p> : d.links.length === 0 ? <p>No clicks.</p> : (
        <table style={{ borderCollapse: "collapse" }}><tbody>{d.links.map((l) => (
          <tr key={l.slug} style={row}><td style={left}>{l.label}</td><td style={cell}><strong>{l.n}</strong></td></tr>))}
        </tbody></table>
      )}

      <h2 style={h2}>Mailshots</h2>
      {!d.mailshots ? <p>Not available.</p> : d.mailshots.length === 0 ? <p>No mailshots.</p> : (
        <div style={{ overflowX: "auto" }}><table style={{ borderCollapse: "collapse" }}>
          <thead><tr><th style={left}>Campaign</th><th style={cell}>Sent</th><th style={cell}>Delivered</th><th style={cell}>Bounced</th><th style={cell}>Opened preview</th><th style={cell}>Clicked</th><th style={cell}>App link</th><th style={cell}>Unsubscribed</th><th style={cell}>Queued</th></tr></thead>
          <tbody>{d.mailshots.map(({ campaign, stats: s }) => (
            <tr key={campaign} style={row}><td style={left}>{campaign}</td><td style={cell}>{s.sent}</td><td style={cell}>{s.delivered}</td><td style={cell}>{s.bounced}</td>
              <td style={cell}>{s.previewed}</td><td style={cell}>{s.clickedAny}</td><td style={cell}>{s.clickedApp}</td><td style={cell}>{s.unsubscribed}</td><td style={cell}>{s.queued}</td></tr>))}</tbody>
        </table></div>
      )}

      <h2 style={h2}>Store numbers</h2>
      <p>Not connected on this page. App Store analytics is switched on (first TapCard figures arrive in a day or two); Google Play installs and Stripe revenue are not connected.</p>
    </div>
  );
}
