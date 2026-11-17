"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AFTER_LISTING, FIRMS, HEADLINES, MEETING_DELAY_SECONDS, MEETING_TIMES, ROADSHOW_LABEL, STORY_LINK } from "@/lib/demoScenario";

// The guided demo run for the demo company (Example Resources plc) only: made-up people, steps in a good order for a live showing.
// Each step does its action and then opens the page where the result shows; come back to Overview and press the next step.
// Switch Live on (top right) to watch the numbers move.
type Ev = { code: string; label: string };
type Saved = { step: number; event: string };

const KEY = "tapcard.demo.run";
const STEPS = [
  { key: "broker", title: "Appoint Cavendish as broker", shows: "News" },
  { key: "ipo", title: "Announce the £100m IPO", shows: "News" },
  { key: "roadshow", title: "Cavendish arranges the two-day roadshow", shows: "Cards & QR, Events" },
  { key: "meetings", title: "The roadshow runs: 10 meetings", shows: "Followers" },
  { key: "raise", title: "Listing complete and £100m raised", shows: "Insights" },
  { key: "clear", title: "Clear and start again", shows: "" },
] as const;
const PAGE: Record<string, string> = { broker: "/business/admin/news", ipo: "/business/admin/news", roadshow: "/business/admin/cards?tab=events", meetings: "/business/admin/followers", raise: "/business/admin/insights" };

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

export default function DemoPanel({ events }: { events: Ev[] }) {
  const router = useRouter();
  const [saved, setSaved] = useState<Saved>({ step: 0, event: "" });
  const [day, setDay] = useState("");
  const [heads, setHeads] = useState({ broker: HEADLINES.broker, ipo: HEADLINES.ipo, raise: HEADLINES.raise });
  const [link, setLink] = useState(STORY_LINK);
  const [taps, setTaps] = useState(String(AFTER_LISTING.taps));
  const [late, setLate] = useState(String(AFTER_LISTING.followers));
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
  const eventCode = () => saved.event || events.find((e) => e.label.toLowerCase() === ROADSHOW_LABEL.toLowerCase())?.code || "";
  const dayN = (n: number) => { const d = new Date(`${day || today()}T12:00`); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  const slotStart = (i: number) => new Date(`${dayN(i < 5 ? 0 : 1)}T${MEETING_TIMES[i % 5][0]}`);

  async function headline(text: string): Promise<boolean> {
    let r = await call({ action: "headline", text, link });
    if (!r.ok && /half a minute|moment ago/i.test(r.error ?? "")) {
      for (let s = 31; s > 0; s--) { setMsg(`Another headline went out a moment ago. Waiting ${s} seconds...`); await wait(1000); }
      r = await call({ action: "headline", text, link });
    }
    if (!r.ok) { setMsg(r.error ?? "That did not work."); return false; }
    return true;
  }

  async function run(i: number) {
    if (busy) return;
    const key = STEPS[i].key;
    setBusy(true);
    try {
      let code = saved.event;
      if (key === "broker" || key === "ipo") {
        if (!(await headline(heads[key]))) return;
        setMsg("Posted. Followers' phones get the notification.");
      } else if (key === "roadshow") {
        const slots = Array.from({ length: 10 }, (_, k) => {
          const d = dayN(k < 5 ? 0 : 1), [from, to] = MEETING_TIMES[k % 5];
          return { label: `${k < 5 ? "Day 1" : "Day 2"} ${from}: ${FIRMS[k].name}`, startsAt: new Date(`${d}T${from}`).toISOString(), endsAt: new Date(`${d}T${to}`).toISOString() };
        });
        const r = await call({ action: "roadshow", label: ROADSHOW_LABEL, startsAt: new Date(`${dayN(0)}T00:00`).toISOString(), endsAt: new Date(`${dayN(1)}T23:59`).toISOString(), slots });
        if (!r.ok) { setMsg(r.error ?? "That did not work."); return; }
        code = r.code ?? "";
        setMsg("The roadshow is set up: 2 days, 10 meetings, one QR code.");
      } else if (key === "meetings") {
        const ev = eventCode();
        if (!ev) { setMsg("Set up the roadshow first (step 3)."); return; }
        for (let k = 0; k < 10; k++) {
          const start = slotStart(k);
          const r = (await fetch("/api/tapcard/biz/demo-sim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "meeting", event: ev, firm: k, at: new Date(start.getTime() + 30 * 60000).toISOString() }) }).then((x) => x.json()).catch(() => null)) as { ok?: boolean; error?: string; attendees?: number; shared?: number; firm?: string } | null;
          if (!r?.ok) { setMsg(r?.error ?? "That did not work."); return; }
          setMsg(`Day ${k < 5 ? 1 : 2}, ${MEETING_TIMES[k % 5][0]}: ${r.firm}: ${r.attendees} attended, ${r.shared} fund manager${r.shared === 1 ? "" : "s"} shared details (${k + 1} of 10)`);
          router.refresh();
          if (k < 9) await wait(MEETING_DELAY_SECONDS * 1000);
        }
        setMsg("The roadshow is over: 10 meetings.");
      } else if (key === "raise") {
        if (!(await headline(heads.raise))) return;
        const t = Math.max(0, Math.min(200, Number(taps) || 0)), l = Math.max(0, Math.min(100, Number(late) || 0));
        let done = 0;
        while (done < t) {
          const n = Math.min(5, t - done);
          const r = await call({ action: "results", taps: n, late: 0 });
          if (!r.ok) { setMsg(r.error ?? "That did not work."); return; }
          done += n; setMsg(`${done} of ${t} have tapped the announcement...`); router.refresh(); await wait(1000);
        }
        let added = 0;
        while (added < l) {
          const n = Math.min(4, l - added);
          const r = await call({ action: "results", taps: 0, late: n, start: 101 + added });
          if (!r.ok) { setMsg(r.error ?? "That did not work."); return; }
          added += n; setMsg(`${added} of ${l} new followers...`); router.refresh(); await wait(900);
        }
        setMsg(`Raise announced: ${t} taps, ${l} new followers.`);
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
      <h2 className="mt-1 text-xl font-black text-cloud">Made-up IPO story, in order</h2>
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
        <summary className="cursor-pointer font-semibold">Change the date, wording or numbers</summary>
        <div className="mt-3 grid gap-3">
          <label className="grid gap-1">Roadshow starts (day 1; day 2 follows)<input type="date" value={day} onChange={(e) => setDay(e.target.value)} className={`${field} w-48`} /></label>
          <label className="grid gap-1">Broker headline<input value={heads.broker} maxLength={140} onChange={(e) => setHeads({ ...heads, broker: e.target.value })} className={field} /></label>
          <label className="grid gap-1">IPO headline<input value={heads.ipo} maxLength={140} onChange={(e) => setHeads({ ...heads, ipo: e.target.value })} className={field} /></label>
          <label className="grid gap-1">Listing and raise headline<input value={heads.raise} maxLength={140} onChange={(e) => setHeads({ ...heads, raise: e.target.value })} className={field} /></label>
          <label className="grid gap-1">Story link<input value={link} onChange={(e) => setLink(e.target.value)} inputMode="url" className={field} /></label>
          <div className="flex flex-wrap gap-4">
            <label className="grid gap-1">Taps on the raise news<input value={taps} onChange={(e) => setTaps(e.target.value)} inputMode="numeric" className={`${field} w-20`} /></label>
            <label className="grid gap-1">New followers after it<input value={late} onChange={(e) => setLate(e.target.value)} inputMode="numeric" className={`${field} w-20`} /></label>
          </div>
          <p className="opacity-80">The firms, people and meeting times are in lib/demoScenario.ts.</p>
        </div>
      </details>
    </section>
  );
}
