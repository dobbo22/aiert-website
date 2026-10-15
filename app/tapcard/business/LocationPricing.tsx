"use client";

import { LOCATION_TIERS, MAX_LOCATIONS, MIN_LOCATIONS, STAFF_PER_LOCATION, annualGBP, perLocationGBP, tierLabel } from "@/lib/tapcardBizPricing";

// "How many locations?" with the price worked out as you type, and the price list underneath. Used by the sign-up form and
// the billing screen so both say exactly the same thing as the public pages.
export default function LocationPricing({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const n = Math.min(MAX_LOCATIONS, Math.max(MIN_LOCATIONS, Math.floor(value) || MIN_LOCATIONS));
  return (
    <div className="mt-3 rounded-xl bg-slate/30 p-4 ring-1 ring-slate">
      <label className="flex items-center justify-between gap-3 text-cloud">
        <span>How many locations?</span>
        <input
          type="number"
          min={MIN_LOCATIONS}
          max={MAX_LOCATIONS}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-24 rounded-lg bg-white px-3 py-2 text-right text-[#111318]"
        />
      </label>
      <p className="mt-3 text-lg font-bold text-cloud">
        £{annualGBP(n)} a year <span className="text-sm font-normal text-mist">(£{perLocationGBP(n)} per location, billed yearly)</span>
      </p>
      <p className="mt-1 text-sm text-cloud">
        Each location includes its own card and up to {STAFF_PER_LOCATION} staff cards, with TapCard Promote (offers and news) on every location.
      </p>
      <ul className="mt-3 space-y-1 text-sm text-cloud">
        {LOCATION_TIERS.map((t) => (
          <li key={t.from} className="flex justify-between border-b border-slate/50 py-1">
            <span>{tierLabel(t)}</span>
            <span>£{t.perYear} each a year</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-mist">One shop or one card only? TapCard Promote in the app is simpler: £49.99 a year, first 3 months free.</p>
    </div>
  );
}
