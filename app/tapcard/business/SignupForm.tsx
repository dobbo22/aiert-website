"use client";

import { useState } from "react";
import { SEAT_BANDS } from "@/lib/tapcardBizBilling";

export default function SignupForm() {
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [bandId, setBandId] = useState(SEAT_BANDS[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/tapcard/biz/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyName, email, bandId }),
    });
    const data = await res.json();
    if (!res.ok || !data.url) {
      setError(data.error ?? "Something went wrong — try again.");
      setSubmitting(false);
      return;
    }
    window.location.href = data.url;
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
      <label className="block">
        <span className="text-sm text-mist">Company name</span>
        <input
          required
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          className="mt-1 w-full rounded-xl bg-slate/40 px-3 py-2 text-cloud ring-1 ring-slate"
        />
      </label>
      <label className="mt-4 block">
        <span className="text-sm text-mist">Your work email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-xl bg-slate/40 px-3 py-2 text-cloud ring-1 ring-slate"
        />
      </label>
      <fieldset className="mt-4">
        <legend className="text-sm text-mist">How many people?</legend>
        <div className="mt-2 space-y-2">
          {SEAT_BANDS.map((band) => (
            <label key={band.id} className="flex items-center justify-between gap-2 text-cloud">
              <span className="flex items-center gap-2">
                <input type="radio" name="band" checked={bandId === band.id} onChange={() => setBandId(band.id)} />
                {band.label}
              </span>
              <span className="text-mist">£{band.monthlyGBP}/mo</span>
            </label>
          ))}
        </div>
      </fieldset>
      <button type="submit" disabled={submitting} className="btn-gold mt-6 w-full rounded-xl px-4 py-3 font-semibold">
        {submitting ? "Starting checkout…" : "Continue to payment"}
      </button>
      {error && <p className="mt-3 text-gold">{error}</p>}
    </form>
  );
}
