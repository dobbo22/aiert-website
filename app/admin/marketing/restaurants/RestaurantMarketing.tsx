"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dashboard, LeadRow, TimelineEvent } from "@/lib/marketing";

type Data = Dashboard & { subjects: string[]; hardLimit: number };
type Filter = "hot" | "all" | "tosend" | "emailed" | "opened" | "clicked" | "signedup" | "interested" | "bounced" | "held" | "unsub";

const STAGES: [string, string][] = [["new", "New"], ["interested", "Interested"], ["signed_up", "Signed up"], ["not_interested", "Not interested"]];

const pct = (n: number, of: number) => (of > 0 ? `${Math.round((n / of) * 100)}%` : "–");
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "");
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/// Hot: they did something that shows interest (clicked, opened their sample card, made a TapCard, or you marked them interested).
const isHot = (l: LeadRow) => l.click_count > 0 || !!l.preview_first_at || !!l.card_at || l.stage === "interested" || l.stage === "signed_up";
const isEmailed = (l: LeadRow) => l.sends > 0;

function matches(l: LeadRow, f: Filter): boolean {
  switch (f) {
    case "hot": return isHot(l) && l.state !== "unsubscribed";
    case "all": return true;
    case "tosend": return l.state === "queued" && l.sends === 0;
    case "emailed": return isEmailed(l);
    case "opened": return !!l.opened_at;
    case "clicked": return l.click_count > 0 || !!l.preview_first_at;
    case "signedup": return !!l.card_at || l.stage === "signed_up";
    case "interested": return l.stage === "interested";
    case "bounced": return !!l.bounced_at;
    case "held": return l.state === "held" || l.state === "removed" || l.state === "emailed_before";
    case "unsub": return l.state === "unsubscribed";
  }
}

async function call(body: Record<string, unknown>): Promise<{ ok?: boolean; error?: string; [k: string]: unknown }> {
  const res = await fetch("/api/admin/marketing/restaurants", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  if (!res) return { error: "No connection. Try again." };
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  if (!res.ok) return { error: data?.error ?? `Something went wrong (${res.status})` };
  return (data ?? {}) as { ok?: boolean };
}

export default function RestaurantMarketing() {
  const [data, setData] = useState<Data | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("hot");
  const [search, setSearch] = useState("");
  const [shown, setShown] = useState(50);
  const [open, setOpen] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/marketing/restaurants", { cache: "no-store" }).catch(() => null);
    if (!res) { setLoadError("No connection. Try again."); return; }
    const json = (await res.json().catch(() => null)) as (Data & { error?: string }) | null;
    if (!res.ok || !json || json.error) { setLoadError(json?.error ?? `Couldn't load the results (${res.status}).`); return; }
    setLoadError(null);
    setData(json);
  }, []);
  useEffect(() => {
    // Loaded after the page appears (a timer, so the state is set from a callback, not during the effect itself).
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const leads = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.leads.filter((l) => matches(l, filter) && (!q || `${l.name} ${l.email} ${l.area} ${l.batch} ${l.website}`.toLowerCase().includes(q)));
  }, [data, filter, search]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { hot: 0, all: 0, tosend: 0, emailed: 0, opened: 0, clicked: 0, signedup: 0, interested: 0, bounced: 0, held: 0, unsub: 0 };
    if (data) for (const l of data.leads) for (const f of Object.keys(c) as Filter[]) if (matches(l, f)) c[f]++;
    return c;
  }, [data]);

  if (loadError && !data) {
    return (
      <div className="mkr">
        <div className="mkr-error">{loadError}</div>
        <button className="mkr-btn" onClick={() => void load()}>Try again</button>
      </div>
    );
  }
  if (!data) return <div className="mkr mkr-muted">Loading…</div>;

  return (
    <div className="mkr">
      {loadError && <div className="mkr-error">{loadError}</div>}
      <Results data={data} />
      <SendPanel data={data} onChanged={load} />
      <Lists data={data} />
      <section className="mkr-section">
        <h2>Leads</h2>
        <div className="mkr-chips" role="tablist">
          {([["hot", "Hot"], ["all", "All"], ["tosend", "To send"], ["emailed", "Emailed"], ["opened", "Opened"], ["clicked", "Clicked"], ["signedup", "Signed up"], ["interested", "Interested"], ["bounced", "Bounced"], ["held", "Held back"], ["unsub", "Unsubscribed"]] as [Filter, string][]).map(([f, label]) => (
            <button key={f} className={`mkr-chip ${filter === f ? "on" : ""}`} onClick={() => { setFilter(f); setShown(50); setOpen(null); }}>{label} {counts[f]}</button>
          ))}
        </div>
        <div className="mkr-row" style={{ marginBottom: "0.8rem" }}>
          <input type="search" placeholder="Search name, email, area or list" value={search} onChange={(e) => { setSearch(e.target.value); setShown(50); }} style={{ minWidth: 260 }} aria-label="Search leads" />
          <button className="mkr-btn ghost" onClick={() => downloadCsv(leads)} disabled={leads.length === 0}>Download these as CSV</button>
        </div>
        {filter === "hot" && <p className="mkr-muted" style={{ marginBottom: "0.8rem" }}>Hot = clicked a link, opened their sample card, made a TapCard, or you marked them interested. Ring these first.</p>}
        <div className="mkr-scroll">
          <table className="mkr-table">
            <thead><tr><th>Place</th><th>What happened</th><th>Last email</th><th>Stage</th></tr></thead>
            <tbody>
              {leads.slice(0, shown).map((l) => (
                <LeadRows key={l.id} l={l} open={open === l.id} onToggle={() => setOpen(open === l.id ? null : l.id)} onChanged={load} />
              ))}
              {leads.length === 0 && <tr><td colSpan={4} className="mkr-muted">Nobody here yet.</td></tr>}
            </tbody>
          </table>
        </div>
        {leads.length > shown && <p style={{ marginTop: "0.8rem" }}><button className="mkr-btn ghost" onClick={() => setShown(shown + 50)}>Show 50 more ({leads.length - shown} left)</button></p>}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------------------------

function Results({ data }: { data: Data }) {
  const s = data.summary;
  const hotCount = data.leads.filter((l) => isHot(l) && l.state !== "unsubscribed").length;
  const funnel: [string, number][] = [["Emailed", s.emailed], ["Delivered", s.delivered], ["Opened", s.opened], ["Clicked or previewed", data.leads.filter((l) => l.click_count > 0 || l.preview_first_at).length], ["Signed up", s.signedUp]];
  return (
    <section className="mkr-section">
      <h2>Results</h2>
      <div className="mkr-kpis">
        <div className="mkr-kpi"><b>{s.emailed}</b><span>Emailed</span><small>{s.toSend} still to send</small></div>
        <div className="mkr-kpi"><b>{s.delivered}</b><span>Delivered</span><small>{pct(s.delivered, s.emailed)} of emailed</small></div>
        <div className="mkr-kpi"><b>{s.opened}</b><span>Opened</span><small>{pct(s.opened, s.emailed)}{data.opensSeen ? "" : " (not tracking yet)"}</small></div>
        <div className="mkr-kpi hot"><b>{hotCount}</b><span>Hot leads</span><small>clicked, previewed or signed up</small></div>
        <div className="mkr-kpi good"><b>{s.signedUp}</b><span>Signed up</span><small>{pct(s.signedUp, s.emailed)} of emailed</small></div>
        <div className="mkr-kpi bad"><b>{s.bounced}</b><span>Bounced</span><small>{pct(s.bounced, s.emailed)}</small></div>
        <div className="mkr-kpi"><b>{s.unsubscribed}</b><span>Unsubscribed</span><small>{pct(s.unsubscribed, s.emailed)}</small></div>
      </div>
      <div className="mkr-funnel" aria-label="From emailed to signed up">
        {funnel.map(([label, n]) => (
          <div key={label} className="mkr-funnel-row">
            <span>{label}</span>
            <div className="mkr-funnel-bar"><i style={{ width: `${s.emailed ? Math.max(2, (n / s.emailed) * 100) : 0}%` }} /></div>
            <em>{n} · {pct(n, s.emailed)}</em>
          </div>
        ))}
      </div>
      <DayChart days={data.days} />
      {!data.opensSeen && s.emailed >= 10 && (
        <p className="mkr-note">No opens recorded yet. To track opens, turn on <b>open tracking</b> for your sending domain in Resend (Domains), and make sure the Resend webhook includes <b>email.opened</b>. Opens are only a guide, because Apple Mail hides them: clicks and sample-card views are the reliable signal.</p>
      )}
    </section>
  );
}

function DayChart({ days }: { days: Data["days"] }) {
  const max = Math.max(1, ...days.flatMap((d) => [d.sent, d.opened, d.clicked]));
  const w = 720, h = 150, bw = w / days.length;
  if (days.every((d) => d.sent + d.opened + d.clicked === 0)) return <p className="mkr-muted" style={{ marginTop: "1rem" }}>Nothing sent in the last 30 days yet.</p>;
  return (
    <div style={{ marginTop: "1rem" }}>
      <svg className="mkr-chart" viewBox={`0 0 ${w} ${h + 18}`} preserveAspectRatio="none" role="img" aria-label="Emails sent, opened and clicked each day for 30 days">
        {days.map((d, i) => {
          const x = i * bw;
          const bar = (v: number, off: number, c: string) => <rect key={c} x={x + 2 + off} y={h - (v / max) * h} width={Math.max(1, bw / 3 - 2)} height={(v / max) * h} fill={c} />;
          return (
            <g key={d.day}>
              <title>{`${d.day}: ${d.sent} sent, ${d.opened} opened, ${d.clicked} clicked`}</title>
              {bar(d.sent, 0, "#94a3b8")}{bar(d.opened, bw / 3, "#38bdf8")}{bar(d.clicked, (2 * bw) / 3, "#fbbf24")}
              {i % 5 === 0 && <text x={x} y={h + 14} fontSize="10" fill="#e2e8f0">{day(d.day)}</text>}
            </g>
          );
        })}
      </svg>
      <div className="mkr-legend"><span style={{ ["--c" as string]: "#94a3b8" }}>Sent</span><span style={{ ["--c" as string]: "#38bdf8" }}>Opened</span><span style={{ ["--c" as string]: "#fbbf24" }}>Clicked or previewed</span></div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------------------------

function SendPanel({ data, onChanged }: { data: Data; onChanged: () => Promise<void> }) {
  const [text, setText] = useState("");
  const [batch, setBatch] = useState("");
  const [includeUnchecked, setIncludeUnchecked] = useState(false);
  const [includePersonal, setIncludePersonal] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [testTo, setTestTo] = useState("");
  const [sample, setSample] = useState<"restaurant" | "cafe">("restaurant");
  const [subjectIndex, setSubjectIndex] = useState(0);
  const [count, setCount] = useState(25);
  const [dailyCap, setDailyCap] = useState(50);
  const [paused, setPaused] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const s = data.summary;

  async function run<T extends { error?: string }>(label: string, fn: () => Promise<T>, done: (r: T) => string) {
    setBusy(label); setMsg(null);
    const r = await fn();
    setBusy(null);
    if (r.error) { setMsg({ ok: false, text: r.error }); setPaused(/paused/i.test(r.error)); } else { setMsg({ ok: true, text: done(r) }); setPaused(false); await onChanged(); }
  }

  return (
    <section className="mkr-section">
      <h2>Send</h2>
      <p className="mkr-muted" style={{ marginBottom: "1rem" }}>
        <b>{s.toSend}</b> {s.toSend === 1 ? "place is" : "places are"} waiting to be emailed. Sent today: <b>{data.todaySent}</b>.
      </p>
      <div className="mkr-steps">
        <div className="mkr-step">
          <div className="mkr-step-head"><span className="mkr-step-num">1</span><b>Add a list</b></div>
          <p className="mkr-muted" style={{ marginBottom: "0.6rem" }}>A CSV from the list-maker (columns: name, email, phone, website, address, check), or paste one. Addresses that don&apos;t work are never added.</p>
          <div className="mkr-row" style={{ marginBottom: "0.6rem" }}>
            <input ref={file} type="file" accept=".csv,.txt,text/csv" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { setText(await f.text()); if (!batch) setBatch(f.name.replace(/\.[^.]+$/, "")); } }} aria-label="Choose a CSV file" />
            <input type="text" placeholder="List name, for example W1" value={batch} onChange={(e) => setBatch(e.target.value)} aria-label="List name" />
          </div>
          <textarea placeholder="…or paste the list here" value={text} onChange={(e) => setText(e.target.value)} aria-label="Paste a list" />
          <div className="mkr-row" style={{ margin: "0.6rem 0" }}>
            <label><input type="checkbox" checked={includeUnchecked} onChange={(e) => setIncludeUnchecked(e.target.checked)} /> Include addresses that couldn&apos;t be checked</label>
            <label><input type="checkbox" checked={includePersonal} onChange={(e) => setIncludePersonal(e.target.checked)} /> Include Gmail-type addresses</label>
          </div>
          <div className="mkr-row">
            <button className="mkr-btn" disabled={!!busy || !text.trim()} onClick={() => void run("import", () => call({ action: "import", text, batch, includeUnchecked, includePersonal }) as Promise<{ error?: string; result?: Record<string, number> }>, (r) => {
              const x = r.result ?? {};
              setText("");
              return `Added ${x.added ?? 0} new (${x.queued ?? 0} ready to send, ${x.held ?? 0} held back). ${x.alreadyEmailed ?? 0} were emailed before, ${x.unsubscribed ?? 0} asked not to be emailed, ${x.removedDead ?? 0} dead addresses left out.`;
            })}>{busy === "import" ? "Adding…" : "Add to list"}</button>
            <button className="mkr-btn ghost" disabled={!!busy} onClick={() => void run("bring", () => call({ action: "bring-over" }) as Promise<{ error?: string; result?: { leads: number; sends: number } }>, (r) => `Brought in ${r.result?.leads ?? 0} places and ${r.result?.sends ?? 0} earlier emails from your first mailing.`)}>Bring in my earlier mailing (W9, W2…)</button>
            {s.held > 0 && <button className="mkr-btn ghost" disabled={!!busy} onClick={() => void run("held", () => call({ action: "queue-held" }) as Promise<{ error?: string; queued?: number }>, (r) => `${r.queued ?? 0} held-back places are now ready to send.`)}>Send to the {s.held} held back too</button>}
          </div>
        </div>

        <div className="mkr-step">
          <div className="mkr-step-head"><span className="mkr-step-num">2</span><b>Send yourself a test</b></div>
          <div className="mkr-row">
            <input type="email" placeholder="your@email.com" value={testTo} onChange={(e) => setTestTo(e.target.value)} aria-label="Email address for the test" />
            <select value={sample} onChange={(e) => setSample(e.target.value as "restaurant" | "cafe")} aria-label="Sample type"><option value="restaurant">Sample restaurant</option><option value="cafe">Sample cafe</option></select>
            <select value={subjectIndex} onChange={(e) => setSubjectIndex(Number(e.target.value))} aria-label="Subject line">{data.subjects.map((t, i) => <option key={i} value={i}>{t.replace("{Name}", "Name")}</option>)}</select>
            <button className="mkr-btn" disabled={!!busy || !testTo.trim()} onClick={() => void run("test", () => call({ action: "test", to: testTo, sample, subjectIndex }), () => `Test sent to ${testTo}. Check your inbox (and junk).`)}>{busy === "test" ? "Sending…" : "Send me a test"}</button>
          </div>
        </div>

        <div className="mkr-step">
          <div className="mkr-step-head"><span className="mkr-step-num">3</span><b>Send the next batch</b></div>
          <div className="mkr-row">
            <label>Send the next <select value={count} onChange={(e) => setCount(Number(e.target.value))}>{[10, 25, 40].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
            <label>Daily limit <select value={dailyCap} onChange={(e) => setDailyCap(Number(e.target.value))}>{[25, 50, data.hardLimit].map((n) => <option key={n} value={n}>{n} a day</option>)}</select></label>
            <button className="mkr-btn big" disabled={!!busy || s.toSend === 0} onClick={() => { if (window.confirm(`Send to the next ${Math.min(count, s.toSend)} places now?`)) void run("send", () => call({ action: "send", count, dailyCap, subjectIndex }) as Promise<{ error?: string; sent?: number; failed?: number; refused?: string[]; errors?: string[]; message?: string }>, sendSummary); }}>{busy === "send" ? "Sending…" : `Send to ${Math.min(count, s.toSend)}`}</button>
            {paused && <button className="mkr-btn warn" disabled={!!busy} onClick={() => void run("send", () => call({ action: "send", count, dailyCap, subjectIndex, override: true }) as Promise<{ error?: string; sent?: number }>, sendSummary)}>Send anyway…</button>}
          </div>
          <p className="mkr-muted" style={{ marginTop: "0.5rem" }}>Uses the subject chosen in step 2. A free Resend plan allows 100 emails a day. If too many bounce, sending pauses by itself to protect your address.</p>
        </div>
      </div>
      {msg && <div className={msg.ok ? "mkr-ok" : "mkr-error"} style={msg.ok ? undefined : { marginTop: "0.8rem", marginBottom: 0 }} role="status">{msg.text}</div>}
    </section>
  );
}

function sendSummary(r: { sent?: number; failed?: number; refused?: string[]; errors?: string[]; message?: string }): string {
  if (r.message) return r.message;
  const parts = [`Sent ${r.sent ?? 0}.`];
  if (r.refused?.length) parts.push(`${r.refused.length} address${r.refused.length === 1 ? " was" : "es were"} refused and taken off the list.`);
  if (r.failed) parts.push(`${r.failed} failed: ${(r.errors ?? []).join("; ")}`);
  return parts.join(" ");
}

function Lists({ data }: { data: Data }) {
  if (data.batches.length === 0) return null;
  return (
    <section className="mkr-section">
      <h2>Results by list</h2>
      <div className="mkr-scroll">
        <table className="mkr-table">
          <thead><tr><th>List</th><th>Places</th><th>Emailed</th><th>Opened</th><th>Clicked</th><th>Signed up</th></tr></thead>
          <tbody>
            {data.batches.map((b) => (
              <tr key={b.batch}>
                <td className="mkr-name">{b.batch}</td><td>{b.leads}</td><td>{b.emailed}</td>
                <td>{b.opened} <span className="mkr-sub">{pct(b.opened, b.emailed)}</span></td>
                <td>{b.clicked} <span className="mkr-sub">{pct(b.clicked, b.emailed)}</span></td>
                <td>{b.signedUp} <span className="mkr-sub">{pct(b.signedUp, b.emailed)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------------------------------

function Pills({ l }: { l: LeadRow }) {
  const pills: [string, string][] = [];
  if (l.card_at) pills.push([l.card_verified ? "Has a verified TapCard" : "Made a TapCard", "good"]);
  if (l.click_count > 0) pills.push([`Clicked${l.click_count > 1 ? ` ×${l.click_count}` : ""}`, "hot"]);
  if (l.preview_first_at) pills.push(["Opened sample card", "hot"]);
  if (l.opened_at) pills.push([`Opened${l.open_count > 1 ? ` ×${l.open_count}` : ""}`, "blue"]);
  if (l.bounced_at) pills.push(["Bounced", "bad"]);
  if (l.state === "unsubscribed") pills.push(["Unsubscribed", "bad"]);
  if (l.sends > 0 && !l.bounced_at && l.delivered_at && !l.opened_at && l.click_count === 0) pills.push(["Delivered", "good"]);
  if (l.sends > 0 && !l.delivered_at && !l.opened_at && !l.bounced_at && l.click_count === 0) pills.push(["Sent", ""]);
  if (l.sends === 0) pills.push([l.state === "queued" ? "To send" : l.state === "held" ? `Held: ${l.hold_reason}` : l.state === "emailed_before" ? "Emailed before" : l.state === "removed" ? `Off the list: ${l.hold_reason}` : "Not emailed", ""]);
  return <div className="mkr-pills">{pills.map(([t, c]) => <span key={t} className={`mkr-pill ${c}`}>{t}</span>)}</div>;
}

function LeadRows({ l, open, onToggle, onChanged }: { l: LeadRow; open: boolean; onToggle: () => void; onChanged: () => Promise<void> }) {
  const [notes, setNotes] = useState(l.notes);
  const [timeline, setTimeline] = useState<TimelineEvent[] | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open || timeline) return;
    void fetch(`/api/admin/marketing/restaurants?timeline=${l.id}`, { cache: "no-store" }).then((r) => r.json()).then((j: { timeline?: TimelineEvent[] }) => setTimeline(j.timeline ?? [])).catch(() => setTimeline([]));
  }, [open, timeline, l.id]);
  async function patch(p: Record<string, unknown>) {
    setSaving(true);
    await call({ action: "lead", id: l.id, ...p });
    setSaving(false);
    setTimeline(null);
    await onChanged();
  }
  return (
    <>
      <tr className="row" onClick={onToggle}>
        <td><div className="mkr-name">{l.name || l.email}</div><div className="mkr-sub">{l.email}{l.area ? ` · ${l.area}` : ""}{l.batch ? ` · ${l.batch}` : ""}</div></td>
        <td><Pills l={l} /></td>
        <td>{l.sent_at ? <>{day(l.sent_at)}<div className="mkr-sub">{l.sends > 1 ? `${l.sends} emails` : ""}</div></> : <span className="mkr-sub">–</span>}</td>
        <td onClick={(e) => e.stopPropagation()}>
          <select value={l.stage} disabled={saving} onChange={(e) => void patch({ stage: e.target.value })} aria-label={`Stage for ${l.name || l.email}`}>
            {STAGES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
          </select>
        </td>
      </tr>
      {open && (
        <tr className="mkr-detail"><td colSpan={4}>
          <div className="mkr-detail-grid">
            <div>
              <p className="mkr-sub" style={{ marginBottom: "0.4rem" }}>{[l.phone, l.website, l.address].filter(Boolean).join(" · ") || "No other details"}</p>
              <label style={{ display: "block", marginBottom: "0.3rem" }}>Notes (calls, replies, what they said)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} aria-label="Notes" />
              <div className="mkr-row" style={{ marginTop: "0.5rem" }}>
                <button className="mkr-btn" disabled={saving || notes === l.notes} onClick={() => void patch({ notes })}>Save notes</button>
                <select value={l.kind} disabled={saving} onChange={(e) => void patch({ kind: e.target.value })} aria-label="Type of place"><option value="restaurant">Restaurant</option><option value="cafe">Cafe / coffee shop</option></select>
                {(l.state === "queued" || l.state === "held") && <button className="mkr-btn ghost" disabled={saving} onClick={() => void patch({ state: "removed" })}>Take off the list</button>}
                {(l.state === "removed" || l.state === "held") && !["bounced", "unsubscribed", "marked as spam"].includes(l.hold_reason) && <button className="mkr-btn ghost" disabled={saving} onClick={() => void patch({ state: "queued" })}>Put back</button>}
              </div>
              {l.bounce_reason && <p className="mkr-sub" style={{ marginTop: "0.5rem" }}>Bounce: {l.bounce_reason}</p>}
            </div>
            <div>
              <b>History</b>
              {timeline === null ? <p className="mkr-sub">Loading…</p> : timeline.length === 0 ? <p className="mkr-sub">Nothing yet.</p> : (
                <ul className="mkr-timeline">{timeline.map((e, i) => <li key={i}><time>{when(e.at)}</time>{labelFor(e)}</li>)}</ul>
              )}
            </div>
          </div>
        </td></tr>
      )}
    </>
  );
}

const labelFor = (e: TimelineEvent) => ({ sent: "Email sent", opened: "Opened the email", clicked: `Clicked: ${e.detail}`, preview: "Opened their sample card", bounced: `Bounced ${e.detail}`, unsubscribed: "Unsubscribed", complained: "Marked as spam", stage: `You moved them to ${e.detail}` } as Record<string, string>)[e.type] ?? e.type;

function downloadCsv(rows: LeadRow[]) {
  const head = ["name", "email", "phone", "website", "address", "area", "list", "stage", "state", "emails sent", "last sent", "opened", "clicks", "opened sample card", "made a TapCard", "notes"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map((l) => [l.name, l.email, l.phone, l.website, l.address, l.area, l.batch, l.stage, l.state, l.sends, l.sent_at ?? "", l.opened_at ? "yes" : "", l.click_count, l.preview_first_at ? "yes" : "", l.card_at ? "yes" : "", l.notes].map(esc).join(","));
  const blob = new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `restaurant-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
