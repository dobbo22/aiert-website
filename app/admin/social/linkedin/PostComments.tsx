"use client";

import { useState } from "react";
import type { LinkedInComment } from "@/lib/linkedinApi";

export default function PostComments({ urn }: { urn: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState<LinkedInComment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [replyTo, setReplyTo] = useState<LinkedInComment | null>(null);
  const [sending, setSending] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/social/linkedin/comments?urn=${encodeURIComponent(urn)}`);
    const json = await res.json();
    if (res.ok) setComments(json.comments);
    else setError(json.error ?? "Failed to load comments");
    setLoading(false);
  }

  async function toggle() {
    if (open) return setOpen(false);
    setOpen(true);
    if (comments === null) await load();
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    setError(null);
    const res = await fetch("/api/admin/social/linkedin/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urn, text: reply, parent: replyTo?.commentUrn }),
    });
    const json = await res.json();
    if (res.ok) {
      setReply("");
      setReplyTo(null);
      await load();
    } else {
      setError(json.error ?? "Reply failed");
    }
    setSending(false);
  }

  return (
    <div>
      <button type="button" className="social-comments-toggle" onClick={toggle}>
        {open ? "Hide" : "Show"} comments{comments ? ` (${comments.length})` : ""}
      </button>
      {open && (
        <div className="social-comments-list">
          {loading && <p className="lk-note">Loading comments…</p>}
          {error && <p className="social-compose-error">{error}</p>}
          {!loading && comments?.length === 0 && <p className="lk-note">No comments yet.</p>}
          {comments?.map((c) => (
            <div key={c.id || c.createdAt} className="social-comment">
              <p className="social-post-meta">
                <span>{c.byPage ? "AIERT LTD" : "A LinkedIn member"}</span>
                <span>{new Date(c.createdAt).toLocaleString()}</span>
                {c.likes > 0 && <span>{c.likes} likes</span>}
              </p>
              <p className="social-post-message">{c.text}</p>
              {!c.byPage && c.commentUrn && (
                <button type="button" className="social-comments-toggle" onClick={() => setReplyTo(c)}>
                  Reply
                </button>
              )}
            </div>
          ))}
          <form onSubmit={send} className="social-compose">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder={replyTo ? `Reply to this comment as AIERT LTD…` : "Comment as AIERT LTD…"}
              maxLength={1250}
            />
            <div className="social-compose-row">
              {replyTo && (
                <button type="button" className="social-comments-toggle" onClick={() => setReplyTo(null)}>
                  Cancel reply
                </button>
              )}
              <button type="submit" className="social-post-btn" disabled={sending || !reply.trim()}>
                {sending ? "Sending…" : replyTo ? "Reply" : "Comment"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
