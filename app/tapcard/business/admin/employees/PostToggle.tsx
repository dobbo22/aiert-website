"use client";

import { useState } from "react";

/// Ticks a company card to post offers and news from its owner's phone (app/api/tapcard/biz/cards/[id]/post).
export default function PostToggle({ cardId, initial }: { cardId: string; initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function change(next: boolean) {
    setBusy(true);
    const res = await fetch(`/api/tapcard/biz/cards/${encodeURIComponent(cardId)}/post`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ canPost: next }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) setOn(next);
    else window.alert("Couldn't change that — try again.");
  }

  return (
    <label className="inline-flex items-center gap-2">
      <input type="checkbox" checked={on} disabled={busy} onChange={(e) => change(e.target.checked)} className="h-4 w-4" aria-label="Can post offers and news" />
      <span className="text-sm text-cloud">{on ? "Yes" : "No"}</span>
    </label>
  );
}
