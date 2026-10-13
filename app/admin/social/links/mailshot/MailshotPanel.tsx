"use client";

import { useState } from "react";

type Stats = {
  inList: number; sent: number; sentToday: number; queued: number; delivered: number; bounced: number;
  clickedAny: number; clickedApp: number; clickedHow: number; clickedVideo: number; unsubscribed: number;
};
type Summary = {
  found: number; added: number; alreadyInList: number;
  skipped: { invalid: number; role: number; personal: number; duplicates: number; unsubscribed: number };
  personalExamples: string[];
};

const pct = (n: number, d: number) => (d ? ` (${Math.round((n / d) * 100)}%)` : "");

export default function MailshotPanel({
  initialCampaign, initialStats, initialBounces, subjects, previewHtml,
}: { initialCampaign: string; initialStats: Stats | null; initialBounces: { name: string; email: string; reason: string | null }[]; subjects: string[]; previewHtml: string }) {
  const [campaign, setCampaign] = useState(initialCampaign);
  const [stats, setStats] = useState<Stats | null>(initialStats);
  const [bounces, setBounces] = useState(initialBounces);
  const [list, setList] = useState("");
  const [includePersonal, setIncludePersonal] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [subjectIndex, setSubjectIndex] = useState(0);
  const [testTo, setTestTo] = useState("");
  const [dailyCap, setDailyCap] = useState(50);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  async function call(path: string, body: unknown) {
    const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Something went wrong");
    return data;
  }
  async function refresh() {
    const res = await fetch(`/api/admin/mailshot/stats?campaign=${encodeURIComponent(campaign)}`);
    if (res.ok) { const d = await res.json(); setStats(d.stats); setBounces(d.bounces ?? []); }
  }
  const run = (fn: () => Promise<void>) => async () => {
    setBusy(true); setMessage(null);
    try { await fn(); } catch (err) { setMessage({ text: err instanceof Error ? err.message : "Failed", error: true }); }
    setBusy(false);
  };

  const doImport = run(async () => {
    const data = await call("/api/admin/mailshot/import", { campaign, text: list, includePersonal });
    setSummary(data.summary);
    setList("");
    await refresh();
  });
  const sendTest = run(async () => {
    const data = await call("/api/admin/mailshot/send", { campaign, mode: "test", testTo, subjectIndex });
    setMessage({ text: `Test sent to ${data.to}` });
  });
  const sendToday = run(async () => {
    let total = 0;
    for (let i = 0; i < 40; i++) {
      const data = await call("/api/admin/mailshot/send", { campaign, mode: "batch", subjectIndex, dailyCap, count: 25 });
      total += data.sent;
      if (data.stats) setStats(data.stats);
      if (data.failed) throw new Error(`Stopped after ${total} sent. ${(data.errors ?? []).join(" · ")}`);
      if (!data.sent) break;
    }
    setMessage({ text: `Sent ${total}` });
    await refresh();
  });

  const box = { padding: "1rem", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 8, marginBottom: "1rem", background: "rgba(18,24,40,0.6)" } as const;
  const input = { background: "rgba(8,12,22,0.8)", border: "1px solid rgba(148,163,184,0.3)", borderRadius: 6, color: "#e2e8f0", padding: "0.5rem 0.7rem", font: "inherit" } as const;
  const btn = { background: "#fbbf24", color: "#0b1020", border: 0, borderRadius: 6, padding: "0.55rem 1rem", fontWeight: 700, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.6 : 1 } as const;
  const ghost = { ...btn, background: "transparent", color: "#e2e8f0", border: "1px solid rgba(148,163,184,0.4)" } as const;
  const row = { display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" } as const;

  const s = stats;
  return (
    <div>
      {s && (
        <div className="admin-stats">
          <Stat v={s.inList} l="In list" />
          <Stat v={s.queued} l="Still to send" />
          <Stat v={s.sent} l="Sent" />
          <Stat v={s.delivered} l="Delivered" />
          <Stat v={s.bounced} l="Bounced" />
          <Stat v={s.clickedApp} l={`Get the app${pct(s.clickedApp, s.sent)}`} />
          <Stat v={s.clickedHow} l="How it works" />
          <Stat v={s.clickedVideo} l="Demo" />
          <Stat v={s.clickedAny} l={`Any click${pct(s.clickedAny, s.sent)}`} />
          <Stat v={s.unsubscribed} l="Unsubscribed" />
        </div>
      )}

      <section style={box}>
        <div style={{ ...row, marginBottom: "0.75rem" }}>
          <label style={row}>Campaign <input style={input} value={campaign} maxLength={30} onChange={(e) => setCampaign(e.target.value.replace(/[^a-z0-9-]/gi, "-").toLowerCase())} onBlur={refresh} /></label>
          <label style={row}>Subject
            <select style={input} value={subjectIndex} onChange={(e) => setSubjectIndex(Number(e.target.value))}>
              {subjects.map((t, i) => <option key={i} value={i}>{t}</option>)}
            </select>
          </label>
        </div>
        <textarea style={{ ...input, width: "100%", minHeight: 110 }} placeholder="Paste the list (name and email on each line, or a CSV with email / first name / company columns)" value={list} onChange={(e) => setList(e.target.value)} />
        <div style={{ ...row, marginTop: "0.6rem" }}>
          <input type="file" accept=".csv,.txt,.tsv,text/csv,text/plain" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setList(await f.text()); e.target.value = ""; }} />
          <label style={row}><input type="checkbox" checked={includePersonal} onChange={(e) => setIncludePersonal(e.target.checked)} /> Include Gmail / Outlook-type addresses</label>
          <button style={btn} disabled={busy || !list.trim()} onClick={doImport}>Add to list</button>
        </div>
        {summary && (
          <p style={{ marginTop: "0.75rem", color: "#cbd5e1" }}>
            Added {summary.added} of {summary.found}. Already in list {summary.alreadyInList}. Held back: personal {summary.skipped.personal}, role {summary.skipped.role}, invalid {summary.skipped.invalid}, unsubscribed {summary.skipped.unsubscribed}, duplicates {summary.skipped.duplicates}.
            {summary.personalExamples.length > 0 && <><br /><span style={{ color: "#94a3b8" }}>e.g. {summary.personalExamples.join(", ")}</span></>}
          </p>
        )}
      </section>

      <section style={box}>
        <div style={row}>
          <input style={{ ...input, minWidth: 260 }} type="email" placeholder="Send a test to…" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
          <button style={ghost} disabled={busy || !testTo} onClick={sendTest}>Send test</button>
          <span style={{ flex: 1 }} />
          <label style={row}>Per day <input style={{ ...input, width: 80 }} type="number" min={1} max={300} value={dailyCap} onChange={(e) => setDailyCap(Number(e.target.value))} /></label>
          <button style={btn} disabled={busy || !s || s.queued === 0} onClick={sendToday}>{busy ? "Working…" : "Send today's batch"}</button>
        </div>
        {s && <p style={{ marginTop: "0.6rem", color: "#94a3b8" }}>Sent today {s.sentToday} of {dailyCap}</p>}
        {message && <p className={message.error ? "social-compose-error" : "social-compose-success"} style={{ marginTop: "0.6rem" }}>{message.text}</p>}
      </section>

      {bounces.length > 0 && (
        <details style={box} open={s ? s.sent >= 20 && s.bounced / s.sent > 0.08 : false}>
          <summary style={{ cursor: "pointer", fontWeight: 600, color: s && s.sent >= 20 && s.bounced / s.sent > 0.08 ? "#f87171" : "#e2e8f0" }}>
            Bounced ({bounces.length}){s && s.sent ? ` · ${Math.round((s.bounced / s.sent) * 100)}% of sent` : ""}
          </summary>
          <table style={{ marginTop: "0.6rem", width: "100%", fontSize: "0.9rem", color: "#cbd5e1" }}>
            <tbody>
              {bounces.map((b) => (
                <tr key={b.email}><td style={{ padding: "0.2rem 0.5rem 0.2rem 0" }}>{b.email}</td><td style={{ color: "#94a3b8" }}>{b.reason ?? "reason not recorded"}</td></tr>
              ))}
            </tbody>
          </table>
        </details>
      )}

      <section style={box}>
        <iframe title="Email preview" srcDoc={previewHtml} style={{ width: "100%", height: 760, border: 0, background: "#fff", borderRadius: 6 }} />
      </section>
    </div>
  );
}

function Stat({ v, l }: { v: number; l: string }) {
  return (
    <div className="admin-stat">
      <span className="admin-stat-value">{v}</span>
      <span className="admin-stat-label">{l}</span>
    </div>
  );
}
