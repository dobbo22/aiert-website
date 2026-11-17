import { Fragment } from "react";
import { irLink, irSummary, type IrRow } from "@/lib/tapcardIrOutreach";
import { isAdminRequest } from "@/lib/adminRequest";
import { AddRecipient, RowActions, WriteEmail } from "./IrOutreachAdmin";
import { buildIrEmail } from "@/lib/tapcardIrEmail";

export const metadata = { title: "Investor relations outreach — Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const when = (d: string | null) => (d ? new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" }) : "–");
const KIND_NAMES: Record<string, string> = { company: "Listed company", agency: "IR / PR adviser", broker: "Broker / corporate finance", contact: "Someone I know" };
const TAB_NAMES: Record<string, string> = { see: "See it", features: "What you get", admin: "Your admin", pricing: "Pricing", questions: "Questions" };

function status(r: IrRow): { text: string; colour: string } {
  if (r.engaged) return { text: "Looked at it", colour: "#4ade80" };
  if (r.opens > 0) return { text: "Opened the link", colour: "#FBBF24" };
  return { text: r.sentAt ? "Not opened yet" : "Not sent yet", colour: "#cbd5e1" };
}

// Personal links for the people we write to about TapCard for investor relations (a broker, an adviser, an old colleague). One link each, so we can
// see whether the page was opened and really looked at. Email "open" pixels are deliberately not used: mail apps and security scanners fetch them
// on their own, so they prove nothing. A robot's hit is kept apart and never counts as a person.
export default async function IrOutreachPage() {
  if (!(await isAdminRequest())) return null;
  const rows = await irSummary().catch(() => [] as IrRow[]);
  const cell: React.CSSProperties = { padding: "8px 10px", verticalAlign: "top", textAlign: "left" };
  return (
    <div className="text-cloud">
      <p style={{ marginBottom: 12, maxWidth: 760 }}>
        A personal link to the investors page for each person you write to. <strong>Looked at it</strong> means they stayed on the page for a few seconds, clicked a tab or played
        the video, which a link-checking scanner does not do. Forwarded links count as the person they were made for. Nothing about the reader is kept except what they did on the page.
      </p>
      <AddRecipient />
      {rows.length === 0 ? <p>No links yet.</p> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ borderBottom: "1px solid rgba(255,255,255,.25)" }}>
              {["Who", "Status", "Sent", "First look", "Last look", "Tabs seen", "Video", "Scanner hits", ""].map((h) => <th key={h} style={cell}>{h}</th>)}
            </tr></thead>
            <tbody>
              {rows.map((r) => {
                const s = status(r);
                return (
                  <Fragment key={r.token}>
                    <tr>
                      <td style={cell}><strong>{r.name}</strong><br />{r.org}<br /><span style={{ fontSize: 13 }}>{KIND_NAMES[r.kind]}{r.email ? ` · ${r.email}` : ""}</span></td>
                      <td style={{ ...cell, color: s.colour, fontWeight: 700 }}>{s.text}{r.opens > 1 ? ` (${r.opens} visits)` : ""}</td>
                      <td style={cell}>{when(r.sentAt)}</td>
                      <td style={cell}>{when(r.firstAt)}</td>
                      <td style={cell}>{when(r.lastAt)}</td>
                      <td style={cell}>{r.tabs.length ? r.tabs.map((t) => TAB_NAMES[t] ?? t).join(", ") : "–"}</td>
                      <td style={cell}>{r.video === "finished" ? "Watched to the end" : r.video === "played" ? "Played" : "–"}</td>
                      <td style={cell}>{r.robotHits || "–"}</td>
                      <td style={cell}><RowActions token={r.token} link={irLink(r.token)} sent={!!r.sentAt} /></td>
                    </tr>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,.12)" }}>
                      <td colSpan={9} style={{ padding: "0 10px 12px" }}>
                        <WriteEmail to={r.email} first={buildIrEmail({ name: r.name, org: r.org, kind: r.kind, link: irLink(r.token) })} followup={buildIrEmail({ name: r.name, org: r.org, kind: r.kind, link: irLink(r.token), step: "followup" })} />
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
