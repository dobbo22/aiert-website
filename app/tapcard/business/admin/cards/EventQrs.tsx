"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import CardQr from "./CardQr";

export interface EventRow { code: string; label: string; createdAt: string; followers: number; startsAt: string | null; endsAt: string | null }

const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });

/// Where an event stands now, for the label under its name.
function windowText(ev: EventRow, now: number): string {
  if (!ev.startsAt || !ev.endsAt) return "";
  const s = new Date(ev.startsAt).getTime(), e = new Date(ev.endsAt).getTime();
  const state = now < s ? "Not started" : now < e ? "Running now" : "Ended";
  return `${state}: ${when(ev.startsAt)} to ${when(ev.endsAt)}`;
}

/// Event QR codes: name a meeting or event, get its own QR code, see how many followers came through each.
export default function EventQrs({ companyCardId, events }: { companyCardId: string; events: EventRow[] }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [starts, setStarts] = useState("");
  const [ends, setEnds] = useState("");
  const [now] = useState(() => Date.now());

  async function post(body: unknown) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/tapcard/biz/events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) setError(j.error ?? "That did not work. Please try again.");
      else { setLabel(""); setStarts(""); setEnds(""); router.refresh(); }
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
          Optionally give the event a start and end time. Anyone who <strong>newly</strong> follows during that time, through any of your cards (for example the
          chief executive&apos;s phone at the event), is tagged with the event even without scanning its code, and the list says &ldquo;event window&rdquo;. It is time-based,
          so it can include people who followed from elsewhere in that window. People who already followed are never retagged.
        </p>
        <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); if (label.trim()) void post({ label, startsAt: starts ? new Date(starts).toISOString() : "", endsAt: ends ? new Date(ends).toISOString() : "" }); }}>
          <label className="sr-only" htmlFor="event-name">Event name</label>
          <input id="event-name" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} placeholder="For example: AGM 2026"
            className="min-w-[16rem] flex-1 rounded-xl bg-slate/40 px-4 py-2 text-cloud ring-1 ring-slate" />
          <label className="text-sm text-cloud">Starts (optional)
            <input type="datetime-local" value={starts} onChange={(e) => setStarts(e.target.value)} className="mt-1 block rounded-xl bg-slate/40 px-3 py-2 text-cloud ring-1 ring-slate" />
          </label>
          <label className="text-sm text-cloud">Ends (optional)
            <input type="datetime-local" value={ends} onChange={(e) => setEnds(e.target.value)} className="mt-1 block rounded-xl bg-slate/40 px-3 py-2 text-cloud ring-1 ring-slate" />
          </label>
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
              <CardQr id={companyCardId} eventCode={ev.code} title={ev.label} subtitle={`${ev.followers} ${ev.followers === 1 ? "follower" : "followers"} so far`} />
              {windowText(ev, now) && <p className="px-1 text-sm text-cloud">{windowText(ev, now)}</p>}
              <button type="button" disabled={busy} onClick={() => { if (window.confirm(`Delete the event "${ev.label}"? Its QR code will still open the card, but follows stop being tagged.`)) void post({ delete: ev.code }); }}
                className="rounded-xl px-4 py-2 text-cloud underline">Delete this event</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
