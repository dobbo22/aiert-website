"use client";

import { useEffect, useState } from "react";

export default function RedeemForm({ code }: { code: string }) {
  const [pin, setPin] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "bad" | "locked" | "used">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    const res = await fetch(`/api/tapcard/offer-code/${code}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    }).catch(() => null);
    if (!res) return setState("idle");
    if (res.ok) return setState("done");
    const data = await res.json().catch(() => ({}));
    setState(data.error === "bad_pin" ? "bad" : data.error === "locked" ? "locked" : "used");
  }

  // After a tick, try to close the page. Browsers only allow that for pages a script opened, so otherwise
  // the tick stays and tells staff they can go back.
  useEffect(() => {
    if (state !== "done") return;
    const t = setTimeout(() => {
      window.close();
      if (window.history.length > 1) window.history.back();
    }, 1800);
    return () => clearTimeout(t);
  }, [state]);

  if (state === "done")
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-green-600 text-white" role="status">
        <svg viewBox="0 0 24 24" className="h-40 w-40" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 12.5l5 5L20 6.5" />
        </svg>
        <p className="mt-4 text-2xl font-bold">Marked as used</p>
        <p className="mt-2 text-sm">You can close this page.</p>
      </div>
    );
  if (state === "used") return <p className="mt-6 rounded-xl bg-white/10 px-4 py-3 font-semibold">Already used</p>;
  return (
    <form onSubmit={submit} className="mt-6">
      <p className="rounded-xl bg-green-600 px-4 py-3 font-semibold">Valid offer</p>
      <label className="mt-6 block text-sm text-white/80" htmlFor="pin">Staff PIN</label>
      <input
        id="pin"
        inputMode="numeric"
        autoComplete="off"
        maxLength={6}
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
        className="mt-2 w-full rounded-xl bg-white px-4 py-3 text-center text-2xl tracking-widest text-[#111318]"
      />
      {state === "bad" ? <p className="mt-3 text-sm">Wrong PIN</p> : null}
      {state === "locked" ? <p className="mt-3 text-sm">Too many wrong tries. Set a new PIN in the app.</p> : null}
      <button type="submit" disabled={pin.length < 4 || state === "busy"} className="mt-4 w-full rounded-xl bg-white px-4 py-3 font-semibold text-[#111318] disabled:opacity-50">
        Mark as used
      </button>
    </form>
  );
}
