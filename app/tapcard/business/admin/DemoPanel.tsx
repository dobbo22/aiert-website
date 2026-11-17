"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// The guided demo run for the demo company (Example Resources plc) only: made-up people, steps in a good order for a live showing.
// Each step does its action and then opens the page where the result shows; come back to Overview and press the next step.
// Switch Live on (top right) to watch the numbers move.
type Ev = { code: string; label: string };
type Saved = { step: number; event: string };

const KEY = "tapcard.demo.run";
const STEPS = [
  { key: "event", title: "Create the Roadshow event", shows: "Cards & QR, Events" },
  { key: "headline", title: "Post the fundraise announcement", shows: "News" },
  { key: "arrive", title: "The AGM: people arrive and follow", shows: "Followers" },
  { key: "results", title: "Results read: more taps and followers", shows: "Insights" },
  { key: "clear", title: "Clear and start again", shows: "" },
] as const;
const PAGE: Record<string, string> = { event: "/business/admin/cards?tab=events", headline: "/business/admin/news", arrive: "/business/admin/followers", results: "/business/admin/insights" };

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

export default function DemoPanel({ events }: { events: Ev[] }) {
  const router = useRouter();
  const [saved, setSaved] = useState<Saved>({ step: 0, event: "" });
  const [name, setName] = useState("Roadshow");
  const [day, setDay] = useState("");
  const [text, setText] = useState("Example Resources plc (demo): Fundraise announced. Read the announcement on our website.");
  const [link, setLink] = useState("https://tapcard.aiert.co.uk/investors");
  const [people, setPeople] = useState("40");
  const [taps, setTaps] = useState("15");
  const [late, setLate] = useState("25");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("Ready. Made-up people only.");

  useEffect(() => {
    let s: Saved = { step: 0, event: "" };
    try { const raw = window.sessionStorage.getItem(KEY); if (raw) s = { ...s, ...(JSON.parse(raw) as Saved) }; } catch { /* starts at step 1 */ }
    queueMicrotask(() => { setSaved(s); setDay(today()); });
  }, []);

  function save(next: Saved) {
    setSaved(next);
    try { window.sessionStorage.setItem(KEY, JSON.stringify(next)); } catch { /* the run still works, it just forgets its place */ }
  }
  async function call(body: Record<string, unknown>): Promise<{ ok: boolean; error?: string; code?: string }> {
    const res = await fetch("/api/tapcard/biz/demo-sim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { error?: string; code?: string } | null;
    return { ok: !!res?.ok, error: data?.error ?? (res ? undefined : "No connection."), code: data?.code };
  }
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const open = (page: string) => router.push(`${page}${page.includes("?") ? "&" : "?"}live=1`);
  const eventCode = () => saved.event || events.find((e) => e.label.toLowerCase() === name.trim().toLowerCase())?.code || events[0]?.code || "";

  async function run(i: number) {
    if (busy) return;
    const key = STEPS[i].key;
    setBusy(true);
    try {
      let code = saved.event;
      if (key === "event") {
        const d = day || today();
        const r = await call({ action: "event", label: name, startsAt: new Date(`${d}T00:00`).toISOString(), endsAt: new Date(`${d}T23:59`).toISOString() });
        if (!r.ok) { setMsg(r.error ?? "That did not work."); return; }
        code = r.code ?? "";
        setMsg("The event is ready, with its QR code.");
      } else if (key === "headline") {
        const r = await call({ action: "headline", text, link });
        if (!r.ok) { setMsg(r.error ?? "That did not work."); return; }
        setMsg("Posted. Followers' phones get the notification.");
      } else if (key === "arrive") {
        const ev = eventCode();
        if (!ev) { setMsg("Create the event first (step 1)."); return; }
        const total = Math.max(0, Math.min(200, Number(people) || 0));
        let done = 0;
        while (done < total) {
          const n = Math.min(4, total - done);
          const r = await call({ action: "arrive", event: ev, count: n, start: done + 1 });
          if (!r.ok) { setMsg(r.error ?? "That did not work."); return; }
          done += n; setMsg(`${done} of ${total} have arrived...`); router.refresh();
          await wait(done % 12 === 0 ? 2500 : 900);
        }
        setMsg(`Everyone is in (${total}).`);
      } else if (key === "results") {
        const t = Math.max(0, Math.min(200, Number(taps) || 0)), l = Math.max(0, Math.min(100, Number(late) || 0));
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
      } else {
        const r = await call({ action: "clear" });
        if (!r.ok) { setMsg(r.error ?? "That did not work."); return; }
        setMsg("Cleared. Everything starts from zero.");
        save({ step: 0, event: "" });
        router.refresh();
        return;
      }
      save({ step: Math.max(saved.step, i + 1), event: code });
      if (PAGE[key]) open(PAGE[key]); else router.refresh();
    } finally { setBusy(false); }
  }

  const cur = Math.min(saved.step, STEPS.length - 1);
  const field = "rounded-lg bg-black/30 px-2 py-1 text-cloud ring-1 ring-slate";
  return (
    <section className="mb-6 rounded-2xl bg-charcoal p-6 ring-1 ring-gold/60 print:hidden" aria-label="Demo run">
      <p className="text-sm font-semibold uppercase tracking-wider text-gold">Demo run: this demo company only</p>
      <h2 className="mt-1 text-xl font-black text-cloud">Made-up AGM, in order</h2>
      <p className="mt-1 text-sm text-cloud">Made-up people (Demo Investor n, example.org). Say it is a simulation. Each step opens the page where the result shows; come back to Overview for the next. Switch Live on (top right) to watch it move.</p>
      <ol className="mt-4 grid gap-2">
        {STEPS.map((s, i) => {
          const done = i < saved.step && s.key !== "clear", now = i === cur;
          return (
            <li key={s.key} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 ring-1 ${now ? "bg-gold/10 ring-gold/60" : "ring-slate/60"}`}>
              <span className="text-cloud"><span className="mr-2 font-black">{done ? "✓" : i + 1}</span><strong>{s.title}</strong>{s.shows && <span className="ml-2 text-sm opacity-80">shows {s.shows}</span>}</span>
              <button type="button" disabled={busy} onClick={() => run(i)}
                className={now ? "rounded-xl bg-gold px-5 py-2 text-sm font-bold text-black disabled:opacity-50" : "rounded-xl px-4 py-2 text-sm font-semibold text-cloud ring-1 ring-slate hover:ring-mist disabled:opacity-50"}>
                {now ? `Run step ${i + 1}` : done ? "Run again" : "Run"}
              </button>
            </li>
          );
        })}
      </ol>
      <p role="status" className="mt-3 text-sm font-semibold text-cloud">{msg}</p>
      <details className="mt-3 text-sm text-cloud">
        <summary className="cursor-pointer font-semibold">Change the wording, date or numbers</summary>
        <div className="mt-3 grid gap-3">
          <div className="flex flex-wrap gap-4">
            <label className="grid gap-1">Event name<input value={name} onChange={(e) => setName(e.target.value)} className={field} /></label>
            <label className="grid gap-1">Date (all day)<input type="date" value={day} onChange={(e) => setDay(e.target.value)} className={field} /></label>
          </div>
          <label className="grid gap-1">Headline (140 characters)<input value={text} maxLength={140} onChange={(e) => setText(e.target.value)} className={field} /></label>
          <label className="grid gap-1">Story link<input value={link} onChange={(e) => setLink(e.target.value)} inputMode="url" className={field} /></label>
          <div className="flex flex-wrap gap-4">
            <label className="grid gap-1">People<input value={people} onChange={(e) => setPeople(e.target.value)} inputMode="numeric" className={`${field} w-20`} /></label>
            <label className="grid gap-1">Taps<input value={taps} onChange={(e) => setTaps(e.target.value)} inputMode="numeric" className={`${field} w-20`} /></label>
            <label className="grid gap-1">Then follow<input value={late} onChange={(e) => setLate(e.target.value)} inputMode="numeric" className={`${field} w-20`} /></label>
          </div>
        </div>
      </details>
    </section>
  );
}
