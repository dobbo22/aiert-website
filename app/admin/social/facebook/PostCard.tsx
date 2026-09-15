"use client";

import { useState } from "react";
import type { FacebookComment, FacebookPost } from "@/lib/facebookGraph";

export default function PostCard({ post }: { post: FacebookPost }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState<FacebookComment[] | null>(null);
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
    const res = await fetch(`/api/admin/social/facebook/comments?postId=${post.id}`);
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
        <span>{new Date(post.created_time).toLocaleString()}</span>
        {post.permalink_url && (
          <a href={post.permalink_url} target="_blank" rel="noreferrer">
            View on Facebook
          </a>
        )}
      </div>
      {post.full_picture && <img src={post.full_picture} alt="" className="social-post-image" />}
      <p className="social-post-message">{post.message ?? "(no text)"}</p>
      <button type="button" className="social-comments-toggle" onClick={toggleComments}>
        {open ? "Hide" : "Show"} comments ({post.comments?.summary.total_count ?? 0})
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

function CommentRow({ comment }: { comment: FacebookComment }) {
  const [liked, setLiked] = useState(false);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replySent, setReplySent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleLike() {
    setBusy(true);
    const res = await fetch("/api/admin/social/facebook/like", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId: comment.id }),
    });
    if (res.ok) setLiked(true);
    setBusy(false);
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyText.trim()) return;
    setBusy(true);
    const res = await fetch("/api/admin/social/facebook/comments", {
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
        <span>{comment.from?.name ?? "Unknown"}</span>
        <span>{new Date(comment.created_time).toLocaleString()}</span>
      </div>
      <p className="social-comment-message">{comment.message}</p>
      <div className="social-comment-actions">
        <button type="button" onClick={handleLike} disabled={busy || liked} className={liked ? "social-comment-liked" : ""}>
          {liked ? "Liked" : `Like${comment.like_count ? ` (${comment.like_count})` : ""}`}
        </button>
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
