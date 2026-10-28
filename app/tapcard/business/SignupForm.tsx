"use client";

import { useEffect, useState } from "react";
import LocationPricing from "./LocationPricing";
import { MAX_LOCATIONS, MIN_LOCATIONS } from "@/lib/tapcardBizPricing";

const TRIAL_ID = "trial" as const;

export default function SignupForm() {
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [yourName, setYourName] = useState("");
  const [plan, setPlan] = useState<"trial" | "locations">(TRIAL_ID);
  const [locations, setLocations] = useState(MIN_LOCATIONS);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trialSent, setTrialSent] = useState(false);

  // The app's guided setup sends people here with their business name filled in (?company=...).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const company = q.get("company");
    if (company) setCompanyName(company.slice(0, 200));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    // Gives up rather than leaving the button on "Please wait…" forever.
    const timeout = new AbortController();
    const timer = setTimeout(() => timeout.abort(), 30_000);
    try {
      await submit(timeout.signal);
    } catch {
      // A network failure, timeout or non-JSON reply. A trial may still
      // have been set up server-side, so point at the email too.
      setError("Something went wrong. Check your email for a sign-in link before trying again.");
      setSubmitting(false);
    } finally {
      clearTimeout(timer);
    }
  }

  async function submit(signal: AbortSignal) {
    if (plan === TRIAL_ID) {
      const res = await fetch("/api/tapcard/biz/trial", {
        signal,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, email, name: yourName }),
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
      signal,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyName, email, locations, name: yourName }),
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
          We&apos;ve sent a sign-in link to {email}. No card is needed and your 30-day free trial (one card) is ready. When
          you&apos;re ready for more locations and your team, choose how many locations on the Billing page.
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
        <span className="text-sm text-mist">Your name (so we can address you properly)</span>
        <input
          value={yourName}
          onChange={(e) => setYourName(e.target.value)}
          autoComplete="name"
          maxLength={100}
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
        <legend className="text-sm text-mist">Which plan?</legend>
        <div className="mt-2 space-y-2">
          <label className="flex items-center justify-between gap-2 text-cloud">
            <span className="flex items-center gap-2">
              <input type="radio" name="plan" checked={plan === TRIAL_ID} onChange={() => setPlan(TRIAL_ID)} />
              Try it free for 30 days (one card)
            </span>
            <span className="text-teal">Free</span>
          </label>
          <label className="flex items-center justify-between gap-2 text-cloud">
            <span className="flex items-center gap-2">
              <input type="radio" name="plan" checked={plan === "locations"} onChange={() => setPlan("locations")} />
              Two or more locations
            </span>
            <span className="text-mist">from £42 a year each</span>
          </label>
        </div>
        {plan === "locations" ? <LocationPricing value={locations} onChange={setLocations} /> : null}
      </fieldset>
      <p className="mt-4 text-sm text-cloud">
        More than {MAX_LOCATIONS} locations?{" "}
        <a
          href={`mailto:enquiries@aiert.co.uk?subject=${encodeURIComponent("TapCard for Business — more than 100 locations")}&body=${encodeURIComponent("Company name:\nApprox. number of locations:\n")}`}
          className="text-gold underline"
        >
          Enquire
        </a>{" "}
        about a larger plan.
      </p>
      <button type="submit" disabled={submitting} className="btn-gold mt-6 w-full rounded-xl px-4 py-3 font-semibold">
        {submitting ? "Please wait…" : plan === TRIAL_ID ? "Start free trial" : "Continue to payment"}
      </button>
      {error && <p className="mt-3 text-gold">{error}</p>}
    </form>
  );
}
