"use client";

import { useState } from "react";
import type { RedditPost, Subreddit } from "@/lib/redditApi";
import ComposeForm from "./ComposeForm";

export default function RedditFeed({
  subreddits,
  initialPosts,
}: {
  subreddits: Subreddit[];
  initialPosts: RedditPost[];
}) {
  const [posts, setPosts] = useState(initialPosts);

  function handlePosted(post: RedditPost) {
    setPosts((prev) => [post, ...prev]);
  }

  return (
    <div>
      <ComposeForm subreddits={subreddits} onPosted={handlePosted} />
      {posts.length === 0 && <p className="social-empty">No posts yet.</p>}
      {posts.map((post) => (
        <div key={post.id} className="social-post-card">
          <div className="social-post-meta">
            <span>{post.subreddit}</span>
            <span>{new Date(post.createdUtc * 1000).toLocaleString()}</span>
            <a href={post.permalink} target="_blank" rel="noreferrer">
              View on Reddit
            </a>
          </div>
          <p className="social-post-message">{post.title}</p>
          <div className="social-post-meta">
            <span>{post.score} score</span>
            <span>{post.numComments} comments</span>
          </div>
        </div>
      ))}
    </div>
  );
}
