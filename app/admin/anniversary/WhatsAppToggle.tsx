"use client";

import { useState } from "react";

type Props = {
  code: string;
  initialSent: boolean;
};

export default function WhatsAppToggle({ code, initialSent }: Props) {
  const [sent, setSent] = useState(initialSent);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  async function toggle() {
    const next = !sent;
    setSaving(true);
    setError(false);
    setSent(next);
    try {
      const res = await fetch("/api/admin/toggle-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, value: next }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      setSent(!next);
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={`admin-whatsapp-btn ${sent ? "admin-whatsapp-sent" : ""}`}
        onClick={toggle}
        disabled={saving}
      >
        {sent ? "Sent WhatsApp ✓" : "Mark WhatsApp Sent"}
      </button>
      {error && <span className="admin-email-error">Failed to save — try again</span>}
    </>
  );
}
