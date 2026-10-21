import sql from "@/lib/db";
import { isAdminRequest } from "@/lib/adminRequest";

export const metadata = { title: "TapCard moderation — Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

interface Row { id: number; card_id: string; kind: string; decision: string; category: string; term: string; excerpt: string; created_at: string }

const fmt = (d: string) => new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });

// Offers and news that the automatic checks refused (block) or let through but flagged for a person to look at (review).
// Kept 30 days. A "block" that looks wrong is a word-list fix (lib/tapcardModeration.ts); a "review" that is wrong needs the card taking down.
export default async function ModerationPage() {
  // The login screen comes from the layout, but the page's data must not be fetched, or sent in the page source, for anyone else.
  if (!(await isAdminRequest())) return null;
  const rows = await (sql`
    SELECT id, card_id, kind, decision, category, term, excerpt, created_at FROM tapcard_moderation_log ORDER BY id DESC LIMIT 200
  ` as unknown as Promise<Row[]>).catch(() => null);
  const cell: React.CSSProperties = { padding: "6px 10px", verticalAlign: "top", textAlign: "left" };
  return (
    <div>
      <p className="text-cloud" style={{ marginBottom: "1rem" }}>
        Every offer and news item is checked before it is saved or sent as a notification. <strong>Block</strong>: refused, the owner was told why.{" "}
        <strong>Review</strong>: allowed (for example a raffle) but worth a look. A card with 5 refusals in a day is paused until tomorrow. Customers
        report problems with the &ldquo;Report this card, offer or news&rdquo; link on the card page, which emails enquiries@aiert.co.uk.
      </p>
      {!rows ? <p className="text-cloud">No log yet.</p> : rows.length === 0 ? <p className="text-cloud">Nothing has been blocked or flagged in the last 30 days.</p> : (
        <table className="text-cloud" style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead><tr><th style={cell}>When</th><th style={cell}>Result</th><th style={cell}>Type</th><th style={cell}>Matched</th><th style={cell}>What was posted</th><th style={cell}>Card</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid rgba(255,255,255,.1)" }}>
                <td style={cell}>{fmt(r.created_at)}</td>
                <td style={cell}><strong>{r.decision}</strong> · {r.category}</td>
                <td style={cell}>{r.kind}</td>
                <td style={cell}>{r.term}</td>
                <td style={{ ...cell, maxWidth: 420 }}>{r.excerpt}</td>
                <td style={cell}><a href={`https://tapcard.aiert.co.uk/c/${r.card_id}`} className="underline">open</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
