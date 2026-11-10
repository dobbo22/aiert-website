"use client";

import { useState } from "react";
import type { QueueItem } from "@/lib/linkedinReplies";

export default function ReplyQueue({ initial, recent }: { initial: QueueItem[]; recent: QueueItem[] }) {
  const [items, setItems] = useState(initial);
  const [drafts, setDrafts] = useState<Record<string, string>>(Object.fromEntries(initial.map((i) => [i.comment_id, i.draft ?? ""])));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(id: string, action: "send" | "dismiss") {
    setBusy(id);
    setError(null);
    const res = await fetch("/api/admin/social/linkedin/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, text: drafts[id] }),
    });
    const json = await res.json();
    if (res.ok) setItems((prev) => prev.filter((i) => i.comment_id !== id));
    else setError(json.error ?? "Failed");
    setBusy(null);
  }

  return (
    <div className="social-post-card lk-card">
      <p className="lk-title">Replies waiting: {items.length}</p>
      <p className="lk-note">
        Checked every few hours. Basic pricing and download questions are answered automatically; everything else waits here for you to approve.
      </p>
      {error && <p className="social-compose-error">{error}</p>}
      {items.map((i) => (
        <div key={i.comment_id} className="social-comment">
          <p className="social-post-meta">
            <span>{new Date(i.created_at).toLocaleString()}</span>
            <a href={`https://www.linkedin.com/feed/update/${i.post_urn}/`} target="_blank" rel="noreferrer">
              View post
            </a>
          </p>
          <p className="social-post-message">&ldquo;{i.comment_text}&rdquo;</p>
          {i.note && <p className="lk-note">{i.note}</p>}
          <textarea
            value={drafts[i.comment_id] ?? ""}
            onChange={(e) => setDrafts((d) => ({ ...d, [i.comment_id]: e.target.value }))}
            placeholder="Write a reply as AIERT LTD…"
            maxLength={1250}
          />
          <div className="social-compose-row">
            <button type="button" className="social-comments-toggle" disabled={busy === i.comment_id} onClick={() => act(i.comment_id, "dismiss")}>
              Dismiss
            </button>
            <button type="button" className="social-post-btn" disabled={busy === i.comment_id || !(drafts[i.comment_id] ?? "").trim()} onClick={() => act(i.comment_id, "send")}>
              {busy === i.comment_id ? "Sending…" : "Send reply"}
            </button>
          </div>
        </div>
      ))}
      {recent.length > 0 && (
        <details>
          <summary className="lk-note">Recently replied ({recent.length})</summary>
          {recent.map((r) => (
            <div key={r.comment_id} className="social-comment">
              <p className="lk-note">{r.status === "auto_sent" ? "Automatic reply" : r.status === "failed" ? "Failed to send" : "You replied"}</p>
              <p className="social-post-message">&ldquo;{r.comment_text}&rdquo;</p>
              {r.draft && <p className="lk-note">{r.draft}</p>}
            </div>
          ))}
        </details>
      )}
    </div>
  );
}
