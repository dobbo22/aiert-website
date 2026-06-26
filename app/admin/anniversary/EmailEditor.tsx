"use client";

import { useState } from "react";

type Props = {
  code: string;
  initialEmail: string | null;
  onSaved?: (email: string) => void;
};

export default function EmailEditor({ code, initialEmail, onSaved }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialEmail ?? "");
  const [saved, setSaved] = useState(initialEmail ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError(false);
    try {
      const res = await fetch("/api/admin/update-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, email: value.trim() }),
      });
      if (!res.ok) throw new Error("Failed");
      setSaved(value.trim());
      setEditing(false);
      onSaved?.(value.trim());
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button type="button" className="admin-email-display" onClick={() => setEditing(true)}>
        {saved || "Add email"}
      </button>
    );
  }

  return (
    <div className="admin-email-edit">
      <input
        type="email"
        className="admin-email-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="guest@example.com"
        autoFocus
      />
      <button type="button" className="admin-email-save" onClick={handleSave} disabled={saving}>
        {saving ? "…" : "Save"}
      </button>
      {error && <span className="admin-email-error">Invalid</span>}
    </div>
  );
}
