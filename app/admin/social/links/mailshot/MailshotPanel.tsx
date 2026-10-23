"use client";

import { useState } from "react";

// The mailshot page, in three steps: 1 add the list, 2 check it, 3 send; then the results.
// It currently runs the restaurant mailshot. To add another kind of business later, add an entry to MAILSHOT_TYPES
// (its own wording, subject lines, preview and list columns) and the page offers a switch between them.

type Stats = {
  inList: number; sent: number; sentToday: number; queued: number; delivered: number; bounced: number;
  clickedAny: number; clickedApp: number; clickedHow: number; clickedVideo: number; previewed: number; unsubscribed: number;
};
type Summary = {
  found: number; added: number; alreadyInList: number;
  skipped: { invalid: number; role: number; personal: number; duplicates: number; unsubscribed: number };
  personalExamples: string[];
};
type PRow = { id: number; name: string; email: string; on: boolean };

type MailshotType = {
  id: string;
  label: string;
  /// What the import route is told this list is (it decides which email the people get).
  importKind: string;
  /// The wording the test and the batch send use.
  relationship: string;
  listHint: string;
  noun: string;
  sampleOptions?: { value: string; label: string }[];
};

const MAILSHOT_TYPES: MailshotType[] = [
  {
    id: "restaurants", label: "Restaurants", importKind: "restaurant", relationship: "restaurant", noun: "restaurant",
    listHint: "A CSV with a header row and these columns: name, email, phone, website, address, booking, menu. Only name and email are needed.",
    sampleOptions: [{ value: "newfortune", label: "New Fortune Cookie (real details)" }, { value: "olive", label: "The Olive Table (made up)" }],
  },
];

const pct = (n: number, d: number) => (d ? ` (${Math.round((n / d) * 100)}%)` : "");

export default function MailshotPanel({
  initialCampaign, initialStats, initialBounces, restaurantSubjects, restaurantPreviewHtml,
}: { initialCampaign: string; initialStats: Stats | null; initialBounces: { name: string; email: string; reason: string | null }[]; restaurantSubjects: string[]; restaurantPreviewHtml: string }) {
  const [type, setType] = useState<MailshotType>(MAILSHOT_TYPES[0]);
  const subjects = restaurantSubjects;
  const previewHtml = restaurantPreviewHtml;

  const [campaign, setCampaign] = useState(initialCampaign);
  const [stats, setStats] = useState<Stats | null>(initialStats);
  const [bounces, setBounces] = useState(initialBounces);
  const [list, setList] = useState("");
  const [includePersonal, setIncludePersonal] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [queue, setQueue] = useState<PRow[] | null>(null);
  const [queueOrig, setQueueOrig] = useState<Record<number, boolean>>({});
  const [skipped, setSkipped] = useState<{ id: number; name: string; email: string; reason: string }[] | null>(null);
  const [subjectIndex, setSubjectIndex] = useState(0);
  const [testTo, setTestTo] = useState("");
  const [testSample, setTestSample] = useState(type.sampleOptions?.[0]?.value ?? "");
  const [dailyCap, setDailyCap] = useState(50);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ step: 1 | 2 | 3; text: string; error?: boolean } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  async function call(path: string, body: unknown) {
    const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Something went wrong");
    return data;
  }
  async function refresh(name = campaign) {
    const res = await fetch(`/api/admin/mailshot/stats?campaign=${encodeURIComponent(name)}`);
    if (res.ok) { const d = await res.json(); setStats(d.stats); setBounces(d.bounces ?? []); }
  }
  const run = (step: 1 | 2 | 3, fn: () => Promise<void>) => async () => {
    setBusy(true); setMessage(null);
    try { await fn(); } catch (err) { setMessage({ step, text: err instanceof Error ? err.message : "Failed", error: true }); }
    setBusy(false);
  };
  const say = (step: 1 | 2 | 3, text: string, error = false) => setMessage({ step, text, error });

  async function loadQueueNow() {
    const res = await fetch(`/api/admin/mailshot/queue?campaign=${encodeURIComponent(campaign)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Couldn't load the list");
    const q = data.queue as { id: number; name: string; email: string }[];
    setQueueOrig(Object.fromEntries(q.map((r) => [r.id, true])));
    setQueue(q.map((r) => ({ id: r.id, name: r.name || r.email, email: r.email, on: true })));
  }

  // ---- step 1
  const doImport = run(1, async () => {
    const data = await call("/api/admin/mailshot/import", { campaign, text: list, includePersonal, kind: type.importKind });
    setSummary(data.summary);
    setList("");
    await refresh();
    await loadQueueNow();
  });

  // ---- step 2
  const loadQueue = run(2, loadQueueNow);
  const saveQueue = run(2, async () => {
    if (!queue) return;
    const edits = queue.filter((r) => !r.on && queueOrig[r.id]).map((r) => ({ id: r.id, skip: true }));
    if (!edits.length) { say(2, "Nothing to change."); return; }
    await call("/api/admin/mailshot/queue", { campaign, edits });
    say(2, `Done. ${edits.length} ${type.noun}${edits.length === 1 ? "" : "s"} won't be emailed.`);
    await refresh();
    await loadQueueNow();
  });
  const checkDomains = run(2, async () => {
    const data = await call("/api/admin/mailshot/check-domains", { campaign });
    say(2, `Checked ${data.domainsChecked} websites. ${data.removed ? `Took ${data.removed} off the list because their email address can't receive mail${data.deadDomains.length ? ` (${data.deadDomains.slice(0, 8).join(", ")}${data.deadDomains.length > 8 ? "…" : ""})` : ""}.` : "Every address can receive mail."}`);
    await refresh();
    if (queue) await loadQueueNow();
  });
  const sendTest = run(2, async () => {
    const data = await call("/api/admin/mailshot/send", { campaign, mode: "test", testTo, subjectIndex, relationship: type.relationship, sample: testSample || undefined });
    say(2, `Test sent to ${data.to}. Check your inbox (and spam).`);
  });
  const showSkipped = run(2, async () => {
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
    } catch (err) { say(2, err instanceof Error ? err.message : "Failed", true); }
  };
  const keepOnly = run(2, async () => {
    const text = window.prompt("Paste the valid addresses from your email-checking service (one per line, or a CSV). Everyone else is taken off the list, and you can put them back:") ?? "";
    if (!text.trim()) return;
    const data = await call("/api/admin/mailshot/keep-only", { campaign, text });
    say(2, `Kept ${data.kept}, took ${data.skipped} off the list.`);
    await refresh();
    if (queue) await loadQueueNow();
  });

  // ---- step 3
  const toSend = Math.max(0, Math.min(stats?.queued ?? 0, dailyCap - (stats?.sentToday ?? 0)));
  const sendToday = run(3, async () => {
    if (!toSend) { say(3, stats?.queued ? `You've reached today's limit of ${dailyCap}. Raise "Most per day" or come back tomorrow.` : "There's nobody left to send to.", true); return; }
    if (!window.confirm(`Send the email to ${toSend} ${type.noun}${toSend === 1 ? "" : "s"} now? Emails can't be unsent.`)) return;
    let total = 0;
    const refused: string[] = [];
    for (let i = 0; i < 40; i++) {
      const data = await call("/api/admin/mailshot/send", { campaign, mode: "batch", subjectIndex, dailyCap, count: 25 });
      total += data.sent;
      refused.push(...(data.refused ?? []));
      if (data.stats) setStats(data.stats);
      if (!data.sent && data.message) { say(3, data.message, true); await refresh(); return; }
      if (data.failed) throw new Error(`Stopped after ${total} sent. ${(data.errors ?? []).join(" · ")}`);
      if (!data.sent) break;
    }
    const refusedNote = refused.length ? ` ${refused.length} address${refused.length === 1 ? " was" : "es were"} refused and taken off the list (${refused.slice(0, 5).join(", ")}${refused.length > 5 ? "…" : ""}).` : "";
    say(3, total ? `Sent to ${total} ${type.noun}${total === 1 ? "" : "s"}.${refusedNote} Watch the results below.` : `Nothing was sent.${refusedNote}`, total === 0);
    await refresh();
  });

  const box = { padding: "1.1rem 1.2rem", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 10, marginBottom: "1.1rem", background: "rgba(18,24,40,0.6)" } as const;
  const input = { background: "rgba(8,12,22,0.8)", border: "1px solid rgba(148,163,184,0.3)", borderRadius: 6, color: "#e2e8f0", padding: "0.5rem 0.7rem", font: "inherit" } as const;
  const btn = { background: "#fbbf24", color: "#0b1020", border: 0, borderRadius: 6, padding: "0.55rem 1rem", fontWeight: 700, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.6 : 1 } as const;
  const ghost = { ...btn, background: "transparent", color: "#e2e8f0", border: "1px solid rgba(148,163,184,0.4)" } as const;
  const row = { display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" } as const;
  const hint = { color: "#94a3b8", fontSize: "0.9rem", margin: "0.2rem 0 0.8rem" } as const;

  const s = stats;
  const msg = (step: 1 | 2 | 3) => message && message.step === step && (
    <p className={message.error ? "social-compose-error" : "social-compose-success"} style={{ marginTop: "0.7rem" }}>{message.text}</p>
  );

  return (
    <div>
      <div style={{ ...row, marginBottom: "1rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.4rem" }}>{type.label} mailshot</h1>
        {MAILSHOT_TYPES.length > 1 && (
          <select style={input} value={type.id} onChange={(e) => { const t = MAILSHOT_TYPES.find((x) => x.id === e.target.value); if (t) { setType(t); setSummary(null); setQueue(null); } }}>
            {MAILSHOT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        )}
        <span style={{ flex: 1 }} />
        <label style={{ ...row, color: "#94a3b8" }}>Mailing name
          <input style={input} value={campaign} maxLength={30} title="Each mailing keeps its own list and results. Use a new name for a new area or a new batch."
            onChange={(e) => setCampaign(e.target.value.replace(/[^a-z0-9-]/gi, "-").toLowerCase())}
            onBlur={() => { refresh(); setQueue(null); setSummary(null); setSkipped(null); }} />
        </label>
      </div>

      {/* ---------- Step 1 ---------- */}
      <section style={box}>
        <StepTitle n={1} title="Add your list" done={!!summary || (s?.inList ?? 0) > 0} />
        <p style={hint}>{type.listHint} {s && s.inList > 0 ? `This mailing has ${s.inList} in its list so far.` : ""}</p>
        <textarea style={{ ...input, width: "100%", minHeight: 100 }} placeholder={`Paste the ${type.noun} list here, or choose a file below`} value={list} onChange={(e) => setList(e.target.value)} />
        <div style={{ ...row, marginTop: "0.6rem" }}>
          <input type="file" accept=".csv,.txt,.tsv,text/csv,text/plain" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setList(await f.text()); e.target.value = ""; }} />
          <label style={{ ...row, color: "#94a3b8" }}><input type="checkbox" checked={includePersonal} onChange={(e) => setIncludePersonal(e.target.checked)} /> Also include Gmail / Outlook-type addresses</label>
          <span style={{ flex: 1 }} />
          <button style={btn} disabled={busy || !list.trim()} onClick={doImport}>{busy ? "Working…" : "Add to list"}</button>
        </div>
        {summary && (
          <p style={{ marginTop: "0.75rem", color: "#cbd5e1" }}>
            Added {summary.added} of {summary.found}.
            {summary.alreadyInList > 0 && ` ${summary.alreadyInList} were already in this list.`}
            {(summary.skipped.personal + summary.skipped.role + summary.skipped.invalid + summary.skipped.unsubscribed + summary.skipped.duplicates) > 0 && (
              <> Held back: {[
                summary.skipped.personal ? `${summary.skipped.personal} Gmail-type` : "",
                summary.skipped.role ? `${summary.skipped.role} role addresses` : "",
                summary.skipped.invalid ? `${summary.skipped.invalid} not valid` : "",
                summary.skipped.unsubscribed ? `${summary.skipped.unsubscribed} unsubscribed` : "",
                summary.skipped.duplicates ? `${summary.skipped.duplicates} repeats` : "",
              ].filter(Boolean).join(", ")}.</>
            )}
            {summary.personalExamples.length > 0 && <><br /><span style={{ color: "#94a3b8" }}>Gmail-type, for example: {summary.personalExamples.join(", ")}</span></>}
          </p>
        )}
        {msg(1)}
      </section>

      {/* ---------- Step 2 ---------- */}
      <section style={box}>
        <StepTitle n={2} title="Check it" done={false} />
        <p style={hint}>See who is on the list, look at the email, and send yourself a test before anything goes out.</p>

        <div style={{ ...row, marginBottom: "0.8rem" }}>
          <button style={ghost} disabled={busy} onClick={loadQueue}>{queue ? "Refresh the list" : `Show the list${s ? ` (${s.queued})` : ""}`}</button>
          <button style={ghost} disabled={busy || !s || s.queued === 0} onClick={checkDomains} title="Takes off anyone whose website email address can't receive mail">Check the email addresses work</button>
          <button style={ghost} onClick={() => setShowPreview((v) => !v)}>{showPreview ? "Hide the email" : "Look at the email"}</button>
        </div>

        {queue && (
          <div style={{ marginBottom: "0.9rem" }}>
            <PeopleTable rows={queue} setRows={(fn) => setQueue((q) => (q ? (typeof fn === "function" ? fn(q) : fn) : q))} input={input} ghost={ghost} />
            <div style={{ ...row, marginTop: "0.6rem" }}>
              <span style={{ color: "#94a3b8", fontSize: "0.9rem" }}>Untick anyone you don&rsquo;t want to email, then save.</span>
              <span style={{ flex: 1 }} />
              <button style={btn} disabled={busy || queue.every((r) => r.on)} onClick={saveQueue}>Save changes</button>
            </div>
          </div>
        )}

        {showPreview && (
          <iframe title="Email preview" srcDoc={previewHtml} style={{ width: "100%", height: 720, border: 0, background: "#fff", borderRadius: 8, marginBottom: "0.9rem" }} />
        )}

        <div style={{ ...row, padding: "0.8rem", background: "rgba(8,12,22,0.5)", borderRadius: 8 }}>
          <strong>Send me a test</strong>
          <input style={{ ...input, minWidth: 240 }} type="email" placeholder="your email address" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
          {type.sampleOptions && (
            <select style={input} value={testSample} onChange={(e) => setTestSample(e.target.value)} title="Which restaurant's card appears in the test">
              {type.sampleOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          )}
          <button style={ghost} disabled={busy || !testTo} onClick={sendTest}>Send test</button>
        </div>
        <div style={{ ...row, marginTop: "0.8rem" }}>
          <label style={{ ...row, color: "#94a3b8" }}>Subject line
            <select style={input} value={subjectIndex} onChange={(e) => setSubjectIndex(Number(e.target.value))}>
              {subjects.map((t, i) => <option key={i} value={i}>{t}</option>)}
            </select>
          </label>
        </div>
        {msg(2)}

        <details style={{ marginTop: "1rem" }}>
          <summary style={{ cursor: "pointer", color: "#94a3b8" }}>More tools</summary>
          <div style={{ ...row, marginTop: "0.6rem" }}>
            <a style={{ ...ghost, textDecoration: "none", display: "inline-block" }} href={`/api/admin/mailshot/export?campaign=${encodeURIComponent(campaign)}`}>Download the list (CSV)</a>
            <button style={ghost} disabled={busy} onClick={keepOnly}>Keep only valid…</button>
            <button style={ghost} disabled={busy} onClick={showSkipped}>Show who was taken off</button>
          </div>
          {skipped && (
            <div style={{ marginTop: "0.75rem" }}>
              <div style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "0.4rem" }}>
                Taken off the list: {skipped.length}
                <button style={{ ...ghost, padding: "0.15rem 0.6rem", marginLeft: "0.6rem", fontSize: "0.8rem" }} onClick={() => setSkipped(null)}>Hide</button>
              </div>
              <div style={{ maxHeight: 320, overflowY: "auto", fontSize: "0.9rem", color: "#cbd5e1" }}>
                {skipped.map((x) => (
                  <div key={x.id} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 140px auto", gap: "0.6rem", alignItems: "center", padding: "0.15rem 0" }}>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.email}{x.name && x.name !== x.email ? <span style={{ color: "#94a3b8" }}> · {x.name}</span> : null}</div>
                    <span style={{ color: x.reason === "no mail server" ? "#f87171" : "#94a3b8" }}>{x.reason}</span>
                    <button style={{ ...ghost, padding: "0.15rem 0.5rem", fontSize: "0.8rem" }} onClick={() => putBack(x.id)}>Put back</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </details>
      </section>

      {/* ---------- Step 3 ---------- */}
      <section style={box}>
        <StepTitle n={3} title="Send" done={!!s && s.sent > 0} />
        <p style={hint}>
          {s ? <>{s.queued} {type.noun}{s.queued === 1 ? "" : "s"} still to email. Sent today: {s.sentToday} of {dailyCap}.</> : "Add a list first."}{" "}
          A new sending address warms up best with a modest number a day.
        </p>
        <div style={row}>
          <label style={{ ...row, color: "#94a3b8" }}>Most per day <input style={{ ...input, width: 80 }} type="number" min={1} max={300} value={dailyCap} onChange={(e) => setDailyCap(Number(e.target.value))} /></label>
          <span style={{ flex: 1 }} />
          <button style={{ ...btn, fontSize: "1.05rem", padding: "0.7rem 1.4rem" }} disabled={busy || !s || s.queued === 0} onClick={sendToday}>
            {busy ? "Sending…" : toSend ? `Send to ${toSend} ${type.noun}${toSend === 1 ? "" : "s"}` : "Send"}
          </button>
        </div>
        {msg(3)}
      </section>

      {/* ---------- Results ---------- */}
      <section style={box}>
        <h2 style={{ margin: "0 0 0.2rem", fontSize: "1.15rem" }}>Results</h2>
        <p style={hint}>For the mailing &ldquo;{campaign}&rdquo;. An address that bounces or is refused is taken off automatically and never emailed again. <button style={{ ...ghost, padding: "0.1rem 0.6rem", fontSize: "0.8rem" }} onClick={() => refresh()}>Refresh</button></p>
        {s && s.sent === 0 ? <p style={{ color: "#94a3b8" }}>Nothing sent yet. Results appear here once you send.</p> : null}
        {s && (
          <div className="admin-stats">
            <Stat v={s.sent} l="Emails sent" />
            <Stat v={s.delivered} l={`Delivered${pct(s.delivered, s.sent)}`} />
            <Stat v={s.previewed} l={`Opened their sample card${pct(s.previewed, s.sent)}`} />
            <Stat v={s.clickedApp} l={`Clicked Get TapCard${pct(s.clickedApp, s.sent)}`} />
            <Stat v={s.clickedHow} l="Read how it works" />
            <Stat v={s.clickedVideo} l="Watched the demo" />
            <Stat v={s.clickedAny} l={`Clicked anything${pct(s.clickedAny, s.sent)}`} />
            <Stat v={s.unsubscribed} l="Unsubscribed" />
            <Stat v={s.bounced} l="Bounced" />
            <Stat v={s.queued} l="Still to send" />
          </div>
        )}
        {bounces.length > 0 && (
          <details style={{ marginTop: "0.9rem" }} open={s ? s.sent >= 20 && s.bounced / s.sent > 0.08 : false}>
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
      </section>
    </div>
  );
}

function StepTitle({ n, title, done }: { n: number; title: string; done: boolean }) {
  return (
    <h2 style={{ margin: 0, fontSize: "1.15rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 14, background: done ? "#34d399" : "#fbbf24", color: "#0b1020", fontWeight: 800, fontSize: "0.95rem" }}>{done ? "✓" : n}</span>
      {title}
    </h2>
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

// One row per restaurant: tick = email them, untick = don't.
function PeopleTable({ rows, setRows, input, ghost }: {
  rows: PRow[];
  setRows: (fn: PRow[] | ((r: PRow[]) => PRow[])) => void;
  input: React.CSSProperties;
  ghost: React.CSSProperties;
}) {
  const [filter, setFilter] = useState("");
  const f = filter.trim().toLowerCase();
  const shown = f ? rows.filter((r) => (r.name + " " + r.email).toLowerCase().includes(f)) : rows;
  const patch = (id: number, p: Partial<PRow>) => setRows((all) => all.map((r) => (r.id === id ? { ...r, ...p } : r)));
  const setAll = (on: boolean) => setRows((all) => all.map((r) => (shown.some((x) => x.id === r.id) ? { ...r, on } : r)));
  return (
    <div>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center", marginBottom: "0.5rem" }}>
        <input style={{ ...input, minWidth: 220 }} placeholder="Find one…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <button style={{ ...ghost, padding: "0.25rem 0.7rem" }} onClick={() => setAll(true)}>Tick all shown</button>
        <button style={{ ...ghost, padding: "0.25rem 0.7rem" }} onClick={() => setAll(false)}>Untick all shown</button>
        <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{rows.filter((r) => r.on).length} to email · {rows.filter((r) => !r.on).length} won&rsquo;t be emailed</span>
      </div>
      <div style={{ maxHeight: 420, overflowY: "auto", fontSize: "0.9rem", color: "#cbd5e1" }}>
        {shown.map((r) => (
          <label key={r.id} style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr) minmax(0,1fr)", gap: "0.7rem", alignItems: "center", padding: "0.25rem 0", opacity: r.on ? 1 : 0.45, cursor: "pointer" }}>
            <input type="checkbox" checked={r.on} onChange={(e) => patch(r.id, { on: e.target.checked })} />
            <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
            <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#94a3b8" }}>{r.email}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
