"use client";

import { useState } from "react";

// Shown on the public card page when the link carries a recipient's accept
// token (?a=<token>, see app/api/tapcard/cards/[id]/recipients/route.ts) —
// lets someone who was sent a card directly share their own details back,
// without needing TapCard themselves. Posts to the accept endpoint, which
// has no auth beyond the unguessable token (same trust model as unsubscribe).
export default function AcceptRecipientForm({ cardId, token, ownerFirstName }: { cardId: string; token: string; ownerFirstName: string }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/tapcard/cards/${cardId}/recipients/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, phone, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong — try again.");
        setSubmitting(false);
        return;
      }
      setSent(true);
    } catch {
      setError("Something went wrong — check your connection and try again.");
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="mt-3 rounded-2xl bg-white/[0.07] p-4 text-left text-sm text-white">
        <p className="font-semibold">Thanks — {ownerFirstName} will see your details.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 rounded-2xl bg-white/[0.07] p-4 text-left text-sm text-white">
      <p className="font-semibold">Share your details with {ownerFirstName}</p>
      <div className="mt-3 space-y-2">
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="w-full rounded-lg bg-white/10 px-3 py-2 text-white placeholder:text-white/50"
        />
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone (optional)"
          className="w-full rounded-lg bg-white/10 px-3 py-2 text-white placeholder:text-white/50"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (optional)"
          className="w-full rounded-lg bg-white/10 px-3 py-2 text-white placeholder:text-white/50"
        />
      </div>
      {error && <p className="mt-2 text-red-300">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="mt-3 w-full rounded-xl bg-white px-4 py-2.5 text-center font-semibold text-[#111318] disabled:opacity-60"
      >
        {submitting ? "Sending…" : "Share my details"}
      </button>
    </form>
  );
}
