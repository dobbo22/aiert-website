"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import CardQr from "./CardQr";

export interface SlotRow { id: number; label: string; startsAt: string; endsAt: string; followers: number }
export interface AttendeeRow { name: string; email: string; slot: string; at: string }
export interface AttendanceRow { named: AttendeeRow[]; anonymous: number }
export interface EventRow { code: string; label: string; createdAt: string; followers: number; startsAt: string | null; endsAt: string | null; slots: SlotRow[] }

const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });

/// Where an event stands now, for the label under its name.
function windowText(ev: EventRow, now: number): string {
  if (!ev.startsAt || !ev.endsAt) return "";
  const s = new Date(ev.startsAt).getTime(), e = new Date(ev.endsAt).getTime();
  const state = now < s ? "Not started" : now < e ? "Running now" : "Ended";
  return `${state}: ${when(ev.startsAt)} to ${when(ev.endsAt)}`;
}

const hm = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
const dmy = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/London" });

/// The timed slots of one event (a roadshow: one firm per slot, one printed QR code). Each scan is recorded against the slot it falls in.
function Slots({ ev, post, busy }: { ev: EventRow; post: (b: unknown) => Promise<void>; busy: boolean }) {
  const [label, setLabel] = useState("");
  const [day, setDay] = useState(ev.startsAt ? new Date(ev.startsAt).toLocaleDateString("en-CA", { timeZone: "Europe/London" }) : "");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const ready = label.trim().length >= 2 && day && from && to;
  return (
    <div className="rounded-2xl bg-charcoal p-4 ring-1 ring-white/10">
      <p className="text-sm font-semibold text-cloud">Time slots for this QR code</p>
      {ev.slots.length === 0 ? <p className="mt-1 text-sm text-cloud">None yet. Every scan is recorded against the event as a whole.</p> : (
        <ul className="mt-2">
          {ev.slots.map((sl) => (
            <li key={sl.id} className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-4 border-b border-slate/50 py-2 text-sm text-cloud last:border-0">
              <span><strong>{sl.label}</strong><span className="block">{dmy(sl.startsAt)} · {hm(sl.startsAt)} to {hm(sl.endsAt)}</span></span>
              <span className="whitespace-nowrap tabular-nums">{sl.followers} {sl.followers === 1 ? "person" : "people"}</span>
              <button type="button" disabled={busy} onClick={() => { if (window.confirm(`Remove the slot "${sl.label}"? Scans already recorded in it stay.`)) void post({ deleteSlot: sl.id }); }} className="underline">Remove</button>
            </li>
          ))}
        </ul>
      )}
      <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (!ready) return;
        void post({ addSlot: ev.code, label, startsAt: new Date(`${day}T${from}`).toISOString(), endsAt: new Date(`${day}T${to}`).toISOString() }).then(() => { setLabel(""); setFrom(""); setTo(""); }); }}>
        <label className="text-sm font-semibold text-cloud">Who or where
          <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} placeholder="For example: Smith &amp; Co" className="mt-1 block rounded-xl bg-slate/40 px-3 py-2 text-cloud ring-1 ring-slate placeholder:text-cloud" />
        </label>
        <label className="text-sm font-semibold text-cloud">Day
          <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="mt-1 block rounded-xl bg-white px-3 py-2 text-black ring-1 ring-slate" />
        </label>
        <label className="text-sm font-semibold text-cloud">From
          <input type="time" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 block rounded-xl bg-white px-3 py-2 text-black ring-1 ring-slate" />
        </label>
        <label className="text-sm font-semibold text-cloud">To
          <input type="time" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 block rounded-xl bg-white px-3 py-2 text-black ring-1 ring-slate" />
        </label>
        <button type="submit" disabled={busy || !ready} className="btn-gold rounded-xl px-4 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-60">Add slot</button>
        {!ready && <p className="basis-full text-sm text-cloud">Fill in who or where, the day, and the start and end times to add a slot.</p>}
      </form>
    </div>
  );
}

/// Who registered at an event: names (only the people who chose to share their details), the rest counted, and a CSV.
function Attendees({ ev, att }: { ev: EventRow; att: AttendanceRow | undefined }) {
  const named = att?.named ?? [];
  const anon = att?.anonymous ?? 0;
  const total = named.length + anon;
  return (
    <details className="rounded-2xl bg-charcoal p-4 ring-1 ring-white/10">
      <summary className="cursor-pointer text-sm font-semibold text-cloud">
        Registered: {total} {total === 1 ? "person" : "people"} ({named.length} shared their details)
      </summary>
      {total === 0 ? <p className="mt-2 text-sm text-cloud">Nobody has registered yet.</p> : (
        <div className="mt-3 space-y-3">
          {named.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-cloud">
                <thead><tr className="border-b border-slate"><th className="py-1 pr-3">Name</th><th className="py-1 pr-3">Email</th><th className="py-1 pr-3">Slot</th><th className="py-1">When</th></tr></thead>
                <tbody>
                  {named.map((r, i) => (
                    <tr key={i} className="border-b border-slate/50"><td className="py-1 pr-3">{r.name}</td><td className="py-1 pr-3">{r.email}</td><td className="py-1 pr-3">{r.slot || "–"}</td><td className="py-1">{hm(r.at)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {anon > 0 && <p className="text-sm text-cloud">{anon} more followed without sharing their details, so they are counted but not named.</p>}
          {named.length > 0 && <a className="btn-gold inline-block rounded-xl px-4 py-2 text-sm font-semibold" href={`/api/tapcard/biz/events/csv?code=${ev.code}`}>Download list (CSV)</a>}
        </div>
      )}
    </details>
  );
}

/// The Events page: one card per event with its QR code, slots and who registered.
export default function EventQrs({ companyCardId, companyName, events, attendance = {} }: { companyCardId: string; companyName: string; events: EventRow[]; attendance?: Record<string, AttendanceRow> }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // When: no time set, a whole day, or a timed slot.
  const [mode, setMode] = useState<"none" | "day" | "slot">("none");
  const [day, setDay] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [now] = useState(() => Date.now());

  function windowBody(): { startsAt: string; endsAt: string } | { error: string } {
    if (mode === "none") return { startsAt: "", endsAt: "" };
    if (!day) return { error: "Choose the day." };
    if (mode === "day") return { startsAt: new Date(`${day}T00:00`).toISOString(), endsAt: new Date(`${day}T23:59`).toISOString() };
    if (!from || !to) return { error: "Choose the start and end time." };
    return { startsAt: new Date(`${day}T${from}`).toISOString(), endsAt: new Date(`${day}T${to}`).toISOString() };
  }

  async function post(body: unknown) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/tapcard/biz/events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) setError(j.error ?? "That did not work. Please try again.");
      else { setLabel(""); setDay(""); setFrom(""); setTo(""); router.refresh(); }
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <details className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10" open={events.length === 0}>
        <summary className="inline-block cursor-pointer rounded-xl btn-gold px-5 py-2 font-semibold">New event</summary>
        <p className="mt-4 text-cloud">
          One QR code for an AGM, roadshow or meeting. Everyone who registers through it is tagged with the event. For a day of visits, make one event and add a time slot for each firm.
        </p>
        <form className="mt-4 space-y-4" onSubmit={(e) => { e.preventDefault(); if (!label.trim()) return; const w = windowBody(); if ("error" in w) { setError(w.error); return; } void post({ label, ...w }); }}>
          <div className="flex flex-wrap items-end gap-3">
            <label className="sr-only" htmlFor="event-name">Event name</label>
            <input id="event-name" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} placeholder="For example: AGM 2026, or Roadshow 20 Nov"
              className="min-w-[16rem] flex-1 rounded-xl bg-slate/40 px-4 py-2 text-cloud ring-1 ring-slate placeholder:text-cloud" />
          </div>
          <fieldset>
            <legend className="text-sm font-semibold text-cloud">When is it?</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {([["none", "Any time"], ["day", "All day"], ["slot", "Timed slot"]] as const).map(([m, t]) => (
                <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m}
                  className={`rounded-xl px-4 py-2 font-semibold ring-1 ${mode === m ? "btn-gold ring-transparent" : "text-cloud ring-slate"}`}>{t}</button>
              ))}
            </div>
          </fieldset>
          {mode !== "none" && (
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm font-semibold text-cloud">Day
                <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="mt-1 block rounded-xl bg-white px-3 py-2 text-black ring-1 ring-slate" />
              </label>
              {mode === "slot" && (
                <>
                  <label className="text-sm font-semibold text-cloud">From
                    <input type="time" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 block rounded-xl bg-white px-3 py-2 text-black ring-1 ring-slate" />
                  </label>
                  <label className="text-sm font-semibold text-cloud">To
                    <input type="time" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 block rounded-xl bg-white px-3 py-2 text-black ring-1 ring-slate" />
                  </label>
                </>
              )}
            </div>
          )}
          <button type="submit" disabled={busy || label.trim().length < 2} className="btn-gold rounded-xl px-5 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-60">Create QR code</button>
          {label.trim().length < 2 && <p className="text-sm text-cloud">Give the event a name (at least two letters) to create its QR code.</p>}
        </form>
        {error && <p role="alert" className="mt-3 rounded-xl bg-white/10 px-4 py-2 text-cloud">{error}</p>}
        <details className="mt-4 text-sm text-cloud">
          <summary className="cursor-pointer font-semibold">How times work</summary>
          <p className="mt-2">
            Without a time, an event only counts people who scan its own QR code. With a whole day or a timed slot, anyone who <strong>newly</strong> follows during that time through any of your
            cards (for example the chief executive&apos;s phone at the event) is also tagged, and the list says &ldquo;event window&rdquo;. People who already follow are not tagged by time alone, but each scan of an
            event&apos;s QR code is recorded for them, so one person can have several events. A name appears beside an event only if the person chose to share their details. No location is read.
          </p>
        </details>
      </details>

      {events.length === 0 ? (
        <p className="rounded-2xl bg-charcoal p-6 text-cloud ring-1 ring-white/10">No events yet. Make one with the form above, then put its QR code on the presentation or notice.</p>
      ) : (
        events.map((ev) => (
          <section key={ev.code} className="space-y-3 rounded-2xl bg-charcoal/60 p-4 ring-1 ring-white/10">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-cloud">{ev.label}</h2>
                {windowText(ev, now) && <p className="text-sm text-cloud">{windowText(ev, now)}</p>}
              </div>
              <button type="button" disabled={busy} onClick={() => { if (window.confirm(`Delete the event "${ev.label}"? Its QR code will still open the card, but follows stop being tagged.`)) void post({ delete: ev.code }); }}
                className="rounded-xl px-3 py-1 text-sm text-cloud underline">Delete event</button>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <CardQr id={companyCardId} eventCode={ev.code} title="QR code" subtitle={`${ev.followers} ${ev.followers === 1 ? "person" : "people"} registered`} caption={`Please scan to register your attendance and follow ${companyName}`} />
              <div className="space-y-3">
                <Slots ev={ev} post={post} busy={busy} />
                <Attendees ev={ev} att={attendance[ev.code]} />
              </div>
            </div>
          </section>
        ))
      )}
    </div>
  );
}
