"use client";

import { useState } from "react";
import { SEAT_BANDS } from "@/lib/tapcardBizBilling";

const TRIAL_ID = "trial";

export default function SignupForm() {
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [bandId, setBandId] = useState(TRIAL_ID);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trialSent, setTrialSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await submit();
    } catch {
      // A network failure or a non-JSON reply — never leave the button stuck.
      setError("Something went wrong — try again.");
      setSubmitting(false);
    }
  }

  async function submit() {
    if (bandId === TRIAL_ID) {
      const res = await fetch("/api/tapcard/biz/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, email }),
      });
      const data = await res.json();
      setSubmitting(false);
      if (!res.ok) {
        setError(data.error ?? "Something went wrong — try again.");
        return;
      }
      setTrialSent(true);
      return;
    }

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

  if (trialSent) {
    return (
      <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
        <h2 className="text-lg font-bold text-cloud">Check your email</h2>
        <p className="mt-2 text-cloud">
          We&apos;ve sent a sign-in link to {email} — no card needed, your free trial seat is ready. Upgrade to a paid
          band whenever you&apos;re ready to add your team.
        </p>
      </div>
    );
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
          <label className="flex items-center justify-between gap-2 text-cloud">
            <span className="flex items-center gap-2">
              <input type="radio" name="band" checked={bandId === TRIAL_ID} onChange={() => setBandId(TRIAL_ID)} />
              Just me — free trial
            </span>
            <span className="text-teal">Free</span>
          </label>
          {SEAT_BANDS.map((band) => (
            <label key={band.id} className="flex items-center justify-between gap-2 text-cloud">
              <span className="flex items-center gap-2">
                <input type="radio" name="band" checked={bandId === band.id} onChange={() => setBandId(band.id)} />
                {band.label}
              </span>
              <span className="text-mist">£{band.annualGBP}/year</span>
            </label>
          ))}
        </div>
      </fieldset>
      <p className="mt-4 text-sm text-cloud">
        More than 100 people?{" "}
        <a
          href={`mailto:enquiries@aiert.co.uk?subject=${encodeURIComponent("TapCard for Business — 100+ seats")}&body=${encodeURIComponent("Company name:\nApprox. number of people:\n")}`}
          className="text-gold underline"
        >
          Enquire
        </a>{" "}
        about a larger plan.
      </p>
      <button type="submit" disabled={submitting} className="btn-gold mt-6 w-full rounded-xl px-4 py-3 font-semibold">
        {submitting ? "Please wait…" : bandId === TRIAL_ID ? "Start free trial" : "Continue to payment"}
      </button>
      {error && <p className="mt-3 text-gold">{error}</p>}
    </form>
  );
}
