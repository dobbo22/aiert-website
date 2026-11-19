"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function SignInForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const expired = useSearchParams().get("error") === "expired";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch("/api/tapcard/signin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }).catch(() => null);
    setBusy(false);
    if (res?.ok) { setSent(true); return; }
    setError(res?.status === 429 ? "Too many attempts. Please wait a few minutes." : "Couldn't send that. Check the address and try again.");
  }

  return (
    <main className="biz-admin flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-teal">TapCard for investor relations</p>
        <h1 className="mt-1 text-2xl font-black text-cloud">Sign in</h1>
        {sent ? (
          <div className="mt-4 rounded-xl bg-teal/20 px-4 py-3 text-cloud" role="status">
            <p>If that address is set up, a sign-in link is on its way. It works once and expires in 15 minutes.</p>
            <p className="mt-2 text-sm">If you are both a company administrator and an adviser you will get a link for each.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4">
            <label className="block text-cloud">Work email
              <input type="email" required autoComplete="email" className="mt-1 w-full rounded-lg bg-white px-3 py-2 text-[#111318]" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <button type="submit" disabled={busy} className="btn-gold mt-4 w-full rounded-xl px-5 py-3 font-semibold disabled:opacity-60">{busy ? "Sending…" : "Email me a sign-in link"}</button>
            {(error || expired) && <p className="mt-3 rounded-lg bg-red-500/20 px-3 py-2 text-cloud" role="alert">{error ?? "That link has expired or was already used. Enter your email for a new one."}</p>}
            <p className="mt-4 text-sm text-cloud">We email a link that takes you to your company's administration or your adviser portal. Not set up yet? Email <a href="mailto:enquiries@aiert.co.uk" className="text-gold underline">enquiries@aiert.co.uk</a>.</p>
          </form>
        )}
      </div>
    </main>
  );
}
