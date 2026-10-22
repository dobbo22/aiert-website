"use client";

import { useState } from "react";

interface Props { cardId: string; hasOffer: boolean; hasNews: boolean }

// Switched on once the TapCard apps show stamp cards and take over a web claim (iPhone 3.2 / Android 1.7). Until then a customer who
// installed the app would find nothing, so owners are not offered "needs the app".
const APP_GATE_READY = true;

// Post or withdraw one location's offer and news.
export default function LocationPromote({ cardId, hasOffer, hasNews }: Props) {
  const [open, setOpen] = useState<"offer" | "news" | null>(null);
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [days, setDays] = useState("14");
  const [limit, setLimit] = useState("");
  const [pin, setPin] = useState("");
  // A stamp card the owner configures: N stamps, then a reward in their own words.
  const [kind, setKind] = useState<"once" | "stamps">("once");
  const [stamps, setStamps] = useState("5");
  const [reward, setReward] = useState("");
  const [gap, setGap] = useState("4");
  const [needApp, setNeedApp] = useState(false);
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
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setKind("once")} className={`rounded-lg px-3 py-2 font-semibold ${kind === "once" ? "bg-white text-[#111318]" : "bg-white/10"}`}>One-off offer</button>
            <button type="button" onClick={() => setKind("stamps")} className={`rounded-lg px-3 py-2 font-semibold ${kind === "stamps" ? "bg-white text-[#111318]" : "bg-white/10"}`}>Stamp card</button>
          </div>
          {kind === "stamps" && (
            <div className="mt-3 rounded-lg bg-white/5 p-3">
              <p className="text-xs text-white/80">Customers get a card on their phone. Staff scan it and enter your PIN to add a stamp. When it is full they get the reward and the card starts again.</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label>Stamps needed (1 to 20)<input className={field} value={stamps} onChange={(e) => setStamps(e.target.value.replace(/\D/g, "").slice(0, 2))} /></label>
                <label>Time between stamps
                  <select className={field} value={gap} onChange={(e) => setGap(e.target.value)}>
                    <option value="0">No limit</option><option value="1">1 hour</option><option value="4">4 hours</option><option value="12">12 hours</option><option value="24">24 hours</option>
                  </select>
                </label>
              </div>
              <label className="mt-2 block">The reward<input className={field} value={reward} onChange={(e) => setReward(e.target.value.slice(0, 60))} placeholder="Free child&apos;s meal" /></label>
              {APP_GATE_READY && (
                <label className="mt-3 flex items-start gap-2">
                  <input type="checkbox" className="mt-1" checked={needApp} onChange={(e) => setNeedApp(e.target.checked)} />
                  <span>Customers need the TapCard app after their first stamp. <span className="text-white/70">The first stamp needs nothing to install. From the second, they get the free app, and their stamps come with them.</span></span>
                </label>
              )}
            </div>
          )}
          <label className="mt-3 block">{kind === "stamps" ? "How you describe it" : "The offer"}
            <input className={field} value={text} onChange={(e) => setText(e.target.value.slice(0, 140))} placeholder={kind === "stamps" ? `Buy ${stamps || "3"} meals, get ${reward || "a child's meal free"}` : "Free dessert with any main"} />
          </label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <label>Days it lasts<input className={field} value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ""))} /></label>
            <label>{kind === "stamps" ? "Max cards (optional)" : "Limit (optional)"}<input className={field} value={limit} onChange={(e) => setLimit(e.target.value.replace(/\D/g, ""))} /></label>
            <label>Staff PIN<input className={field} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="4 to 6 digits" /></label>
          </div>
          {kind === "stamps" && <p className="mt-2 text-xs text-white/80">Posting a new offer later replaces this card, and customers&apos; stamps start again.</p>}
          <button type="button" disabled={busy || pin.length < 4 || (kind === "stamps" ? !reward.trim() || !Number(stamps) : !text.trim())} className="mt-3 rounded-lg bg-white px-4 py-2 font-semibold text-[#111318] disabled:opacity-50"
            onClick={() => send({
              action: "offer", kind,
              text: text.trim() || (kind === "stamps" ? `Buy ${stamps}, get ${reward.trim()}` : ""),
              days: Number(days), maxClaims: limit ? Number(limit) : undefined, pin,
              ...(kind === "stamps" ? { stampsRequired: Number(stamps), rewardText: reward.trim(), stampGapHours: Number(gap), requireAppAfterFirst: APP_GATE_READY && needApp } : {}),
            })}>{kind === "stamps" ? "Start the stamp card" : "Post offer"}</button>
        </div>
      )}
      {open === "news" && (
        <div className="mt-3 rounded-xl bg-black/20 p-3 text-sm">
          <label className="block">The news (one short line)<input className={field} value={text} onChange={(e) => setText(e.target.value.slice(0, 140))} placeholder="New autumn menu from Friday" /></label>
          <label className="mt-2 block">Link to the full story (optional)<input className={field} value={link} onChange={(e) => setLink(e.target.value.trim())} placeholder="https://yoursite.com/news/autumn-menu" inputMode="url" /></label>
          <button type="button" disabled={busy || !text.trim()} className="mt-3 rounded-lg bg-white px-4 py-2 font-semibold text-[#111318] disabled:opacity-50" onClick={() => send({ action: "news", text, link })}>Post news</button>
        </div>
      )}
      {msg ? <p className="mt-2 text-sm font-semibold">{msg}</p> : null}
    </div>
  );
}
