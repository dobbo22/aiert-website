"use client";

import { useEffect, useState } from "react";
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
  const [checkingReplies, setCheckingReplies] = useState(false);

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
          <select value={currentStatus} onChange={handleStatusChange} disabled={saving} className="outreach-status-select">
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </td>
        <td style={{ minWidth: 180 }}>
          {editingNotes ? (
            <div style={{ display: "flex", gap: "0.3rem" }}>
              <input
                value={currentNotes}
                onChange={(e) => setCurrentNotes(e.target.value)}
                style={{ flex: 1, padding: "0.3rem" }}
                autoFocus
              />
              <button type="button" className="outreach-btn" onClick={handleNotesSave} disabled={saving}>
                Save
              </button>
            </div>
          ) : (
            <button type="button" className="outreach-notes-display" onClick={() => setEditingNotes(true)}>
              {currentNotes || "add note…"}
            </button>
          )}
        </td>
        <td>
          <div className="outreach-row-actions">
            {canEmail && (
              <button type="button" className="outreach-btn" onClick={() => setComposing((c) => !c)}>
                {composing ? "Close" : "Email"}
              </button>
            )}
            {canEmail && (
              <button type="button" className="outreach-btn" onClick={() => setCheckingReplies((c) => !c)}>
                {checkingReplies ? "Close" : "Replies"}
              </button>
            )}
            <button type="button" className="outreach-btn" onClick={handleRemove} disabled={removing}>
              {removing ? "…" : "Remove"}
            </button>
          </div>
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
      {checkingReplies && (
        <tr>
          <td colSpan={8}>
            <RepliesPanel email={contact!} />
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
    <div className="outreach-panel card-glass">
      <div className="outreach-panel-label">To: {to} — sending from martin@mailbroom.app</div>
      <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Message — supports [link text](https://url) markdown-style links"
      />
      <button type="button" className="outreach-btn outreach-btn-primary" onClick={handleSend} disabled={sending}>
        {sending ? "Sending…" : "Send"}
      </button>
      {result && <p className={result.ok ? "outreach-status-ok" : "outreach-status-error"}>{result.text}</p>}
    </div>
  );
}

type MailboxMessage = {
  id: string;
  subject: string;
  bodyPreview: string;
  receivedDateTime: string;
  webLink: string;
  from?: { emailAddress?: { name?: string; address?: string } };
};

function RepliesPanel({ email }: { email: string }) {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<MailboxMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/admin/outreach/replies?email=${encodeURIComponent(email)}`);
      const json = await res.json();
      if (cancelled) return;
      if (res.ok) {
        setMessages(json.messages);
      } else {
        setError(json.error ?? "Failed to check replies");
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [email]);

  return (
    <div className="outreach-panel card-glass">
      <div className="outreach-panel-label">Inbox messages from {email}</div>
      {loading && <p className="outreach-empty">Checking martin@mailbroom.app inbox…</p>}
      {error && <p className="outreach-status-error">{error}</p>}
      {!loading && !error && messages?.length === 0 && <p className="outreach-empty">No replies found yet.</p>}
      {messages?.map((m) => (
        <div key={m.id} className="outreach-reply">
          <div className="outreach-reply-meta">
            <span>{m.from?.emailAddress?.name || m.from?.emailAddress?.address}</span>
            <span>{new Date(m.receivedDateTime).toLocaleString()}</span>
          </div>
          <div className="outreach-reply-subject">{m.subject}</div>
          <div className="outreach-reply-preview">{m.bodyPreview}</div>
          <a href={m.webLink} target="_blank" rel="noreferrer" className="outreach-notes-display" style={{ marginTop: "0.4rem", display: "inline-block" }}>
            Open in Outlook →
          </a>
        </div>
      ))}
    </div>
  );
}
