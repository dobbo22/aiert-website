"use client";

import { useState } from "react";
import type { FacebookPost } from "@/lib/facebookGraph";
import ComposeForm from "./ComposeForm";
import PostCard from "./PostCard";

export default function FacebookFeed({ initialPosts }: { initialPosts: FacebookPost[] }) {
  const [posts, setPosts] = useState(initialPosts);

  function handlePosted(post: FacebookPost) {
    setPosts((prev) => [post, ...prev]);
  }

  return (
    <div>
      <ComposeForm onPosted={handlePosted} />
      {posts.length === 0 && <p className="social-empty">No posts yet.</p>}
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
