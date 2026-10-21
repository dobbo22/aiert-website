"use client";

import { useEffect, useState } from "react";

interface Status {
  stamps: number; stampsRequired: number; rewardText: string; rewardsGiven: number; rewardReady: boolean; nextStampAt: string | null;
}

// What the business sees when it scans a customer's stamp card: add a stamp, and give the reward when the card is full.
export default function StampStaffForm({ code, initial }: { code: string; initial: Status }) {
  const [pin, setPin] = useState("");
  const [status, setStatus] = useState<Status>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  async function act(action: "stamp" | "reward") {
    setBusy(true); setMsg(null);
    const res = await fetch(`/api/tapcard/offer-code/${code}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin, action }),
    }).catch(() => null);
    setBusy(false);
    if (!res) return setMsg("No connection. Try again.");
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; status?: Status };
    if (data.status) setStatus((s) => ({ ...s, ...data.status }));
    if (res.ok) { setFlash(action === "stamp" ? "Stamp added" : "Reward given"); return; }
    setMsg(
      data.error === "bad_pin" ? "Wrong PIN" :
      data.error === "locked" ? "Too many wrong tries. Please wait 15 minutes and try again." :
      data.error === "too_soon" ? `Already stamped recently. Next stamp ${data.status?.nextStampAt ? "after " + new Date(data.status.nextStampAt).toLocaleString("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" }) : "later"}.` :
      data.error === "needs_app" ? "This customer needs the TapCard app to collect more stamps. Ask them to tap Get the app on their screen. Their stamp is kept." :
      data.error === "full" ? "The card is full. Give the reward." :
      data.error === "not_full" ? "The card isn't full yet." : "That didn't work.",
    );
  }

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 1600);
    return () => clearTimeout(t);
  }, [flash]);

  const dots = Array.from({ length: status.stampsRequired }, (_, i) => i < status.stamps);
  return (
    <div className="mt-6">
      {flash && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-green-600 text-white" role="status">
          <svg viewBox="0 0 24 24" className="h-40 w-40" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5" /></svg>
          <p className="mt-4 text-2xl font-bold">{flash}</p>
          <p className="mt-2 text-lg">{status.rewardReady ? "Card full: give the reward" : `${status.stamps} of ${status.stampsRequired}`}</p>
        </div>
      )}
      <p className="rounded-xl bg-green-600 px-4 py-3 font-semibold">Stamp card</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2" aria-label={`${status.stamps} of ${status.stampsRequired} stamps`}>
        {dots.map((on, i) => (
          <span key={i} className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${on ? "bg-[#FBBF24] text-[#111318]" : "bg-white/10 text-white/50"}`}>{on ? "✓" : i + 1}</span>
        ))}
      </div>
      <p className="mt-3 font-semibold">{status.rewardReady ? `Full: ${status.rewardText}` : `${status.stamps} of ${status.stampsRequired} stamps. Reward: ${status.rewardText}`}</p>
      {status.rewardsGiven > 0 && <p className="mt-1 text-sm text-white/80">Rewards given so far: {status.rewardsGiven}</p>}
      <label className="mt-6 block text-sm text-white/80" htmlFor="pin">Staff PIN</label>
      <input id="pin" inputMode="numeric" autoComplete="off" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
        className="mt-2 w-full rounded-xl bg-white px-4 py-3 text-center text-2xl tracking-widest text-[#111318]" />
      {msg && <p className="mt-3 text-sm font-semibold">{msg}</p>}
      {status.rewardReady ? (
        <button type="button" disabled={pin.length < 4 || busy} onClick={() => act("reward")} className="mt-4 w-full rounded-xl bg-[#FBBF24] px-4 py-3 font-bold text-[#111318] disabled:opacity-50">Give the reward</button>
      ) : (
        <button type="button" disabled={pin.length < 4 || busy} onClick={() => act("stamp")} className="mt-4 w-full rounded-xl bg-white px-4 py-3 font-bold text-[#111318] disabled:opacity-50">Add a stamp</button>
      )}
    </div>
  );
}
