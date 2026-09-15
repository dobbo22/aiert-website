"use client";

import { useState } from "react";
import type { ThreadsPost, ThreadsReply } from "@/lib/threadsGraph";

export default function ThreadCard({ post }: { post: ThreadsPost }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [replies, setReplies] = useState<ThreadsReply[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleReplies() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (replies !== null) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/social/threads/comments?threadId=${post.id}`);
    const json = await res.json();
    if (res.ok) {
      setReplies(json.replies);
    } else {
      setError(json.error ?? "Failed to load replies");
    }
    setLoading(false);
  }

  return (
    <div className="social-post-card">
      <div className="social-post-meta">
        <span>{new Date(post.timestamp).toLocaleString()}</span>
        {post.permalink && (
          <a href={post.permalink} target="_blank" rel="noreferrer">
            View on Threads
          </a>
        )}
      </div>
      <p className="social-post-message">{post.text ?? "(no text)"}</p>
      <button type="button" className="social-comments-toggle" onClick={toggleReplies}>
        {open ? "Hide" : "Show"} replies
      </button>

      {open && (
        <div className="social-comments-list">
          {loading && <p className="social-empty">Loading replies…</p>}
          {error && <p className="social-compose-error">{error}</p>}
          {!loading && !error && replies?.length === 0 && <p className="social-empty">No replies yet.</p>}
          {replies?.map((reply) => (
            <ReplyRow key={reply.id} reply={reply} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReplyRow({ reply }: { reply: ThreadsReply }) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replySent, setReplySent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyText.trim()) return;
    setBusy(true);
    const res = await fetch("/api/admin/social/threads/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId: reply.id, message: replyText }),
    });
    if (res.ok) {
      setReplySent(true);
      setReplying(false);
      setReplyText("");
    }
    setBusy(false);
  }

  return (
    <div className="social-comment">
      <div className="social-comment-meta">
        <span>{reply.username ?? "Unknown"}</span>
        <span>{new Date(reply.timestamp).toLocaleString()}</span>
      </div>
      <p className="social-comment-message">{reply.text}</p>
      <div className="social-comment-actions">
        <button type="button" onClick={() => setReplying((r) => !r)} disabled={busy}>
          Reply
        </button>
        {replySent && <span className="social-compose-success">Replied</span>}
      </div>
      {replying && (
        <form className="social-reply-form" onSubmit={handleReply}>
          <input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply…"
            autoFocus
          />
          <button type="submit" className="social-comments-toggle" disabled={busy}>
            Send
          </button>
        </form>
      )}
    </div>
  );
}
