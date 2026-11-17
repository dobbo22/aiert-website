"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AFTER_LISTING, FIRMS, HEADLINES, MEETING_DELAY_SECONDS, MEETING_TIMES, ROADSHOW_LABEL, STORY_LINK } from "@/lib/demoScenario";

// Presenter mode for the demo company (Example Resources plc) only, mounted in the admin layout so it stays on screen as pages change.
// Space or → does the next step and shows the page where it lands, with a caption across the top. ← goes back (no re-run), A plays on
// by itself, H hides the bar and the captions. Made-up people only; the wording, date and numbers are set on Overview ("Demo settings").

export type DemoSettings = { day: string; broker: string; ipo: string; raise: string; link: string; taps: string; late: string };
export const SETTINGS_KEY = "tapcard.demo.settings";
export const STATE_KEY = "tapcard.demo.presenter";

const pad = (n: number) => String(n).padStart(2, "0");
export const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const defaultSettings = (): DemoSettings => ({ day: todayStr(), broker: HEADLINES.broker, ipo: HEADLINES.ipo, raise: HEADLINES.raise, link: STORY_LINK, taps: String(AFTER_LISTING.taps), late: String(AFTER_LISTING.followers) });
export function loadSettings(): DemoSettings {
  try { const raw = window.sessionStorage.getItem(SETTINGS_KEY); if (raw) return { ...defaultSettings(), ...(JSON.parse(raw) as Partial<DemoSettings>) }; } catch { /* defaults */ }
  return defaultSettings();
}

type Beat = { id: string; caption: string; page: string | null };
const BEATS: Beat[] = [
  { id: "broker", caption: "1 · Cavendish is appointed as broker", page: "/business/admin/news" },
  { id: "ipo", caption: "2 · The £100m IPO is announced: followers get a notification", page: "/business/admin/news" },
  { id: "roadshow", caption: "3 · Cavendish arranges a two-day roadshow: 10 meetings, one QR code", page: "/business/admin/cards?tab=events" },
  { id: "day1", caption: "4 · Roadshow day 1: five meetings", page: "/business/admin/cards?tab=events" },
  { id: "day2", caption: "5 · Roadshow day 2: five more meetings", page: "/business/admin/cards?tab=events" },
  { id: "who", caption: "6 · Who came: fund managers by name, firm and title", page: "/business/admin/followers" },
  { id: "raise", caption: "7 · Listing complete and £100m raised", page: "/business/admin/news" },
  { id: "effect", caption: "8 · The effect: shareholders read it and follow", page: "/business/admin/insights" },
  { id: "overview", caption: "9 · Back to the Overview: the whole story in numbers", page: "/business/admin" },
  { id: "clear", caption: "10 · Demo data cleared: only the people who really follow remain", page: "/business/admin" },
];

type St = { pos: number; ran: number; event: string };
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const url = (page: string) => `${page}${page.includes("?") ? "&" : "?"}live=1`;

export default function DemoPresenter() {
  const router = useRouter();
  const [st, setSt] = useState<St>({ pos: -1, ran: -1, event: "" });
  const stRef = useRef(st);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [status, setStatus] = useState("");
  const [hidden, setHidden] = useState(false);
  const [auto, setAuto] = useState(false);
  const autoRef = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback((next: St) => {
    stRef.current = next; setSt(next);
    try { window.sessionStorage.setItem(STATE_KEY, JSON.stringify(next)); } catch { /* it just forgets its place */ }
  }, []);

  useEffect(() => {
    let s: St = { pos: -1, ran: -1, event: "" };
    try { const raw = window.sessionStorage.getItem(STATE_KEY); if (raw) s = { ...s, ...(JSON.parse(raw) as St) }; } catch { /* start fresh */ }
    queueMicrotask(() => { stRef.current = s; setSt(s); });
  }, []);

  async function call(body: Record<string, unknown>): Promise<{ ok: boolean; error?: string; code?: string; attendees?: number; shared?: number; firm?: string }> {
    const res = await fetch("/api/tapcard/biz/demo-sim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { error?: string; code?: string; attendees?: number; shared?: number; firm?: string } | null;
    return { ok: !!res?.ok, error: data?.error ?? (res ? undefined : "No connection."), ...data };
  }
  const dayN = (s: DemoSettings, n: number) => { const d = new Date(`${s.day || todayStr()}T12:00`); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

  async function headline(text: string, link: string): Promise<boolean> {
    let r = await call({ action: "headline", text, link });
    if (!r.ok && /half a minute|moment ago/i.test(r.error ?? "")) {
      for (let s = 31; s > 0; s--) { setStatus(`Another headline went out a moment ago. Waiting ${s} seconds...`); await wait(1000); }
      r = await call({ action: "headline", text, link });
    }
    if (!r.ok) { setStatus(r.error ?? "That did not work."); return false; }
    return true;
  }
  async function eventCode(): Promise<string> {
    if (stRef.current.event) return stRef.current.event;
    const res = await fetch("/api/tapcard/biz/events").catch(() => null);
    const data = (await res?.json().catch(() => null)) as { events?: { code: string; label: string }[] } | null;
    return data?.events?.find((e) => e.label.toLowerCase() === ROADSHOW_LABEL.toLowerCase())?.code ?? "";
  }

  // The work behind one step. Returns false when it failed (the step then stays where it was).
  async function act(id: string, s: DemoSettings): Promise<{ ok: boolean; event?: string }> {
    if (id === "broker") return { ok: await headline(s.broker, s.link) };
    if (id === "ipo") return { ok: await headline(s.ipo, s.link) };
    if (id === "raise") return { ok: await headline(s.raise, s.link) };
    if (id === "roadshow") {
      const slots = Array.from({ length: 10 }, (_, k) => {
        const d = dayN(s, k < 5 ? 0 : 1), [from, to] = MEETING_TIMES[k % 5];
        return { label: `${k < 5 ? "Day 1" : "Day 2"} ${from}: ${FIRMS[k].name}`, startsAt: new Date(`${d}T${from}`).toISOString(), endsAt: new Date(`${d}T${to}`).toISOString() };
      });
      const r = await call({ action: "roadshow", label: ROADSHOW_LABEL, startsAt: new Date(`${dayN(s, 0)}T00:00`).toISOString(), endsAt: new Date(`${dayN(s, 1)}T23:59`).toISOString(), slots });
      if (!r.ok) { setStatus(r.error ?? "That did not work."); return { ok: false }; }
      setStatus("2 days, 10 meetings, one QR code.");
      return { ok: true, event: r.code };
    }
    if (id === "day1" || id === "day2") {
      const ev = await eventCode();
      if (!ev) { setStatus("Set up the roadshow first (step 3)."); return { ok: false }; }
      const d = id === "day1" ? 0 : 1;
      let people = 0, managers = 0;
      for (let j = 0; j < 5; j++) {
        const k = d * 5 + j;
        const start = new Date(`${dayN(s, d)}T${MEETING_TIMES[j][0]}`);
        const r = await call({ action: "meeting", event: ev, firm: k, at: new Date(start.getTime() + 30 * 60000).toISOString() });
        if (!r.ok) { setStatus(r.error ?? "That did not work."); return { ok: false }; }
        people += r.attendees ?? 0; managers += r.shared ?? 0;
        setStatus(`${MEETING_TIMES[j][0]} ${r.firm}: ${r.attendees} attended, ${r.shared} fund manager${r.shared === 1 ? "" : "s"} shared details`);
        router.refresh();
        if (j < 4) await wait(MEETING_DELAY_SECONDS * 1000);
      }
      setStatus(`Day ${d + 1} done: 5 meetings, ${people} attended, ${managers} fund managers shared their details.`);
      router.refresh();
      return { ok: true, event: ev };
    }
    if (id === "effect") {
      const t = Math.max(0, Math.min(200, Number(s.taps) || 0)), l = Math.max(0, Math.min(100, Number(s.late) || 0));
      let done = 0;
      while (done < t) {
        const n = Math.min(5, t - done);
        const r = await call({ action: "results", taps: n, late: 0 });
        if (!r.ok) { setStatus(r.error ?? "That did not work."); return { ok: false }; }
        done += n; setStatus(`${done} of ${t} have read the announcement...`); router.refresh(); await wait(1000);
      }
      let added = 0;
      while (added < l) {
        const n = Math.min(4, l - added);
        const r = await call({ action: "results", taps: 0, late: n, start: 101 + added });
        if (!r.ok) { setStatus(r.error ?? "That did not work."); return { ok: false }; }
        added += n; setStatus(`${added} of ${l} new followers...`); router.refresh(); await wait(900);
      }
      setStatus(`${t} read it and ${l} more followed.`);
      return { ok: true };
    }
    if (id === "clear") {
      const r = await call({ action: "clear" });
      if (!r.ok) { setStatus(r.error ?? "That did not work."); return { ok: false }; }
      setStatus("The made-up people, headlines and roadshow are gone. Real followers stay.");
      return { ok: true };
    }
    return { ok: true };
  }

  const show = useCallback((i: number) => { const b = BEATS[i]; if (b?.page) router.push(url(b.page)); }, [router]);

  const next = useCallback(async () => {
    if (busyRef.current) return;
    const cur = stRef.current;
    const i = cur.pos + 1 >= BEATS.length ? 0 : cur.pos + 1;
    const beat = BEATS[i];
    busyRef.current = true; setBusy(true); setStatus("");
    try {
      // Already done once (after stepping back): show the page again without repeating the action.
      if (i <= cur.ran && beat.id !== "clear") { save({ ...cur, pos: i }); show(i); return; }
      save({ ...cur, pos: i });
      show(i);
      await wait(900); // let the page arrive before the action starts, so the audience sees it change
      const r = await act(beat.id, loadSettings());
      if (!r.ok) { save({ ...stRef.current, pos: i - 1 }); return; }
      save(beat.id === "clear" ? { pos: -1, ran: -1, event: "" } : { pos: i, ran: Math.max(cur.ran, i), event: r.event || stRef.current.event });
    } finally {
      busyRef.current = false; setBusy(false);
      if (autoRef.current && stRef.current.pos >= 0 && stRef.current.pos < BEATS.length - 1) timer.current = setTimeout(() => { void next(); }, 6000);
      else if (autoRef.current) { autoRef.current = false; setAuto(false); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save, show, router]);

  const back = useCallback(() => {
    if (busyRef.current) return;
    const cur = stRef.current;
    if (cur.pos <= 0) return;
    save({ ...cur, pos: cur.pos - 1 }); show(cur.pos - 1); setStatus("");
  }, [save, show]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === " " || e.key === "ArrowRight") { e.preventDefault(); void next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); back(); }
      else if (e.key === "a" || e.key === "A") {
        autoRef.current = !autoRef.current; setAuto(autoRef.current);
        if (timer.current) { clearTimeout(timer.current); timer.current = null; }
        if (autoRef.current && !busyRef.current) void next();
      } else if (e.key === "h" || e.key === "H") setHidden((h) => !h);
    }
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); if (timer.current) clearTimeout(timer.current); };
  }, [next, back]);

  if (hidden) return null;
  const cur = BEATS[st.pos];
  const upcoming = BEATS[st.pos + 1 >= BEATS.length ? 0 : st.pos + 1];
  const btn = "rounded-lg px-3 py-1.5 text-sm font-semibold text-cloud ring-1 ring-slate hover:ring-mist disabled:opacity-40";
  return (
    <>
      {cur && (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-3 print:hidden" aria-live="polite">
          <div className="max-w-3xl rounded-2xl bg-black/85 px-6 py-3 text-center ring-1 ring-gold/70">
            <p className="text-lg font-black text-gold md:text-2xl">{cur.caption}</p>
            {status && <p className="mt-1 text-sm font-semibold text-cloud md:text-base">{status}</p>}
          </div>
        </div>
      )}
      <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-3 print:hidden">
        <div className="flex max-w-3xl flex-wrap items-center gap-3 rounded-2xl bg-black/85 px-4 py-2 ring-1 ring-gold/60">
          <span className="text-xs font-semibold uppercase tracking-wider text-gold">Demo</span>
          <button type="button" className={btn} disabled={busy || st.pos <= 0} onClick={back} aria-label="Back one step">←</button>
          <button type="button" className="rounded-lg bg-gold px-4 py-1.5 text-sm font-bold text-black disabled:opacity-60" disabled={busy} onClick={() => void next()}>
            {busy ? "Running..." : `Space: ${upcoming.caption.replace(/^\d+ · /, "")}`}
          </button>
          <button type="button" className={btn} onClick={() => { autoRef.current = !autoRef.current; setAuto(autoRef.current); if (timer.current) { clearTimeout(timer.current); timer.current = null; } if (autoRef.current && !busyRef.current) void next(); }}>{auto ? "Auto: on (A)" : "Auto (A)"}</button>
          <button type="button" className={btn} onClick={() => setHidden(true)}>Hide (H)</button>
          <span className="text-xs text-cloud opacity-80">{st.pos + 1} of {BEATS.length}</span>
        </div>
      </div>
    </>
  );
}
