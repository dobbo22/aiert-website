"use client";

import { useEffect } from "react";

export default function ViewTracker({ code }: { code: string }) {
  useEffect(() => {
    fetch("/api/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
      keepalive: true,
    }).catch(() => {});
  }, [code]);

  return null;
}
