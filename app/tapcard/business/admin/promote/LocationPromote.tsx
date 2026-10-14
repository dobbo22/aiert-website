"use client";

import { useState } from "react";

interface Props { cardId: string; hasOffer: boolean; hasNews: boolean }

// Post or withdraw one location's offer and news.
export default function LocationPromote({ cardId, hasOffer, hasNews }: Props) {
  const [open, setOpen] = useState<"offer" | "news" | null>(null);
  const [text, setText] = useState("");
  const [days, setDays] = useState("14");
  const [limit, setLimit] = useState("");
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(body: Record<string, unknown>) {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/tapcard/biz/promote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cardId, ...body }) }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (res?.ok) { window.location.reload(); return; }
    setMsg(data.error ?? "Couldn't do that. Try again.");
  }

  const field = "mt-1 w-full rounded-lg bg-white px-3 py-2 text-[#111318]";
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold" onClick={() => setOpen(open === "offer" ? null : "offer")}>{hasOffer ? "New offer" : "Post an offer"}</button>
        {hasOffer ? <button type="button" disabled={busy} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm" onClick={() => send({ action: "withdrawOffer" })}>Withdraw offer</button> : null}
        <button type="button" className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold" onClick={() => setOpen(open === "news" ? null : "news")}>Post news</button>
        {hasNews ? <button type="button" disabled={busy} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm" onClick={() => send({ action: "withdrawNews" })}>Withdraw news</button> : null}
      </div>
      {open === "offer" && (
        <div className="mt-3 rounded-xl bg-black/20 p-3 text-sm">
          <label className="block">The offer<input className={field} value={text} onChange={(e) => setText(e.target.value.slice(0, 140))} placeholder="Free dessert with any main" /></label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <label>Days it lasts<input className={field} value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ""))} /></label>
            <label>Limit (optional)<input className={field} value={limit} onChange={(e) => setLimit(e.target.value.replace(/\D/g, ""))} /></label>
            <label>Staff PIN<input className={field} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="4 to 6 digits" /></label>
          </div>
          <button type="button" disabled={busy || !text.trim() || pin.length < 4} className="mt-3 rounded-lg bg-white px-4 py-2 font-semibold text-[#111318] disabled:opacity-50" onClick={() => send({ action: "offer", text, days: Number(days), maxClaims: limit ? Number(limit) : undefined, pin })}>Post offer</button>
        </div>
      )}
      {open === "news" && (
        <div className="mt-3 rounded-xl bg-black/20 p-3 text-sm">
          <label className="block">The news (one short line)<input className={field} value={text} onChange={(e) => setText(e.target.value.slice(0, 140))} placeholder="New autumn menu from Friday" /></label>
          <button type="button" disabled={busy || !text.trim()} className="mt-3 rounded-lg bg-white px-4 py-2 font-semibold text-[#111318] disabled:opacity-50" onClick={() => send({ action: "news", text })}>Post news</button>
        </div>
      )}
      {msg ? <p className="mt-2 text-sm font-semibold">{msg}</p> : null}
    </div>
  );
}
