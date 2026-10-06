"use client";

import { useState } from "react";
import LivePreviewCard from "./LivePreviewCard";

// Shown on the public card page when the link carries a recipient's accept
// token (?a=<token>, see app/api/tapcard/cards/[id]/recipients/route.ts) —
// lets someone who was sent a card directly share their own details back,
// without needing TapCard themselves. The live preview is the call to
// action: tapping it is what submits (POSTs to the accept endpoint, no auth
// beyond the unguessable token, same trust model as unsubscribe), then
// offers Get TapCard or just save the contact — whichever they pick, the
// sender's already been notified, since that happened at the tap.
export default function AcceptRecipientForm({
  cardId,
  token,
  ownerFirstName,
  appStoreUrl,
}: {
  cardId: string;
  token: string;
  ownerFirstName: string;
  appStoreUrl: string;
}) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    if (submitting || sent || !name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/tapcard/cards/${cardId}/recipients/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, title, company, phone, email, website }),
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

  const vcardUrl = `/api/tapcard/vcard-preview?${new URLSearchParams({ name, title, company, phone, email, website }).toString()}`;

  return (
    <div className="mt-3 rounded-2xl bg-white/[0.07] p-4 text-left text-sm text-white">
      {!sent && <p className="font-semibold">Share your details with {ownerFirstName}</p>}
      <div className="mt-3 space-y-2">
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          disabled={sent}
          className="w-full rounded-lg bg-white/10 px-3 py-2 text-white placeholder:text-white/50 disabled:opacity-60"
        />
        <div className="flex gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Job title"
            disabled={sent}
            className="w-1/2 rounded-lg bg-white/10 px-3 py-2 text-white placeholder:text-white/50 disabled:opacity-60"
          />
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Company"
            disabled={sent}
            className="w-1/2 rounded-lg bg-white/10 px-3 py-2 text-white placeholder:text-white/50 disabled:opacity-60"
          />
        </div>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone"
          disabled={sent}
          className="w-full rounded-lg bg-white/10 px-3 py-2 text-white placeholder:text-white/50 disabled:opacity-60"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          disabled={sent}
          className="w-full rounded-lg bg-white/10 px-3 py-2 text-white placeholder:text-white/50 disabled:opacity-60"
        />
        <input
          type="text"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="Website (optional)"
          disabled={sent}
          className="w-full rounded-lg bg-white/10 px-3 py-2 text-white placeholder:text-white/50 disabled:opacity-60"
        />
      </div>

      {error && <p className="mt-2 text-red-300">{error}</p>}

      {!sent ? (
        <>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !name.trim()}
            className="mt-3 w-full text-left disabled:opacity-60"
            aria-label="This is your TapCard — tap to continue"
          >
            <LivePreviewCard name={name} title={title} company={company} phone={phone} email={email} website={website} />
          </button>
          <p className="mt-2 text-center text-xs text-white/60">
            {submitting ? "Sending…" : "This is your TapCard — tap it to continue"}
          </p>
        </>
      ) : (
        <div className="mt-3 space-y-2">
          <p className="font-semibold">Thanks — {ownerFirstName} will see your details.</p>
          <a
            href={appStoreUrl}
            className="mt-2 block w-full rounded-xl bg-white px-4 py-2.5 text-center font-semibold text-[#111318]"
          >
            Get TapCard
          </a>
          <a
            href={vcardUrl}
            className="block w-full rounded-xl px-4 py-2.5 text-center font-semibold text-white ring-1 ring-white/30"
          >
            Just save my contact
          </a>
        </div>
      )}
    </div>
  );
}
