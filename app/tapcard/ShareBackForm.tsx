"use client";

import { useState } from "react";

// "Share your details" for someone who opened a card with no app and no personal link: a short form that leaves
// their name plus phone or email as a pending card in the owner's app (POST /api/tapcard/cards/[id]/share-back).
export default function ShareBackForm({ cardId, ownerFirstName }: { cardId: string; ownerFirstName: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [hp, setHp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit() {
    if (busy || sent) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/tapcard/cards/${cardId}/share-back`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, company, hp }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong, try again.");
        setBusy(false);
        return;
      }
      setSent(true);
    } catch {
      setError("Check your connection and try again.");
      setBusy(false);
    }
  }

  if (sent) {
    return <p className="mt-3 rounded-2xl bg-white/[0.07] p-4 text-sm font-semibold text-white">Thanks, {ownerFirstName} will see your details.</p>;
  }
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-2 w-full rounded-xl px-4 py-3 font-semibold text-white ring-1 ring-white/30">
        Share your details with {ownerFirstName}
      </button>
    );
  }
  const field = "w-full rounded-lg bg-white/10 px-3 py-2 text-white placeholder:text-white/60";
  return (
    <div className="mt-3 rounded-2xl bg-white/[0.07] p-4 text-left text-sm text-white">
      <p className="font-semibold">Share your details with {ownerFirstName}</p>
      <div className="mt-3 space-y-2">
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" className={field} />
        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" autoComplete="tel" className={field} />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" autoComplete="email" className={field} />
        <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company (optional)" autoComplete="organization" className={field} />
        <input type="text" value={hp} onChange={(e) => setHp(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      </div>
      <p className="mt-2 text-xs text-white">Name, and a phone or email. {ownerFirstName} gets these only, and we won&apos;t email you.</p>
      {error && <p className="mt-2 text-red-300">{error}</p>}
      <button type="button" onClick={submit} disabled={busy || !name.trim() || (!phone.trim() && !email.trim())} className="mt-3 w-full rounded-xl bg-white px-4 py-2.5 font-semibold text-[#111318] disabled:opacity-60">
        {busy ? "Sending…" : "Send"}
      </button>
    </div>
  );
}
