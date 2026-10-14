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

type PRow = { id: number; name: string; sub: string; email: string; greeting: string; on: boolean };

const pct = (n: number, d: number) => (d ? ` (${Math.round((n / d) * 100)}%)` : "");

export default function MailshotPanel({
  initialCampaign, initialStats, initialBounces, subjects, restaurantSubjects, previewHtml, restaurantPreviewHtml,
}: { initialCampaign: string; initialStats: Stats | null; initialBounces: { name: string; email: string; reason: string | null }[]; subjects: string[]; restaurantSubjects: string[]; previewHtml: string; restaurantPreviewHtml: string }) {
  const [campaign, setCampaign] = useState(initialCampaign);
  const [stats, setStats] = useState<Stats | null>(initialStats);
  const [bounces, setBounces] = useState(initialBounces);
  const [includePersonalContacts, setIncludePersonalContacts] = useState(false);
  const [rows, setRows] = useState<PRow[]>([]);
  const [queue, setQueue] = useState<PRow[] | null>(null);
  const [skipped, setSkipped] = useState<{ id: number; name: string; email: string; reason: string }[] | null>(null);
  const [queueOrig, setQueueOrig] = useState<Record<number, string>>({});
  const [testWording, setTestWording] = useState<"business" | "personal" | "restaurant">("business");
  const [listType, setListType] = useState<"contacts" | "restaurants">("contacts");
  const [cands, setCands] = useState<{ total: number; ok: { id: number; name: string; email: string; company: string }[]; personal: number; role: number; invalid: number } | null>(null);
  const [list, setList] = useState("");
  const [includePersonal, setIncludePersonal] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [subjectIndex, setSubjectIndex] = useState(0);
  const [testTo, setTestTo] = useState("");
  const [dailyCap, setDailyCap] = useState(50);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [promoPlatform, setPromoPlatform] = useState<"ios" | "android">("ios");
  const [promoText, setPromoText] = useState("");
  const [promoStats, setPromoStats] = useState<{ ios: { free: number; assigned: number }; android: { free: number; assigned: number } } | null>(null);

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

  const loadPromo = async () => {
    const r = await fetch("/api/admin/mailshot/promo-codes");
    if (r.ok) setPromoStats(await r.json());
  };
  const importPromo = run(async () => {
    const d = await call("/api/admin/mailshot/promo-codes", { platform: promoPlatform, text: promoText });
    setPromoStats(d.stats);
    setPromoText("");
    setMessage({ text: `Added ${d.added} code${d.added === 1 ? "" : "s"}${d.skipped ? ` (${d.skipped} already there)` : ""}.` });
  });

  const checkContacts = run(async () => {
    const res = await fetch(`/api/admin/mailshot/from-contacts?campaign=${encodeURIComponent(campaign)}${includePersonalContacts ? "&personal=1" : ""}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Couldn't load");
    setCands(data.candidates);
    setRows((data.candidates.ok as { id: number; name: string; email: string; company: string; greeting: string }[]).map((r) => ({ id: r.id, name: r.name || r.email, sub: r.company || r.email, email: r.email, greeting: r.greeting, on: true })));
  });
  const addContacts = run(async () => {
    if (!cands) return;
    const data = await call("/api/admin/mailshot/from-contacts", {
      campaign, includePersonal: includePersonalContacts,
      items: rows.map((r) => ({ id: r.id, greeting: r.greeting, send: r.on })),
    });
    setCands(null);
    setRows([]);
    setMessage({ text: `Queued ${data.queued}${data.skipped ? `, ${data.skipped} marked don't send` : ""}` });
    await refresh();
    await loadQueueNow();
  });
  async function loadQueueNow() {
    const res = await fetch(`/api/admin/mailshot/queue?campaign=${encodeURIComponent(campaign)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Couldn't load the queue");
    const q = data.queue as { id: number; name: string; email: string; greeting: string }[];
    setQueueOrig(Object.fromEntries(q.map((r) => [r.id, r.greeting])));
    setQueue(q.map((r) => ({ id: r.id, name: r.name || r.email, sub: r.email, email: r.email, greeting: r.greeting, on: true })));
  }
  const loadQueue = run(loadQueueNow);
  const showSkipped = run(async () => {
    const res = await fetch(`/api/admin/mailshot/skipped?campaign=${encodeURIComponent(campaign)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Couldn't load");
    setSkipped(data.skipped);
  });
  const putBack = async (id: number) => {
    try {
      await call("/api/admin/mailshot/skipped", { campaign, ids: [id] });
      setSkipped((all) => (all ? all.filter((x) => x.id !== id) : all));
      await refresh();
      if (queue) await loadQueueNow();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Failed", error: true });
    }
  };
  const checkDomains = run(async () => {
    const data = await call("/api/admin/mailshot/check-domains", { campaign });
    setMessage({ text: `Checked ${data.domainsChecked} domains. Took ${data.removed} people off the queue at ${data.deadDomains.length} domains with no mail server${data.deadDomains.length ? `: ${data.deadDomains.slice(0, 12).join(", ")}${data.deadDomains.length > 12 ? "…" : ""}` : ""}` });
    await refresh();
    if (queue) await loadQueueNow();
  });
  const keepOnly = run(async () => {
    const text = window.prompt("Paste the valid addresses from your email-checking service (one per line, or a CSV):") ?? "";
    if (!text.trim()) return;
    const data = await call("/api/admin/mailshot/keep-only", { campaign, text });
    setMessage({ text: `Kept ${data.kept}, took ${data.skipped} off the queue` });
    await refresh();
    if (queue) await loadQueueNow();
  });
  const removeForGood = async (r: PRow) => {
    if (!window.confirm(`Remove ${r.name} for good? They come off your contacts list here and will never be emailed again.`)) return;
    try {
      await call("/api/admin/mailshot/never", { ids: [r.id] });
      setRows((all) => all.filter((x) => x.id !== r.id));
      setQueue((q) => (q ? q.filter((x) => x.id !== r.id) : q));
      setMessage({ text: `${r.name} removed for good` });
      await refresh();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Failed", error: true });
    }
  };
  const saveQueue = run(async () => {
    if (!queue) return;
    const edits = queue
      .filter((r) => !r.on || r.greeting !== queueOrig[r.id])
      .map((r) => (r.on ? { id: r.id, greeting: r.greeting } : { id: r.id, skip: true }));
    if (!edits.length) { setMessage({ text: "No changes to save" }); return; }
    await call("/api/admin/mailshot/queue", { campaign, edits });
    setMessage({ text: `Saved ${edits.length} change${edits.length === 1 ? "" : "s"}` });
    await refresh();
    await loadQueueNow();
  });

  const doImport = run(async () => {
    const data = await call("/api/admin/mailshot/import", { campaign, text: list, includePersonal, kind: listType === "restaurants" ? "restaurant" : undefined });
    setSummary(data.summary);
    setList("");
    await refresh();
  });
  const sendTest = run(async () => {
    const data = await call("/api/admin/mailshot/send", { campaign, mode: "test", testTo, subjectIndex, relationship: testWording });
    setMessage({ text: `Test sent to ${data.to}` });
  });
  const sendToday = run(async () => {
    let total = 0;
    for (let i = 0; i < 40; i++) {
      const data = await call("/api/admin/mailshot/send", { campaign, mode: "batch", subjectIndex, dailyCap, count: 25 });
      total += data.sent;
      if (data.stats) setStats(data.stats);
      if (!data.sent && data.message) { setMessage({ text: data.message, error: true }); await refresh(); return; }
      if (data.failed) throw new Error(`Stopped after ${total} sent. ${(data.errors ?? []).join(" · ")}`);
      if (!data.sent) break;
    }
    setMessage({ text: total ? `Sent ${total}` : "Nothing was sent", error: total === 0 });
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
              {(testWording === "restaurant" ? restaurantSubjects : subjects).map((t, i) => <option key={i} value={i}>{t}</option>)}
            </select>
          </label>
        </div>
        <textarea style={{ ...input, width: "100%", minHeight: 110 }} placeholder={listType === "restaurants" ? "Paste the restaurant CSV: name, email, phone, website, address, booking, menu (header row first)" : "Paste the list (name and email on each line, or a CSV with email / first name / company columns)"} value={list} onChange={(e) => setList(e.target.value)} />
        <div style={{ ...row, marginTop: "0.6rem" }}>
          <input type="file" accept=".csv,.txt,.tsv,text/csv,text/plain" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setList(await f.text()); e.target.value = ""; }} />
          <select style={input} value={listType} onChange={(e) => setListType(e.target.value as "contacts" | "restaurants")}>
            <option value="contacts">Contacts list</option>
            <option value="restaurants">Restaurants (CSV)</option>
          </select>
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
          <select style={input} value={testWording} onChange={(e) => { setTestWording(e.target.value as "business" | "personal" | "restaurant"); setSubjectIndex(0); }}>
            <option value="business">Business wording</option>
            <option value="personal">Personal wording</option>
            <option value="restaurant">Restaurant email</option>
          </select>
          <button style={ghost} disabled={busy || !testTo} onClick={sendTest}>Send test</button>
          <span style={{ flex: 1 }} />
          <label style={row}>Per day <input style={{ ...input, width: 80 }} type="number" min={1} max={300} value={dailyCap} onChange={(e) => setDailyCap(Number(e.target.value))} /></label>
          <button style={btn} disabled={busy || !s || s.queued === 0} onClick={sendToday}>{busy ? "Working…" : "Send today's batch"}</button>
        </div>
        {s && <p style={{ marginTop: "0.6rem", color: "#94a3b8" }}>Sent today {s.sentToday} of {dailyCap}</p>}
        {message && <p className={message.error ? "social-compose-error" : "social-compose-success"} style={{ marginTop: "0.6rem" }}>{message.text}</p>}
      </section>

      <section style={box}>
        <div style={row}>
          <button style={ghost} disabled={busy} onClick={checkContacts}>Check my contacts</button>
          <label style={row}><input type="checkbox" checked={includePersonalContacts} onChange={(e) => { setIncludePersonalContacts(e.target.checked); setCands(null); setRows([]); }} /> Include Gmail-type addresses</label>
          {cands && (
            <>
              <span style={{ color: "#cbd5e1" }}>
                {cands.ok.length} with no invite yet · held back: personal {cands.personal}, role {cands.role}, invalid {cands.invalid}
              </span>
              <span style={{ flex: 1 }} />
              <button style={btn} disabled={busy || rows.length === 0} onClick={addContacts}>
                Queue {rows.filter((r) => r.on).length}{rows.some((r) => !r.on) ? ` · skip ${rows.filter((r) => !r.on).length}` : ""}
              </button>
            </>
          )}
        </div>
        {cands && rows.length > 0 && <PeopleTable rows={rows} setRows={setRows} input={input} ghost={ghost} onRemove={removeForGood} />}
      </section>

      <section style={box}>
        <details onToggle={(e) => { if ((e.target as HTMLDetailsElement).open) loadPromo(); }}>
          <summary style={{ cursor: "pointer" }}>Restaurant free-months codes{promoStats ? ` (iPhone ${promoStats.ios.free} left, Android ${promoStats.android.free} left)` : ""}</summary>
          <div style={{ ...row, marginTop: "0.6rem" }}>
            <select style={input} value={promoPlatform} onChange={(e) => setPromoPlatform(e.target.value as "ios" | "android")}>
              <option value="ios">iPhone (Apple offer codes)</option>
              <option value="android">Android (Google Play promo codes)</option>
            </select>
            <button style={btn} disabled={busy || !promoText.trim()} onClick={importPromo}>Import codes</button>
          </div>
          <textarea style={{ ...input, width: "100%", minHeight: 90, marginTop: "0.6rem" }} value={promoText} onChange={(e) => setPromoText(e.target.value)} placeholder="One code per line, or paste the CSV from the store" />
        </details>
      </section>

      <section style={box}>
        <div style={row}>
          <button style={ghost} disabled={busy} onClick={loadQueue}>Review queue{s ? ` (${s.queued})` : ""}</button>
          <button style={ghost} disabled={busy} onClick={checkDomains}>Check mail servers</button>
          <a style={{ ...ghost, textDecoration: "none", display: "inline-block" }} href={`/api/admin/mailshot/export?campaign=${encodeURIComponent(campaign)}`}>Export queue (CSV)</a>
          <button style={ghost} disabled={busy} onClick={keepOnly}>Keep only valid…</button>
          <button style={ghost} disabled={busy} onClick={showSkipped}>Show taken off</button>
          {queue && (
            <>
              <span style={{ flex: 1 }} />
              <button style={btn} disabled={busy} onClick={saveQueue}>Save changes</button>
            </>
          )}
        </div>
        {skipped && (
          <div style={{ marginTop: "0.75rem" }}>
            <div style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "0.4rem" }}>
              Taken off the queue: {skipped.length} ({skipped.filter((x) => x.reason === "no mail server").length} at domains with no mail server)
              <button style={{ ...ghost, padding: "0.15rem 0.6rem", marginLeft: "0.6rem", fontSize: "0.8rem" }} onClick={() => setSkipped(null)}>Hide</button>
            </div>
            <div style={{ maxHeight: 360, overflowY: "auto", fontSize: "0.9rem", color: "#cbd5e1" }}>
              {skipped.map((x) => (
                <div key={x.id} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 130px auto", gap: "0.6rem", alignItems: "center", padding: "0.15rem 0" }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.email}{x.name && x.name !== x.email ? <span style={{ color: "#94a3b8" }}> · {x.name}</span> : null}</div>
                  <span style={{ color: x.reason === "no mail server" ? "#f87171" : "#94a3b8" }}>{x.reason}</span>
                  <button style={{ ...ghost, padding: "0.15rem 0.5rem", fontSize: "0.8rem" }} onClick={() => putBack(x.id)}>Put back</button>
                </div>
              ))}
            </div>
          </div>
        )}
        {queue && <PeopleTable rows={queue} setRows={(fn) => setQueue((q) => (q ? (typeof fn === "function" ? fn(q) : fn) : q))} input={input} ghost={ghost} onRemove={removeForGood} />}
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
        <iframe title="Email preview" srcDoc={testWording === "restaurant" ? restaurantPreviewHtml : previewHtml} style={{ width: "100%", height: 760, border: 0, background: "#fff", borderRadius: 6 }} />
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

// One row per person: tick = send, greeting = the name after "Hi" (empty gives just "Hi,"). Unticked = don't send.
function PeopleTable({ rows, setRows, input, ghost, onRemove }: {
  rows: PRow[];
  setRows: (fn: PRow[] | ((r: PRow[]) => PRow[])) => void;
  input: React.CSSProperties;
  ghost: React.CSSProperties;
  onRemove: (r: PRow) => void;
}) {
  const [filter, setFilter] = useState("");
  const f = filter.trim().toLowerCase();
  const shown = f ? rows.filter((r) => (r.name + " " + r.email + " " + r.greeting).toLowerCase().includes(f)) : rows;
  const patch = (id: number, p: Partial<PRow>) => setRows((all) => all.map((r) => (r.id === id ? { ...r, ...p } : r)));
  const setAll = (on: boolean) => setRows((all) => all.map((r) => (shown.some((x) => x.id === r.id) ? { ...r, on } : r)));
  return (
    <div style={{ marginTop: "0.75rem" }}>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center", marginBottom: "0.5rem" }}>
        <input style={{ ...input, minWidth: 220 }} placeholder="Find a person…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <button style={{ ...ghost, padding: "0.25rem 0.7rem" }} onClick={() => setAll(true)}>Send all shown</button>
        <button style={{ ...ghost, padding: "0.25rem 0.7rem" }} onClick={() => setAll(false)}>Don't send any shown</button>
        <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{rows.filter((r) => r.on).length} to send · {rows.filter((r) => !r.on).length} don't send</span>
      </div>
      <div style={{ maxHeight: 460, overflowY: "auto", fontSize: "0.9rem", color: "#cbd5e1" }}>
        {shown.map((r) => (
          <div key={r.id} style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr) 190px auto", gap: "0.6rem", alignItems: "center", padding: "0.2rem 0", opacity: r.on ? 1 : 0.45 }}>
            <input type="checkbox" checked={r.on} onChange={(e) => patch(r.id, { on: e.target.checked })} title="Tick to send, untick for don't send" />
            <div style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {r.name} <span style={{ color: "#94a3b8" }}>· {r.sub}</span>
            </div>
            <div style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
              <span style={{ color: "#94a3b8" }}>Hi</span>
              <input style={{ ...input, width: 110, padding: "0.25rem 0.5rem" }} value={r.greeting} onChange={(e) => patch(r.id, { greeting: e.target.value })} placeholder="(none)" />
              <span style={{ color: "#94a3b8" }}>,</span>
            </div>
            <button style={{ ...ghost, padding: "0.15rem 0.5rem", fontSize: "0.8rem" }} title="Never email this person again (left the company, passed away…)" onClick={() => onRemove(r)}>Remove for good</button>
          </div>
        ))}
      </div>
    </div>
  );
}
