"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noAccount, setNoAccount] = useState(false);
  // Set by app/api/tapcard/biz/login/[token] when a link is spent or too old.
  const linkExpired = useSearchParams().get("error") === "expired";
  const message =
    error ?? (linkExpired ? "That sign-in link has expired or was already used — enter your email for a new one." : null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setNoAccount(false);
    // Only claims "sent" once the server actually accepted the request.
    const res = await fetch("/api/tapcard/biz/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => null);
    setSubmitting(false);
    if (res?.status === 404) {
      setNoAccount(true);
      return;
    }
    if (!res?.ok) {
      setError("Couldn't send the sign-in link — try again.");
      return;
    }
    setSent(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-teal">TapCard for Business</p>
        <h1 className="mt-1 text-2xl font-black text-cloud">Admin sign in</h1>
        {sent ? (
          <p className="mt-4 text-cloud">
            We&apos;ve sent a sign-in link to {email} — it works once and expires in 15 minutes.
          </p>
        ) : noAccount ? (
          <div className="mt-4">
            <p className="text-cloud">
              There&apos;s no TapCard for Business account for {email} yet.
            </p>
            <a href="/business" className="btn-gold mt-4 block w-full rounded-xl px-4 py-3 text-center font-semibold">
              Set up an account
            </a>
            <button type="button" onClick={() => setNoAccount(false)} className="mt-3 w-full text-sm text-gold underline">
              Try a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoFocus
              className="w-full rounded-xl bg-charcoal px-4 py-3 text-cloud ring-1 ring-slate placeholder:text-mist"
            />
            <button type="submit" disabled={submitting} className="btn-gold mt-3 w-full rounded-xl px-4 py-3 font-semibold">
              {submitting ? "Sending…" : "Send sign-in link"}
            </button>
            {message && <p className="mt-3 text-gold">{message}</p>}
          </form>
        )}
        <p className="mt-6 text-sm text-cloud">
          Don&apos;t have an account yet? <a href="/business" className="text-gold underline">Set up TapCard for Business</a>
        </p>
      </div>
    </main>
  );
}
