"use client";

import { useState } from "react";
import type { ThreadsPost } from "@/lib/threadsGraph";
import ComposeForm from "./ComposeForm";
import ThreadCard from "./ThreadCard";

export default function ThreadsFeed({ initialPosts }: { initialPosts: ThreadsPost[] }) {
  const [posts, setPosts] = useState(initialPosts);

  function handlePosted(post: ThreadsPost) {
    setPosts((prev) => [post, ...prev]);
  }

  return (
    <div>
      <ComposeForm onPosted={handlePosted} />
      {posts.length === 0 && <p className="social-empty">No posts yet.</p>}
      {posts.map((post) => (
        <ThreadCard key={post.id} post={post} />
      ))}
    </div>
  );
}
