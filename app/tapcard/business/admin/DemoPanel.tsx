"use client";

import { useEffect, useState } from "react";
import { SETTINGS_KEY, STATE_KEY, defaultSettings, loadSettings, type DemoSettings } from "./DemoPresenter";

// Overview, demo company only: how to run the demo, and the date, wording and numbers it uses. The bar at the bottom of every page does the running.
export default function DemoPanel() {
  const [s, setS] = useState<DemoSettings>(() => defaultSettings());
  useEffect(() => { queueMicrotask(() => setS(loadSettings())); }, []);
  function set(patch: Partial<DemoSettings>) {
    const next = { ...s, ...patch };
    setS(next);
    try { window.sessionStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch { /* used for this page only */ }
  }
  const [clearing, setClearing] = useState(false);
  const [note, setNote] = useState("");
  async function clearNow() {
    setClearing(true); setNote("");
    const res = await fetch("/api/tapcard/biz/demo-sim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "clear" }) }).catch(() => null);
    setClearing(false);
    if (!res?.ok) { setNote("That did not work. Try again."); return; }
    try { window.sessionStorage.removeItem(STATE_KEY); } catch { /* ignore */ }
    window.location.reload();
  }
  const field = "rounded-lg bg-black/30 px-2 py-1 text-cloud ring-1 ring-slate";
  return (
    <section className="mb-6 rounded-2xl bg-charcoal p-6 ring-1 ring-gold/60 print:hidden" aria-label="Demo">
      <p className="text-sm font-semibold uppercase tracking-wider text-gold">Demo company: made-up IPO story</p>
      <h2 className="mt-1 text-xl font-black text-cloud">Press Space to run the demo</h2>
      <p className="mt-1 text-sm text-cloud">The bar at the bottom of the page does it step by step and opens the page where each result shows. Space or → next, ← back, A plays on by itself, H hides the bar and captions. Everyone in it is made up. Switch Live on (top right) so the numbers move.</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" disabled={clearing} onClick={clearNow} className="rounded-xl px-4 py-2 text-sm font-semibold text-cloud ring-1 ring-slate hover:ring-mist disabled:opacity-50">Clear the demo data now</button>
        <span className="text-sm text-cloud">Removes the made-up people, headlines and roadshow. People who really follow stay.</span>
        {note && <span role="status" className="text-sm font-semibold text-cloud">{note}</span>}
      </div>
      <details className="mt-3 text-sm text-cloud">
        <summary className="cursor-pointer font-semibold">Change the date, wording or numbers</summary>
        <div className="mt-3 grid gap-3">
          <label className="grid gap-1">Roadshow starts (day 1; day 2 follows)<input type="date" value={s.day} onChange={(e) => set({ day: e.target.value })} className={`${field} w-48`} /></label>
          <label className="grid gap-1">Broker headline<input value={s.broker} maxLength={140} onChange={(e) => set({ broker: e.target.value })} className={field} /></label>
          <label className="grid gap-1">IPO headline<input value={s.ipo} maxLength={140} onChange={(e) => set({ ipo: e.target.value })} className={field} /></label>
          <label className="grid gap-1">Listing and raise headline<input value={s.raise} maxLength={140} onChange={(e) => set({ raise: e.target.value })} className={field} /></label>
          <label className="grid gap-1">Story link<input value={s.link} onChange={(e) => set({ link: e.target.value })} inputMode="url" className={field} /></label>
          <div className="flex flex-wrap gap-4">
            <label className="grid gap-1">Taps on the raise news<input value={s.taps} onChange={(e) => set({ taps: e.target.value })} inputMode="numeric" className={`${field} w-20`} /></label>
            <label className="grid gap-1">New followers after it<input value={s.late} onChange={(e) => set({ late: e.target.value })} inputMode="numeric" className={`${field} w-20`} /></label>
          </div>
          <p className="opacity-80">The firms, people and meeting times are in lib/demoScenario.ts.</p>
        </div>
      </details>
    </section>
  );
}
