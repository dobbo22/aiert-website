"use client";

import { useState } from "react";

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

  if (state === "done") return <p className="mt-6 rounded-xl bg-green-600 px-4 py-3 font-semibold">Marked as used</p>;
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
