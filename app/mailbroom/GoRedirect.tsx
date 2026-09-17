"use client";

import { useEffect } from "react";

// Renders on ios.mailbroom.app so we get a chance to log the click (via
// sendBeacon, fire-and-forget) before handing off to the external site.
// A plain server-side redirect() would 307 before any client JS ran, so
// neither the analytics pageview nor this beacon would ever fire.
export default function GoRedirect({ to, slug }: { to: string; slug: string }) {
  useEffect(() => {
    try {
      const body = JSON.stringify({ slug });
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/track-click", new Blob([body], { type: "application/json" }));
      } else {
        fetch("/api/track-click", { method: "POST", body, keepalive: true });
      }
    } catch {
      // Tracking is best-effort — never block the redirect on it.
    }
    window.location.replace(to);
  }, [to, slug]);

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
