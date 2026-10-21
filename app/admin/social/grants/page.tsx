import { listGrants, listRequests } from "@/lib/tapcardGrants";
import { GrantForm, RevokeButton } from "./GrantsAdmin";
import { isAdminRequest } from "@/lib/adminRequest";

export const metadata = { title: "TapCard free Promote — Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const fmt = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" });
const cell: React.CSSProperties = { padding: "6px 10px", verticalAlign: "top", textAlign: "left" };

// Complimentary TapCard Promote for charities, societies and early businesses (no store subscription). Charities that ask on the
// societies page are approved automatically when the Charity Commission register confirms them and the website matches; the rest wait here.
export default async function GrantsPage() {
  // The login screen comes from the layout, but the page's data must not be fetched, or sent in the page source, for anyone else.
  if (!(await isAdminRequest())) return null;
  const [grants, requests] = await Promise.all([listGrants().catch(() => []), listRequests().catch(() => [])]);
  const pending = requests.filter((r) => r.status === "pending");
  return (
    <div className="text-cloud">
      <p style={{ marginBottom: "1rem" }}>
        A grant lets a card post offers, news and stamp cards with no App Store or Google Play subscription. Requests from the societies page
        arrive here; registered charities whose website matches their card are approved automatically (needs <code>CHARITY_COMMISSION_API_KEY</code>).
      </p>

      <h2 style={{ fontWeight: 700, margin: "1.5rem 0 .5rem" }}>Waiting for you ({pending.length})</h2>
      {pending.length === 0 ? <p>Nothing waiting.</p> : pending.map((r) => (
        <div key={r.id} style={{ border: "1px solid rgba(255,255,255,.15)", borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <p style={{ fontWeight: 600 }}>{r.group_name} · {r.email} · {fmt(r.created_at)}</p>
          <p style={{ fontSize: 14, marginBottom: 8 }}>Charity number: {r.charity_number || "none"} · not automatic because: {r.note || "n/a"} · <a className="underline" href={`https://tapcard.aiert.co.uk/c/${r.card_id}`}>open the card</a></p>
          <GrantForm initialCard={r.card_id} initialReason={r.charity_number ? `Registered charity ${r.charity_number}` : "Small society"} initialCharity={r.charity_number} requestId={r.id} />
        </div>
      ))}

      <h2 style={{ fontWeight: 700, margin: "1.5rem 0 .5rem" }}>Grant one yourself</h2>
      <GrantForm />

      <h2 style={{ fontWeight: 700, margin: "1.5rem 0 .5rem" }}>Current and past grants ({grants.length})</h2>
      {grants.length === 0 ? <p>None yet.</p> : (
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead><tr><th style={cell}>Until</th><th style={cell}>Reason</th><th style={cell}>Charity</th><th style={cell}>By</th><th style={cell}>Card</th><th style={cell}></th></tr></thead>
          <tbody>
            {grants.map((g) => (
              <tr key={g.card_id} style={{ borderTop: "1px solid rgba(255,255,255,.1)" }}>
                <td style={cell}>{fmt(g.until)}{new Date(g.until) < new Date() ? " (ended)" : ""}</td>
                <td style={cell}>{g.reason}</td><td style={cell}>{g.charity_number || ""}</td><td style={cell}>{g.granted_by}</td>
                <td style={cell}><a className="underline" href={`https://tapcard.aiert.co.uk/c/${g.card_id}`}>open</a></td>
                <td style={cell}><RevokeButton cardId={g.card_id} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
