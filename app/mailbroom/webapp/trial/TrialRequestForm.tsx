"use client";

import { useState } from "react";

export default function TrialRequestForm() {
  const [contactName, setContactName] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [userCount, setUserCount] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/mailbroom/trial-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactName, workEmail, companyName, userCount, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="card-teal-accent rounded-3xl p-10 text-center glow-teal">
        <div className="text-5xl mb-4">✅</div>
        <h3 className="text-xl font-bold text-cloud mb-2">Request received</h3>
        <p className="text-mist text-sm">
          We&apos;ll be in touch at <strong className="text-cloud">{workEmail}</strong> to set up your
          30-day assessment — usually within one business day.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card-glass rounded-3xl p-8 md:p-10 flex flex-col gap-5">
      <div>
        <label htmlFor="contactName" className="block text-xs font-semibold uppercase tracking-widest text-mist mb-2">
          Your name
        </label>
        <input
          id="contactName"
          type="text"
          required
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-cloud placeholder:text-mist/50 focus:outline-none focus:border-gold/60"
          placeholder="Jane Smith"
        />
      </div>
      <div>
        <label htmlFor="workEmail" className="block text-xs font-semibold uppercase tracking-widest text-mist mb-2">
          Work email
        </label>
        <input
          id="workEmail"
          type="email"
          required
          value={workEmail}
          onChange={(e) => setWorkEmail(e.target.value)}
          className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-cloud placeholder:text-mist/50 focus:outline-none focus:border-gold/60"
          placeholder="jane@yourcompany.com"
        />
      </div>
      <div>
        <label htmlFor="companyName" className="block text-xs font-semibold uppercase tracking-widest text-mist mb-2">
          Company name
        </label>
        <input
          id="companyName"
          type="text"
          required
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-cloud placeholder:text-mist/50 focus:outline-none focus:border-gold/60"
          placeholder="Your Company Ltd"
        />
      </div>
      <div>
        <label htmlFor="userCount" className="block text-xs font-semibold uppercase tracking-widest text-mist mb-2">
          Approx. number of users
        </label>
        <input
          id="userCount"
          type="text"
          value={userCount}
          onChange={(e) => setUserCount(e.target.value)}
          className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-cloud placeholder:text-mist/50 focus:outline-none focus:border-gold/60"
          placeholder="e.g. 35"
        />
      </div>
      <div>
        <label htmlFor="notes" className="block text-xs font-semibold uppercase tracking-widest text-mist mb-2">
          Anything else? (optional)
        </label>
        <textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-cloud placeholder:text-mist/50 focus:outline-none focus:border-gold/60 resize-none"
          placeholder="What you're hoping to evaluate, timeline, etc."
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="btn-gold px-8 py-4 rounded-full text-base font-bold disabled:opacity-50"
      >
        {submitting ? "Sending…" : "Request Your Free Assessment"}
      </button>
      <p className="text-xs text-mist text-center">
        No card required. We&apos;ll email you to set up access — usually within one business day.
      </p>
    </form>
  );
}
