"use client";

import { useState } from "react";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await fetch("/api/tapcard/biz/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setSubmitting(false);
    setSent(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-teal">TapCard for Business</p>
        <h1 className="mt-1 text-2xl font-black text-cloud">Admin sign in</h1>
        {sent ? (
          <p className="mt-4 text-cloud">
            If that email administers a TapCard for Business account, we've sent a sign-in link — it works once and
            expires in 15 minutes.
          </p>
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
          </form>
        )}
        <p className="mt-6 text-sm text-cloud">
          Don't have an account yet? <a href="/business" className="text-gold underline">Set up TapCard for Business</a>
        </p>
      </div>
    </main>
  );
}
