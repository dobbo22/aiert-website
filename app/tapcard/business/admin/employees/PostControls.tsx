"use client";

import { useState } from "react";

type Location = { id: string; name: string };

/// Per company card: is it a shop / location, and which locations may its owner post offers and news for?
/// (app/api/tapcard/biz/cards/[id]/post). Offers belong to the location's card; staff post on its behalf.
export default function PostControls({
  cardId, isLocationInitial, postsForInitial, locations,
}: { cardId: string; isLocationInitial: boolean; postsForInitial: string[]; locations: Location[] }) {
  const [isLocation, setIsLocation] = useState(isLocationInitial);
  const [postsFor, setPostsFor] = useState<string[]>(postsForInitial);
  const [busy, setBusy] = useState(false);

  async function save(body: { isLocation?: boolean; postsFor?: string[] }) {
    setBusy(true);
    const res = await fetch(`/api/tapcard/biz/cards/${encodeURIComponent(cardId)}/post`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) window.alert("Couldn't change that — try again.");
    return !!res?.ok;
  }

  async function toggleLocation(next: boolean) {
    if (await save({ isLocation: next })) {
      setIsLocation(next);
      // A card that stops being a location can no longer be posted for.
      if (!next) setPostsFor((p) => p.filter((id) => id !== cardId));
      // Reload so every row's list of locations is current.
      window.location.reload();
    }
  }

  async function toggleTarget(id: string, on: boolean) {
    const next = on ? [...postsFor, id] : postsFor.filter((x) => x !== id);
    if (await save({ postsFor: next })) setPostsFor(next);
  }

  return (
    <div className="space-y-1 text-sm text-cloud">
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={isLocation} disabled={busy} onChange={(e) => toggleLocation(e.target.checked)} className="h-4 w-4" />
        This card is a shop / location
      </label>
      {locations.length === 0 ? (
        <p className="text-mist">Mark a shop card first to choose who posts for it.</p>
      ) : (
        <div>
          <p className="text-mist">Can post offers and news for:</p>
          {locations.map((l) => (
            <label key={l.id} className="flex items-center gap-2">
              <input
                type="checkbox" checked={postsFor.includes(l.id)} disabled={busy} className="h-4 w-4"
                onChange={(e) => toggleTarget(l.id, e.target.checked)}
              />
              {l.id === cardId ? `${l.name} (its own phone)` : l.name}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
