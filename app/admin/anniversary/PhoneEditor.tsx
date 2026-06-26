"use client";

import { useState } from "react";

type Props = {
  code: string;
  initialPhone: string | null;
};

export default function PhoneEditor({ code, initialPhone }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialPhone ?? "");
  const [saved, setSaved] = useState(initialPhone ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/update-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, phone: value.trim() }),
      });
      if (!res.ok) throw new Error("Failed");
      setSaved(value.trim());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button type="button" className="admin-email-display" onClick={() => setEditing(true)}>
        {saved || "Add number"}
      </button>
    );
  }

  return (
    <div className="admin-email-edit">
      <input
        type="tel"
        className="admin-email-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="+44 7700 900000"
        autoFocus
      />
      <button type="button" className="admin-email-save" onClick={handleSave} disabled={saving}>
        {saving ? "…" : "Save"}
      </button>
    </div>
  );
}
