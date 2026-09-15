"use client";

import { useState } from "react";
import type { InstagramComment, InstagramMedia } from "@/lib/instagramGraph";

export default function MediaCard({ media }: { media: InstagramMedia }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState<InstagramComment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleComments() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (comments !== null) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/social/instagram/comments?mediaId=${media.id}`);
    const json = await res.json();
    if (res.ok) {
      setComments(json.comments);
    } else {
      setError(json.error ?? "Failed to load comments");
    }
    setLoading(false);
  }

  return (
    <div className="social-post-card">
      <div className="social-post-meta">
        <span>{new Date(media.timestamp).toLocaleString()}</span>
        {media.permalink && (
          <a href={media.permalink} target="_blank" rel="noreferrer">
            View on Instagram
          </a>
        )}
      </div>
      {media.media_url && <img src={media.media_url} alt="" className="social-post-image" />}
      <p className="social-post-message">{media.caption ?? "(no caption)"}</p>
      <button type="button" className="social-comments-toggle" onClick={toggleComments}>
        {open ? "Hide" : "Show"} comments ({media.comments_count ?? 0})
      </button>

      {open && (
        <div className="social-comments-list">
          {loading && <p className="social-empty">Loading comments…</p>}
          {error && <p className="social-compose-error">{error}</p>}
          {!loading && !error && comments?.length === 0 && <p className="social-empty">No comments yet.</p>}
          {comments?.map((comment) => (
            <CommentRow key={comment.id} comment={comment} />
          ))}
        </div>
      )}
    </div>
  );
}

function CommentRow({ comment }: { comment: InstagramComment }) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replySent, setReplySent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyText.trim()) return;
    setBusy(true);
    const res = await fetch("/api/admin/social/instagram/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId: comment.id, message: replyText }),
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
        <span>{comment.username ?? "Unknown"}</span>
        <span>{new Date(comment.timestamp).toLocaleString()}</span>
      </div>
      <p className="social-comment-message">{comment.text}</p>
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
