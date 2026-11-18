import { Fragment } from "react";
import { irLink, irSummary, type IrRow, type IrTimelineItem } from "@/lib/tapcardIrOutreach";
import { isAdminRequest } from "@/lib/adminRequest";
import { AddEvent, AddRecipient, RemoveEvent, RowActions, WriteEmail } from "./IrOutreachAdmin";
import { buildIrEmail } from "@/lib/tapcardIrEmail";

export const metadata = { title: "Investor relations outreach — Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const when = (d: string | null) => (d ? new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" }) : "–");
const KIND_NAMES: Record<string, string> = { company: "Listed company", agency: "IR / PR adviser", broker: "Broker / corporate finance", contact: "Someone I know" };
const EVENT_LABEL: Record<string, string> = { "email-sent": "Email sent", "email-received": "Email received", "message-sent": "Message sent", "message-received": "Message received", meeting: "Meeting", note: "Note", page: "On the page" };
const EVENT_COLOUR: Record<string, string> = { "email-sent": "#93c5fd", "email-received": "#4ade80", "message-sent": "#93c5fd", "message-received": "#4ade80", meeting: "#FBBF24", note: "#cbd5e1", page: "#c4b5fd" };

// One person's story, oldest first: what was said and when, with what they did on the investors page in between.
function Timeline({ token, items }: { token: string; items: IrTimelineItem[] }) {
  return (
    <details open style={{ marginTop: 6 }}>
      <summary style={{ cursor: "pointer", fontWeight: 700 }}>Timeline ({items.length})</summary>
      {items.length === 0 ? <p style={{ margin: "8px 0", fontSize: 14 }}>Nothing recorded yet.</p> : (
        <ol style={{ listStyle: "none", margin: "8px 0 0", padding: 0, borderLeft: "2px solid rgba(255,255,255,.2)" }}>
          {items.map((e, i) => (
            <li key={`${e.at}-${i}`} style={{ padding: "4px 0 6px 12px", position: "relative" }}>
              <span style={{ position: "absolute", left: -6, top: 10, width: 10, height: 10, borderRadius: 5, background: EVENT_COLOUR[e.kind] ?? "#cbd5e1" }} />
              <span style={{ fontSize: 13, opacity: 0.85 }}>{when(e.at)} · <span style={{ color: EVENT_COLOUR[e.kind] ?? "#cbd5e1", fontWeight: 700 }}>{EVENT_LABEL[e.kind] ?? e.kind}</span></span>
              <div>{e.title}{e.detail && e.kind === "page" ? `: ${TAB_NAMES[e.detail] ?? e.detail}` : ""}{e.id !== undefined && <RemoveEvent token={token} id={e.id} />}</div>
              {e.detail && e.kind !== "page" && <div style={{ fontSize: 14, opacity: 0.85 }}>{e.detail}</div>}
            </li>
          ))}
        </ol>
      )}
      <AddEvent token={token} />
    </details>
  );
}

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
  // One folder per company, most recently active first, so the page stays short; open a company to see its people.
  const lastActivity = (r: IrRow) => [r.lastAt, r.sentAt, r.createdAt, ...r.timeline.map((t) => t.at)].filter(Boolean).sort().pop() ?? r.createdAt;
  const byCompany = new Map<string, { key: string; name: string; rows: IrRow[]; looked: number; opened: number; waiting: number; last: string }>();
  for (const r of rows) {
    const name = r.org.trim() || "No company";
    const key = name.toLowerCase();
    const g = byCompany.get(key) ?? { key, name, rows: [], looked: 0, opened: 0, waiting: 0, last: "" };
    g.rows.push(r);
    if (r.engaged) g.looked++; else if (r.opens > 0) g.opened++; else g.waiting++;
    const la = lastActivity(r);
    if (la > g.last) g.last = la;
    byCompany.set(key, g);
  }
  const groups = [...byCompany.values()].sort((a, b) => b.last.localeCompare(a.last));
  const cell: React.CSSProperties = { padding: "8px 10px", verticalAlign: "top", textAlign: "left" };
  return (
    <div className="text-cloud">
      <p style={{ marginBottom: 12, maxWidth: 760 }}>
        A personal link to the investors page for each person you write to. <strong>Looked at it</strong> means they stayed on the page for a few seconds, clicked a tab or played
        the video, which a link-checking scanner does not do. Forwarded links count as the person they were made for. Nothing about the reader is kept except what they did on the page.
      </p>
      <AddRecipient />
      {rows.length === 0 ? <p>No links yet.</p> : (
        <div style={{ display: "grid", gap: 10 }}>
          {groups.map((g, gi) => (
            <details key={g.key} open={gi === 0} style={{ border: "1px solid rgba(255,255,255,.2)", borderRadius: 12, padding: "10px 14px" }}>
              <summary style={{ cursor: "pointer", display: "flex", flexWrap: "wrap", gap: "4px 14px", alignItems: "baseline" }}>
                <strong style={{ fontSize: 17 }}>{g.name}</strong>
                <span>{g.rows.length} {g.rows.length === 1 ? "person" : "people"}</span>
                {g.looked > 0 && <span style={{ color: "#4ade80", fontWeight: 700 }}>{g.looked} looked at it</span>}
                {g.opened > 0 && <span style={{ color: "#FBBF24", fontWeight: 700 }}>{g.opened} opened the link</span>}
                {g.waiting > 0 && <span style={{ opacity: 0.8 }}>{g.waiting} waiting</span>}
                <span style={{ opacity: 0.8, fontSize: 14 }}>Last activity {when(g.last)}</span>
              </summary>
              <div style={{ marginTop: 10 }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr style={{ borderBottom: "1px solid rgba(255,255,255,.25)" }}>
                  {["Who", "Status", "Sent", "First look", "Last look", "Tabs seen", "Video", "Scanner hits", ""].map((h) => <th key={h} style={cell}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {g.rows.map((r) => {
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
                            <Timeline token={r.token} items={r.timeline} />
                            <WriteEmail to={r.email} first={buildIrEmail({ name: r.name, org: r.org, kind: r.kind, link: irLink(r.token) })} followup={buildIrEmail({ name: r.name, org: r.org, kind: r.kind, link: irLink(r.token), step: "followup" })} />
                          </td>
                        </tr>
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
