"use client";

import { useState } from "react";

const field = "mt-1 w-full rounded-lg bg-white px-3 py-2 text-[#111318]";

// A group asks for a free TapCard Promote. A registered charity whose website matches the card is approved at once.
export default function GrantRequestForm() {
  const [card, setCard] = useState("");
  const [groupName, setGroupName] = useState("");
  const [email, setEmail] = useState("");
  const [charity, setCharity] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ granted: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch("/api/tapcard/grant-request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ card, groupName, email, charityNumber: charity }) }).catch(() => null);
    const data = res ? ((await res.json().catch(() => ({}))) as { ok?: boolean; granted?: boolean; error?: string }) : {};
    setBusy(false);
    if (res?.ok && data.ok) setResult({ granted: !!data.granted });
    else setError(data.error ?? "Couldn't send that. Please try again.");
  }

  if (result) {
    return (
      <div className="mt-4 rounded-xl bg-white/10 p-4 text-cloud" role="status">
        {result.granted ? (
          <p className="font-semibold">Done: TapCard Promote is free for your group for 12 months. We have emailed you the details.</p>
        ) : (
          <p className="font-semibold">Thank you. We will check your request and email you, usually within a few days.</p>
        )}
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="mt-4 max-w-xl text-sm text-cloud">
      <label className="block">Your card&apos;s link (make a card first, then copy its link)<input className={field} required value={card} onChange={(e) => setCard(e.target.value)} placeholder="https://tapcard.aiert.co.uk/c/..." /></label>
      <label className="mt-3 block">Your group&apos;s name<input className={field} required value={groupName} onChange={(e) => setGroupName(e.target.value)} /></label>
      <label className="mt-3 block">Your email<input className={field} required type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label className="mt-3 block">Charity number (if you are a registered charity in England or Wales)<input className={field} value={charity} onChange={(e) => setCharity(e.target.value)} inputMode="numeric" /></label>
      <p className="mt-2 text-xs">A registered charity whose website is on its card is approved straight away. Other groups are checked by a person.</p>
      {error && <p className="mt-2 font-semibold">{error}</p>}
      <button type="submit" disabled={busy} className="btn-gold mt-4 rounded-xl px-5 py-3 font-semibold disabled:opacity-60">{busy ? "Sending…" : "Ask for free TapCard Promote"}</button>
    </form>
  );
}
