"use client";

import { useRef, useState } from "react";
import type { LinkedInPost } from "@/lib/linkedinApi";

export default function LinkedInFeed({ initialPosts }: { initialPosts: LinkedInPost[] }) {
  const [posts, setPosts] = useState(initialPosts);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formRef.current) return;
    setSubmitting(true);
    setStatus(null);
    const message = textareaRef.current?.value ?? "";
    const res = await fetch("/api/admin/social/linkedin/post", { method: "POST", body: new FormData(formRef.current) });
    const json = await res.json();
    if (res.ok) {
      setStatus({ ok: true, text: "Posted to LinkedIn." });
      setPosts((prev) => [{ urn: json.urn, text: message, createdAt: new Date().toISOString(), url: json.url, hasMedia: false }, ...prev]);
      formRef.current.reset();
    } else {
      setStatus({ ok: false, text: json.error ?? "Post failed" });
    }
    setSubmitting(false);
  }

  return (
    <div>
      <form ref={formRef} onSubmit={handleSubmit} className="social-compose">
        <textarea ref={textareaRef} name="message" placeholder="Write a post for the AIERT LTD LinkedIn page…" required maxLength={3000} />
        <div className="social-compose-row">
          <input type="file" name="image" accept="image/*" />
          <button type="submit" className="social-post-btn" disabled={submitting}>
            {submitting ? "Posting…" : "Post to LinkedIn"}
          </button>
        </div>
        {status && (
          <p className={`social-compose-status ${status.ok ? "social-compose-success" : "social-compose-error"}`}>{status.text}</p>
        )}
      </form>
      {posts.length === 0 && <p className="social-empty">No posts yet.</p>}
      {posts.map((post) => (
        <div key={post.urn} className="social-post-card">
          <div className="social-post-meta">
            <span>{new Date(post.createdAt).toLocaleString()}</span>
            <a href={post.url} target="_blank" rel="noreferrer">
              View on LinkedIn
            </a>
          </div>
          <p className="social-post-message">{post.text || "(no text)"}</p>
          {post.hasMedia && <p className="social-empty">Includes an image or video.</p>}
        </div>
      ))}
    </div>
  );
}
