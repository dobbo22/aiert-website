"use client";

import { useEffect } from "react";

// Renders on ios.mailbroom.app so @vercel/analytics (mounted in the root
// layout) logs a pageview for this exact path before we hand off — that
// pageview count is the click-through number for whichever link used it.
// A plain server-side redirect() would 307 before the client script ever
// loads, so the click would never be counted.
export default function GoRedirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);

  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#8a8f98", fontSize: 14 }}>
        Redirecting… if nothing happens,{" "}
        <a href={to} style={{ color: "#e0b64b" }}>
          click here
        </a>
        .
      </p>
    </div>
  );
}
