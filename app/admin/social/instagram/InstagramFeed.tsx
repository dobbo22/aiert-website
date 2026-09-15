"use client";

import { useState } from "react";
import type { InstagramMedia } from "@/lib/instagramGraph";
import ComposeForm from "./ComposeForm";
import MediaCard from "./MediaCard";

export default function InstagramFeed({ initialMedia }: { initialMedia: InstagramMedia[] }) {
  const [media, setMedia] = useState(initialMedia);

  function handlePosted(post: InstagramMedia) {
    setMedia((prev) => [post, ...prev]);
  }

  return (
    <div>
      <ComposeForm onPosted={handlePosted} />
      {media.length === 0 && <p className="social-empty">No posts yet.</p>}
      {media.map((m) => (
        <MediaCard key={m.id} media={m} />
      ))}
    </div>
  );
}
