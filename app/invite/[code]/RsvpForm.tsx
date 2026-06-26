"use client";

import { useState } from "react";

type MenuChoice = {
  name: string;
  choice: "" | "meat" | "fish" | "vegetarian";
  notes: string;
};

type Props = {
  code: string;
  guestCount: number;
  guestNames: string[];
  initialStatus: "accepted" | "declined" | null;
  initialMessage: string | null;
  initialEmail: string | null;
  initialMenuChoices: MenuChoice[] | null;
};

export default function RsvpForm({
  code,
  guestCount,
  guestNames,
  initialStatus,
  initialMessage,
  initialEmail,
  initialMenuChoices,
}: Props) {
  const [status, setStatus] = useState<"accepted" | "declined" | null>(initialStatus);
  const [email, setEmail] = useState(initialEmail ?? "");
  const [message, setMessage] = useState(initialMessage ?? "");
  const [menuChoices, setMenuChoices] = useState<MenuChoice[]>(
    initialMenuChoices ?? guestNames.map((n) => ({ name: n, choice: "", notes: "" }))
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(initialStatus !== null);
  const [error, setError] = useState<string | null>(null);

  function updateMenuChoice(index: number, field: "choice" | "notes", value: string) {
    setMenuChoices((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    );
  }

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
        body: JSON.stringify({
          code,
          status,
          email,
          message,
          menuChoices: status === "accepted" ? menuChoices : null,
        }),
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

          <p className="anniv-note">
            A full menu will be sent for you to choose from closer to the day — for
            now, just give us a rough idea of preference below.
          </p>

          {menuChoices.map((m, i) => (
            <div className="anniv-menu-row" key={i}>
              <label className="anniv-label" htmlFor={`menu-choice-${i}`}>
                {m.name}&rsquo;s menu preference
              </label>
              <select
                id={`menu-choice-${i}`}
                className="anniv-input"
                value={m.choice}
                onChange={(e) => updateMenuChoice(i, "choice", e.target.value)}
              >
                <option value="">Select…</option>
                <option value="meat">Meat</option>
                <option value="fish">Fish</option>
                <option value="vegetarian">Vegetarian</option>
              </select>
              <input
                type="text"
                className="anniv-input anniv-menu-notes"
                placeholder="Any specifics (allergies, etc.)"
                value={m.notes}
                onChange={(e) => updateMenuChoice(i, "notes", e.target.value)}
              />
            </div>
          ))}
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
