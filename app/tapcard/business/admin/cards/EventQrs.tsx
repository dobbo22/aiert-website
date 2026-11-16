"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import CardQr from "./CardQr";

export interface SlotRow { id: number; label: string; startsAt: string; endsAt: string; followers: number }
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
        <ul className="mt-2 space-y-1">
          {ev.slots.map((sl) => (
            <li key={sl.id} className="flex flex-wrap items-center justify-between gap-2 text-sm text-cloud">
              <span><strong>{sl.label}</strong> · {dmy(sl.startsAt)} {hm(sl.startsAt)} to {hm(sl.endsAt)} · {sl.followers} {sl.followers === 1 ? "person" : "people"}</span>
              <button type="button" disabled={busy} onClick={() => { if (window.confirm(`Remove the slot "${sl.label}"? Scans already recorded in it stay.`)) void post({ deleteSlot: sl.id }); }} className="underline">Remove</button>
            </li>
          ))}
        </ul>
      )}
      <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (!ready) return;
        void post({ addSlot: ev.code, label, startsAt: new Date(`${day}T${from}`).toISOString(), endsAt: new Date(`${day}T${to}`).toISOString() }).then(() => { setLabel(""); setFrom(""); setTo(""); }); }}>
        <label className="text-sm font-semibold text-cloud">Who or where
          <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} placeholder="For example: Smith &amp; Co" className="mt-1 block rounded-xl bg-slate/40 px-3 py-2 text-cloud ring-1 ring-slate" />
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
        <button type="submit" disabled={busy || !ready} className="btn-gold rounded-xl px-4 py-2 font-semibold disabled:opacity-50">Add slot</button>
      </form>
    </div>
  );
}

/// Event QR codes: name a meeting or event, get its own QR code, see how many followers came through each.
export default function EventQrs({ companyCardId, companyName, events }: { companyCardId: string; companyName: string; events: EventRow[] }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // When: no time set, a whole day, or a timed slot (several firms in one day each get their own slot and QR code).
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
      <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
        <h2 className="text-lg font-bold text-cloud">Event QR codes</h2>
        <p className="mt-2 text-cloud">
          Make a QR code for each meeting or event, such as the AGM or a roadshow. Anyone who follows through it is tagged with that event, so
          you can see which event brought them in. No location is read or stored: it is only which code was scanned. Followers who chose Follow only are counted, not listed.
        </p>
        <p className="mt-2 text-cloud">
          Optionally set the event for a whole day or a timed slot. Anyone who <strong>newly</strong> follows during that time, through any of your cards (for example the
          chief executive&apos;s phone at the event), is tagged with the event even without scanning its code, and the list says &ldquo;event window&rdquo;. It is time-based,
          so it can include people who followed from elsewhere in that window. People who already follow are not tagged by the time window alone, but every time someone scans an event&apos;s QR code that event is recorded for them, so a person can have several events (the AGM and then a roadshow). Their name appears beside each event only if they chose to share their details.
        </p>
        <form className="mt-4 space-y-4" onSubmit={(e) => { e.preventDefault(); if (!label.trim()) return; const w = windowBody(); if ("error" in w) { setError(w.error); return; } void post({ label, ...w }); }}>
          <div className="flex flex-wrap items-end gap-3">
            <label className="sr-only" htmlFor="event-name">Event name</label>
            <input id="event-name" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} placeholder="For example: AGM 2026, or Roadshow: Smith &amp; Co"
              className="min-w-[16rem] flex-1 rounded-xl bg-slate/40 px-4 py-2 text-cloud ring-1 ring-slate" />
          </div>
          <fieldset>
            <legend className="text-sm font-semibold text-cloud">When is it?</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {([["none", "No set time"], ["day", "All day"], ["slot", "Timed slot"]] as const).map(([m, t]) => (
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
          <p className="text-sm text-cloud">Visiting several firms in one day? Make one event for the roadshow with one QR code to print, then add a timed slot for each firm under it. A scan is recorded against the slot it was made in, and you can change the slots later without reprinting.</p>
          <button type="submit" disabled={busy || label.trim().length < 2} className="btn-gold rounded-xl px-5 py-2 font-semibold disabled:opacity-50">Create QR code</button>
        </form>
        {error && <p role="alert" className="mt-3 rounded-xl bg-white/10 px-4 py-2 text-cloud">{error}</p>}
      </div>
      {events.length === 0 ? (
        <p className="rounded-2xl bg-charcoal p-6 text-cloud ring-1 ring-white/10">No events yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((ev) => (
            <div key={ev.code} className="space-y-2">
              <CardQr id={companyCardId} eventCode={ev.code} title={ev.label} subtitle={`${ev.followers} ${ev.followers === 1 ? "follower" : "followers"} so far`} caption={`Please scan to register your attendance and follow ${companyName}`} />
              {windowText(ev, now) && <p className="px-1 text-sm text-cloud">{windowText(ev, now)}</p>}
              <Slots ev={ev} post={post} busy={busy} />
              <button type="button" disabled={busy} onClick={() => { if (window.confirm(`Delete the event "${ev.label}"? Its QR code will still open the card, but follows stop being tagged.`)) void post({ delete: ev.code }); }}
                className="rounded-xl px-4 py-2 text-cloud underline">Delete this event</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
