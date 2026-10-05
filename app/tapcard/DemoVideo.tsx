"use client";

import { useRef, useState } from "react";

// Autoplay only works muted (every browser blocks autoplay-with-sound), so
// this starts muted and silent, with a button to opt into sound — rather
// than requiring a tap just to see it play at all.
export default function DemoVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  return (
    <div className="relative mx-auto w-full max-w-xs">
      <video
        ref={videoRef}
        src="https://www.aiert.co.uk/tapcard-app-demo.mp4"
        poster="https://www.aiert.co.uk/tapcard-app-demo-poster.jpg"
        width={720}
        height={720}
        autoPlay
        muted={muted}
        loop
        playsInline
        aria-label="A business card in the TapCard iPhone app"
        className="w-full rounded-[2rem] shadow-xl ring-1 ring-white/10"
      />
      <button
        type="button"
        onClick={() => setMuted((m) => !m)}
        aria-label={muted ? "Unmute video" : "Mute video"}
        className="absolute bottom-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-cloud ring-1 ring-white/20 backdrop-blur hover:bg-black/80"
      >
        {muted ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="M11 5 6 9H2v6h4l5 4V5Z" />
            <path d="m23 9-6 6M17 9l6 6" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="M11 5 6 9H2v6h4l5 4V5Z" />
            <path d="M15.5 8.5a5 5 0 0 1 0 7M19 6a9 9 0 0 1 0 12" strokeLinecap="round" />
          </svg>
        )}
      </button>
    </div>
  );
}
