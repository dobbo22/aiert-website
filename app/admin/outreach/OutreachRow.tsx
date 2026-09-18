"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUS_OPTIONS = [
  "Not sent",
  "Sent",
  "Replied — interested",
  "Replied — wants paid collab",
  "Replied — declined",
  "Confirmed",
  "Posted",
];

type Props = {
  id: number;
  name: string;
  platform: string | null;
  contact: string | null;
  reach: string | null;
  contentFocus: string | null;
  status: string;
  notes: string | null;
  sentAt: string | null;
};

export default function OutreachRow({ id, name, platform, contact, reach, contentFocus, status, notes, sentAt }: Props) {
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = useState(status);
  const [currentNotes, setCurrentNotes] = useState(notes ?? "");
  const [editingNotes, setEditingNotes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function saveUpdate(nextStatus: string, nextNotes: string) {
    setSaving(true);
    await fetch("/api/admin/outreach/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: nextStatus, notes: nextNotes }),
    });
    setSaving(false);
    router.refresh();
  }

  async function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    setCurrentStatus(next);
    await saveUpdate(next, currentNotes);
  }

  async function handleNotesSave() {
    setEditingNotes(false);
    await saveUpdate(currentStatus, currentNotes);
  }

  async function handleRemove() {
    if (!confirm(`Remove ${name} from the outreach list?`)) return;
    setRemoving(true);
    await fetch("/api/admin/outreach/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    router.refresh();
  }

  return (
    <tr>
      <td>
        <strong>{name}</strong>
        {contentFocus && <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.15rem" }}>{contentFocus}</div>}
      </td>
      <td>{platform || "—"}</td>
      <td>{contact || "—"}</td>
      <td>{reach || "—"}</td>
      <td>{sentAt ? new Date(sentAt).toLocaleDateString("en-GB") : "—"}</td>
      <td>
        <select value={currentStatus} onChange={handleStatusChange} disabled={saving} style={{ padding: "0.3rem" }}>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </td>
      <td style={{ minWidth: 200 }}>
        {editingNotes ? (
          <div style={{ display: "flex", gap: "0.3rem" }}>
            <input
              value={currentNotes}
              onChange={(e) => setCurrentNotes(e.target.value)}
              style={{ flex: 1, padding: "0.3rem" }}
              autoFocus
            />
            <button type="button" className="admin-invite-btn" onClick={handleNotesSave} disabled={saving}>
              Save
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="admin-email-display"
            onClick={() => setEditingNotes(true)}
            title="Click to edit notes"
          >
            {currentNotes || "add note…"}
          </button>
        )}
      </td>
      <td>
        <button type="button" className="admin-invite-btn" onClick={handleRemove} disabled={removing}>
          {removing ? "Removing…" : "Remove"}
        </button>
      </td>
    </tr>
  );
}
