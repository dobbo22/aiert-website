"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function AdviserLoginForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const expired = useSearchParams().get("error") === "expired";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch("/api/tapcard/adviser/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }).catch(() => null);
    setBusy(false);
    if (res?.ok) { setSent(true); return; }
    setError(res?.status === 429 ? "Too many attempts. Please wait a few minutes." : "Couldn't send that. Check the address and try again.");
  }
  return (
    <main className="biz-admin flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-teal">TapCard adviser portal</p>
        <h1 className="mt-1 text-2xl font-black text-cloud">Sign in</h1>
        {sent ? (
          <p className="mt-4 rounded-xl bg-teal/20 px-4 py-3 text-cloud" role="status">If that address is set up for an adviser, a sign-in link is on its way. It works once and expires in 15 minutes.</p>
        ) : (
          <form onSubmit={submit} className="mt-4">
            <label className="block text-cloud">Work email
              <input type="email" required className="mt-1 w-full rounded-lg bg-white px-3 py-2 text-[#111318]" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </label>
            <button type="submit" disabled={busy} className="btn-gold mt-4 w-full rounded-xl px-5 py-3 font-semibold disabled:opacity-60">{busy ? "Sending…" : "Email me a sign-in link"}</button>
            {(error || expired) && <p className="mt-3 rounded-lg bg-red-500/20 px-3 py-2 text-cloud">{error ?? "That link has expired or was already used. Enter your email for a new one."}</p>}
            <p className="mt-4 text-sm text-cloud">Advisers are set up by AIERT. Email enquiries@aiert.co.uk to be added.</p>
          </form>
        )}
      </div>
    </main>
  );
}
