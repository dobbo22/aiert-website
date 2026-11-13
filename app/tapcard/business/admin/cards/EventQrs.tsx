"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import CardQr from "./CardQr";

export interface EventRow { code: string; label: string; createdAt: string; followers: number }

/// Event QR codes: name a meeting or event, get its own QR code, see how many followers came through each.
export default function EventQrs({ companyCardId, events }: { companyCardId: string; events: EventRow[] }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function post(body: unknown) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/tapcard/biz/events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) setError(j.error ?? "That did not work. Please try again.");
      else { setLabel(""); router.refresh(); }
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
        <form className="mt-4 flex flex-wrap gap-3" onSubmit={(e) => { e.preventDefault(); if (label.trim()) void post({ label }); }}>
          <label className="sr-only" htmlFor="event-name">Event name</label>
          <input id="event-name" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} placeholder="For example: AGM 2026"
            className="min-w-[16rem] flex-1 rounded-xl bg-slate/40 px-4 py-2 text-cloud ring-1 ring-slate" />
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
              <button type="button" disabled={busy} onClick={() => { if (window.confirm(`Delete the event "${ev.label}"? Its QR code will still open the card, but follows stop being tagged.`)) void post({ delete: ev.code }); }}
                className="rounded-xl px-4 py-2 text-cloud underline">Delete this event</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
