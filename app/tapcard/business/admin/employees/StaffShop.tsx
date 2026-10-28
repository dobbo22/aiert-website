"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/// Which shop a staff card belongs to: that shop's manager sees (and can remove) the card. "No shop" leaves it to admins only.
export default function StaffShop({ cardId, shopId, shops }: { cardId: string; shopId: string | null; shops: { id: string; label: string }[] }) {
  const router = useRouter();
  const [value, setValue] = useState(shopId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function change(next: string) {
    const before = value;
    setValue(next); setBusy(true); setError(false);
    const res = await fetch(`/api/tapcard/biz/cards/${encodeURIComponent(cardId)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ locationId: next || null }) }).catch(() => null);
    setBusy(false);
    if (res?.ok) router.refresh();
    else { setValue(before); setError(true); }
  }

  return (
    <span>
      <select value={value} disabled={busy} onChange={(e) => void change(e.target.value)} aria-label="Shop" className="rounded-lg bg-slate/40 px-2 py-1 text-sm text-cloud ring-1 ring-slate">
        <option value="">No shop</option>
        {shops.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select>
      {error && <span className="ml-2 text-sm text-gold">Couldn&apos;t save</span>}
    </span>
  );
}
