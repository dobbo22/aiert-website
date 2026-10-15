// TapCard for Business pricing: per LOCATION, billed yearly, cheaper per location the more you have. Pure numbers and text
// only (no Stripe, no env), so the sign-up form, the billing screen, the public pages and the server all say the same thing.
// What is actually charged comes from the Stripe price (volume tiers, see TAPCARD_STATUS.md) and must match LOCATION_TIERS.

/// A single shop or card is better served by TapCard Promote in the app stores, so Business starts at two locations.
export const MIN_LOCATIONS = 2;
/// Above this the buyer is asked to get in touch.
export const MAX_LOCATIONS = 100;
/// Staff cards (people, not shops) included with every paid location.
export const STAFF_PER_LOCATION = 10;

export interface LocationTier { from: number; to: number; perYear: number }

/// Volume pricing: every location is charged the price of the tier the total falls in.
export const LOCATION_TIERS: LocationTier[] = [
  { from: 2, to: 4, perYear: 42 },
  { from: 5, to: 19, perYear: 34 },
  { from: 20, to: MAX_LOCATIONS, perYear: 27 },
];

export function perLocationGBP(locations: number): number {
  const t = LOCATION_TIERS.find((x) => locations >= x.from && locations <= x.to) ?? LOCATION_TIERS[LOCATION_TIERS.length - 1];
  return t.perYear;
}

export function annualGBP(locations: number): number {
  return locations * perLocationGBP(locations);
}

/// Cards an org may have: each paid location's own card plus its staff cards.
export function cardAllowance(locations: number): number {
  return locations * (1 + STAFF_PER_LOCATION);
}

export function tierLabel(t: LocationTier): string {
  return t.to >= MAX_LOCATIONS ? `${t.from} or more locations` : `${t.from} to ${t.to} locations`;
}

/// The one-paragraph explanation used on the public pages, the sign-up form and the trial email.
export const PRICING_SENTENCE =
  "TapCard for Business is priced per location, billed yearly: £42 a year per location for 2 to 4 locations, £34 each for 5 to 19, and £27 each from 20. " +
  "Every location includes up to 10 staff cards, and TapCard Promote (offers and news) is included on every location card.";
