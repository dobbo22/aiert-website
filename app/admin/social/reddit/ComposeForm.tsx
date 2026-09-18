"use client";

import { useState } from "react";
import type { RedditPost, Subreddit } from "@/lib/redditApi";

export default function ComposeForm({
  subreddits,
  onPosted,
}: {
  subreddits: Subreddit[];
  onPosted: (post: RedditPost) => void;
}) {
  const [subreddit, setSubreddit] = useState(subreddits[0]?.name ?? "");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subreddit || !title.trim()) return;
    setSubmitting(true);
    setStatus(null);

    const res = await fetch("/api/admin/social/reddit/post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subreddit, title, text }),
    });
    const json = await res.json();

    if (res.ok) {
      setStatus({ ok: true, text: `Posted to r/${subreddit}.` });
      onPosted({
        id: json.url,
        title,
        subreddit: `r/${subreddit}`,
        createdUtc: Date.now() / 1000,
        permalink: json.url,
        numComments: 0,
        score: 1,
      });
      setTitle("");
      setText("");
    } else {
      setStatus({ ok: false, text: json.error ?? "Post failed" });
    }
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="social-compose">
      <div className="social-compose-row">
        <select value={subreddit} onChange={(e) => setSubreddit(e.target.value)} required>
          {subreddits.length === 0 && <option value="">No subscribed subreddits found</option>}
          {subreddits.map((sr) => (
            <option key={sr.name} value={sr.name}>
              {sr.displayNamePrefixed} ({sr.subscribers.toLocaleString()} members)
            </option>
          ))}
        </select>
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Post title"
        required
      />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Post body (optional for a link-less text post)…"
      />
      <div className="social-compose-row">
        <button type="submit" className="social-post-btn" disabled={submitting || !subreddit}>
          {submitting ? "Posting…" : "Post to Reddit"}
        </button>
      </div>
      {status && (
        <p className={`social-compose-status ${status.ok ? "social-compose-success" : "social-compose-error"}`}>
          {status.text}
        </p>
      )}
    </form>
  );
}
