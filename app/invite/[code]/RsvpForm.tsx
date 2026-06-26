"use client";

import { useState } from "react";

type Props = {
  code: string;
  guestCount: number;
  initialStatus: "accepted" | "declined" | null;
  initialDietaryNotes: string | null;
  initialMessage: string | null;
  initialEmail: string | null;
};

export default function RsvpForm({
  code,
  guestCount,
  initialStatus,
  initialDietaryNotes,
  initialMessage,
  initialEmail,
}: Props) {
  const [status, setStatus] = useState<"accepted" | "declined" | null>(initialStatus);
  const [email, setEmail] = useState(initialEmail ?? "");
  const [dietaryNotes, setDietaryNotes] = useState(initialDietaryNotes ?? "");
  const [message, setMessage] = useState(initialMessage ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(initialStatus !== null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!status) {
      setError("Please let us know if you can make it.");
      return;
    }
    if (status === "accepted" && !email.trim()) {
      setError("Please add your email so we can send you the calendar invite and map details.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, status, email, dietaryNotes, message }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      setSubmitted(true);
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="anniv-confirmed">
        {status === "accepted" ? (
          <p>
            Thank you — we can&apos;t wait to celebrate with you
            {guestCount > 1 ? " both" : ""}!
          </p>
        ) : (
          <p>Thank you for letting us know — we&apos;ll miss you on the night.</p>
        )}
        <button
          type="button"
          className="anniv-choice-btn anniv-update-btn"
          onClick={() => setSubmitted(false)}
        >
          Update my response
        </button>
      </div>
    );
  }

  return (
    <form className="anniv-form" onSubmit={handleSubmit}>
      <div className="anniv-choice-row">
        <button
          type="button"
          className={`anniv-choice-btn ${status === "accepted" ? "active-accept" : ""}`}
          onClick={() => setStatus("accepted")}
        >
          Joyfully Accept
        </button>
        <button
          type="button"
          className={`anniv-choice-btn ${status === "declined" ? "active-decline" : ""}`}
          onClick={() => setStatus("declined")}
        >
          Regretfully Decline
        </button>
      </div>

      {status === "accepted" && (
        <>
          <label className="anniv-label" htmlFor="email">
            Email address
          </label>
          <input
            id="email"
            type="email"
            className="anniv-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="So we can send the calendar invite and map link"
            required
          />

          <label className="anniv-label" htmlFor="dietaryNotes">
            Dietary requirements{guestCount > 1 ? " (for both of you)" : ""}
          </label>
          <textarea
            id="dietaryNotes"
            className="anniv-textarea"
            value={dietaryNotes}
            onChange={(e) => setDietaryNotes(e.target.value)}
            placeholder="Allergies, vegetarian, vegan, etc."
          />
          <p className="anniv-note">
            A menu (Meat / Fish / Vegetarian) will be sent for you to choose closer to the day.
          </p>
        </>
      )}

      <label className="anniv-label" htmlFor="message">
        Message for Martin &amp; Karen (optional)
      </label>
      <textarea
        id="message"
        className="anniv-textarea"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      <button type="submit" className="anniv-submit-btn" disabled={submitting}>
        {submitting ? "Sending…" : "Send RSVP"}
      </button>

      {error && <p className="anniv-status">{error}</p>}
    </form>
  );
}
