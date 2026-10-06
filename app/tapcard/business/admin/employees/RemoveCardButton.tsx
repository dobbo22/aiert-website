"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/// Removes a company card (someone has left) — its link, QR code and any
/// forwarded copies stop working (app/api/tapcard/biz/cards/[id]).
export default function RemoveCardButton({ cardId, name }: { cardId: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm(`Remove ${name}'s card? Its link, QR code and Wallet pass will stop working.`)) return;
    setBusy(true);
    const res = await fetch(`/api/tapcard/biz/cards/${encodeURIComponent(cardId)}`, { method: "DELETE" }).catch(() => null);
    setBusy(false);
    if (res?.ok) router.refresh();
    else window.alert("Couldn't remove the card — try again.");
  }

  return (
    <button type="button" onClick={remove} disabled={busy} className="text-sm text-mist underline">
      {busy ? "Removing…" : "Remove"}
    </button>
  );
}
