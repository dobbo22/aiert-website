"use client";

import { useEffect } from "react";

/// Tells the server the sample card is being used by a person: the first tap, scroll or key press, and which button was tapped.
/// Email security scanners load the page but never do any of these, so this is the reliable sign of real interest.
export default function PreviewEngage({ token }: { token: string }) {
  useEffect(() => {
    let sent = 0;
    const started = Date.now();
    const send = (what: string) => {
      if (sent >= 4 || Date.now() - started < 1500) return;
      sent++;
      try { navigator.sendBeacon(`/api/mk-engaged/${token}`, what); } catch { /* ignore */ }
    };
    const onTap = (e: Event) => send((e.target as HTMLElement | null)?.closest("a")?.getAttribute("data-label") ?? "tapped the card");
    const onOther = () => send("looked at the card");
    document.addEventListener("pointerdown", onTap, { passive: true });
    document.addEventListener("scroll", onOther, { passive: true, once: true });
    document.addEventListener("keydown", onOther, { once: true });
    return () => { document.removeEventListener("pointerdown", onTap); document.removeEventListener("scroll", onOther); document.removeEventListener("keydown", onOther); };
  }, [token]);
  return null;
}
