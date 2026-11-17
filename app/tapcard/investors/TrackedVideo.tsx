"use client";

import { useRef } from "react";
import { irTrack } from "./irTrack";

// The demo video. On a personal link it notes when the video was played and when it reached the end.
export default function TrackedVideo({ src, poster, label }: { src: string; poster: string; label: string }) {
  const played = useRef(false);
  return (
    <video
      className="mt-5 w-full max-w-4xl rounded-2xl ring-1 ring-white/10"
      src={src}
      poster={poster}
      width={1280}
      height={720}
      controls
      playsInline
      preload="metadata"
      aria-label={label}
      onPlay={() => { if (!played.current) { played.current = true; irTrack("video", "play"); } }}
      onEnded={() => irTrack("video-end")}
    />
  );
}
