"use client";

import { useState } from "react";
import LocationPricing from "../../LocationPricing";
import { MIN_LOCATIONS } from "@/lib/tapcardBizPricing";

export default function UpgradePicker() {
  const [locations, setLocations] = useState(MIN_LOCATIONS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upgrade() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/tapcard/biz/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locations }),
    });
    const data = await res.json().catch(() => ({}));
    if (data.url) window.location.href = data.url;
    else {
      setError(data.error ?? "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      <LocationPricing value={locations} onChange={setLocations} />
      <button type="button" onClick={upgrade} disabled={busy} className="btn-gold mt-4 w-full rounded-xl px-4 py-3 font-semibold">
        {busy ? "Opening…" : "Continue to payment"}
      </button>
      {error ? <p className="mt-3 text-gold">{error}</p> : null}
    </div>
  );
}
