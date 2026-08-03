"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

type RequestType = "trial" | "demo";

export default function TrialRequestForm() {
  const searchParams = useSearchParams();
  const initialType: RequestType = searchParams.get("intent") === "demo" ? "demo" : "trial";
  // Present only when this visit came from a tracked link (intellireach's
  // click-redirect appends ?ref=<EmailSend id>, see that project's
  // /api/track/click) — forwarded so a submitted request can be attributed
  // back to the specific campaign/call that drove it, via the same
  // /api/attribution/report hook intellireach already uses for conversions.
  const ref = searchParams.get("ref");

  const [requestType, setRequestType] = useState<RequestType>(initialType);
  const [contactName, setContactName] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [userCount, setUserCount] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [bookingLink, setBookingLink] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/mailbroom/trial-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactName, workEmail, companyName, userCount, notes, requestType, ref }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      // Only ever comes from the server, only after a valid submission —
      // never a build-time constant here, so the booking page can't be
      // reached by reading the client bundle/network tab without actually
      // submitting real details first (see the route's own comment).
      if (typeof data.bookingLink === "string") setBookingLink(data.bookingLink);
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
        {requestType === "demo" ? (
          <>
            <p className="text-cloud text-sm mb-6">
              No need to wait — pick a time that works for you directly on Martin&apos;s calendar.
            </p>
            {bookingLink && (
              <a
                href={bookingLink}
                target="_blank"
                rel="noreferrer"
                className="btn-gold inline-block px-8 py-4 rounded-full text-base font-bold"
              >
                Pick a time for your call →
              </a>
            )}
          </>
        ) : (
          <p className="text-cloud text-sm">
            We&apos;ll be in touch at <strong className="text-cloud">{workEmail}</strong> to set up your
            30-day assessment — usually within one business day.
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card-glass rounded-3xl p-8 md:p-10 flex flex-col gap-5">
      <div>
        <span className="block text-xs font-semibold uppercase tracking-widest text-cloud mb-2">
          What would you like?
        </span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setRequestType("trial")}
            className={`rounded-xl px-4 py-3 text-sm font-semibold border transition-colors ${
              requestType === "trial"
                ? "bg-gold text-slate-900 border-gold"
                : "bg-white/5 text-cloud border-white/10 hover:border-white/30"
            }`}
          >
            Start a self-serve trial
          </button>
          <button
            type="button"
            onClick={() => setRequestType("demo")}
            className={`rounded-xl px-4 py-3 text-sm font-semibold border transition-colors ${
              requestType === "demo"
                ? "bg-gold text-slate-900 border-gold"
                : "bg-white/5 text-cloud border-white/10 hover:border-white/30"
            }`}
          >
            Talk to Martin first
          </button>
        </div>
      </div>
      <div>
        <label htmlFor="contactName" className="block text-xs font-semibold uppercase tracking-widest text-cloud mb-2">
          Your name
        </label>
        <input
          id="contactName"
          type="text"
          required
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-cloud placeholder:text-cloud/50 focus:outline-none focus:border-gold/60"
          placeholder="Jane Smith"
        />
      </div>
      <div>
        <label htmlFor="workEmail" className="block text-xs font-semibold uppercase tracking-widest text-cloud mb-2">
          Work email
        </label>
        <input
          id="workEmail"
          type="email"
          required
          value={workEmail}
          onChange={(e) => setWorkEmail(e.target.value)}
          className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-cloud placeholder:text-cloud/50 focus:outline-none focus:border-gold/60"
          placeholder="jane@yourcompany.com"
        />
      </div>
      <div>
        <label htmlFor="companyName" className="block text-xs font-semibold uppercase tracking-widest text-cloud mb-2">
          Company name
        </label>
        <input
          id="companyName"
          type="text"
          required
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-cloud placeholder:text-cloud/50 focus:outline-none focus:border-gold/60"
          placeholder="Your Company Ltd"
        />
      </div>
      <div>
        <label htmlFor="userCount" className="block text-xs font-semibold uppercase tracking-widest text-cloud mb-2">
          Approx. number of employees
        </label>
        <input
          id="userCount"
          type="text"
          value={userCount}
          onChange={(e) => setUserCount(e.target.value)}
          className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-cloud placeholder:text-cloud/50 focus:outline-none focus:border-gold/60"
          placeholder="e.g. 35"
        />
      </div>
      <div>
        <label htmlFor="notes" className="block text-xs font-semibold uppercase tracking-widest text-cloud mb-2">
          Anything else? (optional)
        </label>
        <textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-cloud placeholder:text-cloud/50 focus:outline-none focus:border-gold/60 resize-none"
          placeholder={requestType === "demo" ? "Best times for a call, timezone, etc." : "What you're hoping to evaluate, timeline, etc."}
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
        {submitting ? "Sending…" : requestType === "demo" ? "Request a Call with Martin" : "Request Your Free Assessment"}
      </button>
      <p className="text-xs text-cloud text-center">
        {requestType === "demo"
          ? "No card required. You'll get a link to pick a time immediately."
          : "No card required. We'll email you to set up access — usually within one business day."}
      </p>
    </form>
  );
}
