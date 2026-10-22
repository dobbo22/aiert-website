import { listVerificationAdmin } from "@/lib/tapcardVerify";
import { isAdminRequest } from "@/lib/adminRequest";
import { AdminAction } from "./Actions";

export const metadata = { title: "TapCard verifications and reports — Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const fmt = (d: string) => new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
const REASON: Record<string, string> = { fake_business: "Not the real business", scam_offer: "Fake or misleading offer", offensive: "Offensive", wrong_details: "Wrong details", other: "Something else" };

// Reports from the Report link, and the cards that have proved ownership of their website domain (an emailed code).
export default async function VerificationsPage() {
  if (!(await isAdminRequest())) return null;
  const { verified, reports } = await listVerificationAdmin().catch(() => ({ verified: [], reports: [] }));
  const open = reports.filter((r) => r.status === "open");
  return (
    <div className="text-cloud">
      <p style={{ marginBottom: "1rem" }}>
        A card is Verified when its owner enters a code sent to an address on its website&apos;s domain. Offers and news need it once <code>TAPCARD_VERIFY_ENFORCE=1</code> is set.
        Removing a tick lets the right owner verify the domain.
      </p>
      <h2 style={{ fontWeight: 700, margin: "1.5rem 0 .5rem" }}>Open reports ({open.length})</h2>
      {open.length === 0 ? <p>Nothing open.</p> : open.map((r) => (
        <div key={r.id} style={{ border: "1px solid rgba(255,255,255,.15)", borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <p style={{ fontWeight: 600 }}>{r.company || r.name || r.card_id} · {REASON[r.reason] ?? r.reason} · {fmt(r.created_at)}</p>
          {r.details ? <p style={{ fontSize: 14, margin: "6px 0" }}>{r.details}</p> : null}
          <p style={{ fontSize: 14 }}>
            <a className="underline" href={`https://tapcard.aiert.co.uk/c/${r.card_id}`} target="_blank" rel="noopener noreferrer">Open the card</a>
          </p>
          <p style={{ marginTop: 8 }}>
            <AdminAction label="Resolved" body={{ action: "report", id: r.id, status: "resolved" }} />
            <AdminAction label="Dismiss" body={{ action: "report", id: r.id, status: "dismissed" }} />
            <AdminAction label="Remove Verified tick" body={{ action: "unverify", card: r.card_id }} danger />
          </p>
        </div>
      ))}
      <h2 style={{ fontWeight: 700, margin: "1.5rem 0 .5rem" }}>Verified cards ({verified.length})</h2>
      {verified.length === 0 ? <p>None yet.</p> : (
        <table style={{ width: "100%", fontSize: 14 }}>
          <tbody>
            {verified.map((v) => (
              <tr key={v.id}>
                <td style={{ padding: "6px 10px" }}>{v.company || v.name}</td>
                <td style={{ padding: "6px 10px" }}>{v.domain}</td>
                <td style={{ padding: "6px 10px" }}>{fmt(v.at)}</td>
                <td style={{ padding: "6px 10px" }}><AdminAction label="Remove tick" body={{ action: "unverify", card: v.id }} danger /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
