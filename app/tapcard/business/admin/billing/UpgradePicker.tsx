"use client";

import { useState } from "react";
import { SEAT_BANDS } from "@/lib/tapcardBizBilling";

export default function UpgradePicker() {
  const [loadingBand, setLoadingBand] = useState<string | null>(null);

  async function upgrade(bandId: string) {
    setLoadingBand(bandId);
    const res = await fetch("/api/tapcard/biz/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bandId }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setLoadingBand(null);
  }

  return (
    <div className="mt-3 space-y-2">
      {SEAT_BANDS.map((band) => (
        <button
          key={band.id}
          type="button"
          onClick={() => upgrade(band.id)}
          disabled={loadingBand !== null}
          className="flex w-full items-center justify-between rounded-xl bg-slate/40 px-4 py-3 text-cloud ring-1 ring-slate hover:ring-gold"
        >
          <span>{band.label}</span>
          <span className="text-mist">{loadingBand === band.id ? "Opening…" : `£${band.annualGBP}/year`}</span>
        </button>
      ))}
    </div>
  );
}
