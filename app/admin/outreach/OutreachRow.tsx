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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const [composing, setComposing] = useState(false);

  const canEmail = !!contact && EMAIL_RE.test(contact);

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
    <>
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
        <td style={{ display: "flex", gap: "0.3rem" }}>
          {canEmail && (
            <button type="button" className="admin-invite-btn" onClick={() => setComposing((c) => !c)}>
              {composing ? "Close" : "Email"}
            </button>
          )}
          <button type="button" className="admin-invite-btn" onClick={handleRemove} disabled={removing}>
            {removing ? "Removing…" : "Remove"}
          </button>
        </td>
      </tr>
      {composing && (
        <tr>
          <td colSpan={8}>
            <ComposeEmail
              to={contact!}
              onSent={() => {
                setComposing(false);
                saveUpdate(currentStatus === "Not sent" ? "Sent" : currentStatus, currentNotes);
              }}
            />
          </td>
        </tr>
      )}
    </>
  );
}

function ComposeEmail({ to, onSent }: { to: string; onSent: () => void }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSend() {
    if (!subject.trim() || !message.trim()) {
      setResult({ ok: false, text: "Subject and message are required" });
      return;
    }
    setSending(true);
    setResult(null);
    const res = await fetch("/api/admin/outreach/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, message }),
    });
    const json = await res.json();
    if (res.ok) {
      setResult({ ok: true, text: "Sent from martin@mailbroom.app." });
      onSent();
    } else {
      setResult({ ok: false, text: json.error ?? "Send failed" });
    }
    setSending(false);
  }

  return (
    <div style={{ padding: "0.75rem", background: "rgba(45, 55, 72, 0.3)", borderRadius: 6 }}>
      <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: "0.4rem" }}>
        To: {to} — sending from martin@mailbroom.app
      </div>
      <input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Subject"
        style={{ width: "100%", padding: "0.4rem", marginBottom: "0.4rem" }}
      />
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Message — supports [link text](https://url) markdown-style links"
        style={{ width: "100%", minHeight: 140, padding: "0.4rem", marginBottom: "0.4rem", fontFamily: "inherit" }}
      />
      <button type="button" className="admin-invite-btn" onClick={handleSend} disabled={sending}>
        {sending ? "Sending…" : "Send"}
      </button>
      {result && (
        <p style={{ color: result.ok ? "#34d399" : "#f87171", fontSize: "0.8rem", marginTop: "0.4rem" }}>{result.text}</p>
      )}
    </div>
  );
}
