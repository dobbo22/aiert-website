"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// The simulated AGM for the demo company (Example Resources plc) only. Made-up people; run in small batches so the admin moves on screen.
// Turn on Live (top right) to watch the numbers climb.
type Ev = { code: string; label: string };

export default function DemoPanel({ events }: { events: Ev[] }) {
  const router = useRouter();
  const [event, setEvent] = useState(events[0]?.code ?? "");
  const [people, setPeople] = useState("40");
  const [taps, setTaps] = useState("15");
  const [late, setLate] = useState("25");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("Ready. Made-up people only.");

  async function call(body: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch("/api/tapcard/biz/demo-sim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { error?: string } | null;
    return { ok: !!res?.ok, error: data?.error ?? (res ? undefined : "No connection.") };
  }
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  async function arrive() {
    if (!event) { setMsg("Create an event first (Cards & QR, Events), then choose it here."); return; }
    const total = Math.max(0, Math.min(200, Number(people) || 0));
    setBusy(true);
    try {
      let done = 0;
      while (done < total) {
        const n = Math.min(4, total - done);
        const r = await call({ action: "arrive", event, count: n, start: done + 1 });
        if (!r.ok) { setMsg(r.error ?? "That did not work."); return; }
        done += n; setMsg(`${done} of ${total} have arrived...`); router.refresh();
        await wait(done % 12 === 0 ? 2500 : 900);
      }
      setMsg(`Everyone is in (${total}).`);
    } finally { setBusy(false); }
  }

  async function results() {
    const t = Math.max(0, Math.min(200, Number(taps) || 0)), l = Math.max(0, Math.min(100, Number(late) || 0));
    setBusy(true);
    try {
      let done = 0;
      while (done < t) {
        const n = Math.min(5, t - done);
        const r = await call({ action: "results", taps: n, late: 0 });
        if (!r.ok) { setMsg(r.error ?? "That did not work."); return; }
        done += n; setMsg(`${done} of ${t} have tapped the headline...`); router.refresh(); await wait(1000);
      }
      let added = 0;
      while (added < l) {
        const n = Math.min(4, l - added);
        const r = await call({ action: "results", taps: 0, late: n, start: 101 + added });
        if (!r.ok) { setMsg(r.error ?? "That did not work."); return; }
        added += n; setMsg(`${added} of ${l} new followers...`); router.refresh(); await wait(900);
      }
      setMsg(`Results read: ${t} taps, ${l} new followers.`);
    } finally { setBusy(false); }
  }

  async function clear() {
    setBusy(true);
    try {
      const r = await call({ action: "clear" });
      setMsg(r.ok ? "Cleared. The numbers start from zero." : r.error ?? "That did not work.");
      router.refresh();
    } finally { setBusy(false); }
  }

  const btn = "rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-50";
  const field = "w-20 rounded-lg bg-black/30 px-2 py-1 text-cloud ring-1 ring-slate";
  return (
    <section className="mb-6 rounded-2xl bg-charcoal p-6 ring-1 ring-gold/60 print:hidden" aria-label="Demo simulation">
      <p className="text-sm font-semibold uppercase tracking-wider text-gold">Simulation: demo company only</p>
      <h2 className="mt-1 text-xl font-black text-cloud">Run a made-up AGM</h2>
      <p className="mt-1 text-sm text-cloud">Made-up people (Demo Investor n, example.org). Say it is a simulation. Switch Live on (top right) to watch it move.</p>
      <div className="mt-4 flex flex-wrap items-end gap-4 text-sm text-cloud">
        <label className="grid gap-1">Event
          <select value={event} onChange={(e) => setEvent(e.target.value)} className="rounded-lg bg-black/30 px-2 py-1 text-cloud ring-1 ring-slate">
            {events.length === 0 && <option value="">No events yet</option>}
            {events.map((e) => <option key={e.code} value={e.code}>{e.label}</option>)}
          </select>
        </label>
        <label className="grid gap-1">People<input value={people} onChange={(e) => setPeople(e.target.value)} inputMode="numeric" className={field} /></label>
        <label className="grid gap-1">Taps<input value={taps} onChange={(e) => setTaps(e.target.value)} inputMode="numeric" className={field} /></label>
        <label className="grid gap-1">Then follow<input value={late} onChange={(e) => setLate(e.target.value)} inputMode="numeric" className={field} /></label>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" disabled={busy} onClick={arrive} className={`${btn} bg-gold text-black`}>1  AGM arrives</button>
        <button type="button" disabled={busy} onClick={results} className={`${btn} bg-teal text-black`}>2  Results read</button>
        <button type="button" disabled={busy} onClick={clear} className={`${btn} text-cloud ring-1 ring-slate hover:ring-mist`}>3  Clear</button>
      </div>
      <p role="status" className="mt-3 text-sm text-cloud">{msg}</p>
    </section>
  );
}
