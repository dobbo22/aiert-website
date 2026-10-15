"use client";

import { useEffect } from "react";

// iPhone has no install referrer, so a visitor who taps "Get TapCard" on a business's card page has this card's link copied
// first. TapCard finds it on its first launch and opens on that business (the same way company invites find their link).
// Android carries the business in the Play install referrer instead (see app/tapcard/go).
export default function CarryCardToInstall({ cardLink }: { cardLink: string }) {
  useEffect(() => {
    if (!/iPhone|iPad|iPod/i.test(navigator.userAgent)) return;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a");
      if (a && a.href.includes("/go/tapcard-web-get-tapcard")) {
        try { void navigator.clipboard?.writeText(cardLink); } catch { /* the store opens either way */ }
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [cardLink]);
  return null;
}
