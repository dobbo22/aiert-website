import Stripe from "stripe";

// LEGACY: the old flat seat bands (by number of people). They are no longer offered to new buyers: TapCard for Business is now
// priced per location (lib/tapcardBizPricing.ts, one volume-tiered Stripe price in TAPCARD_BIZ_PRICE_LOCATION). The bands stay here
// so an organisation that already pays on one still shows its plan on the billing page.
export interface SeatBand {
  id: string;
  label: string;
  minSeats: number;
  maxSeats: number;
  priceId: string | undefined;
  /// Display only — Stripe is the source of truth for what's actually charged.
  /// Billed annually, not monthly — see the price objects themselves
  /// (recurring.interval: "year").
  annualGBP: number;
}

export const SEAT_BANDS: SeatBand[] = [
  { id: "1-10", label: "1–10 people", minSeats: 1, maxSeats: 10, priceId: process.env.TAPCARD_BIZ_PRICE_1_10, annualGBP: 20 },
  { id: "11-25", label: "11–25 people", minSeats: 11, maxSeats: 25, priceId: process.env.TAPCARD_BIZ_PRICE_11_25, annualGBP: 40 },
  { id: "26-50", label: "26–50 people", minSeats: 26, maxSeats: 50, priceId: process.env.TAPCARD_BIZ_PRICE_26_50, annualGBP: 70 },
  { id: "51-100", label: "51–100 people", minSeats: 51, maxSeats: 100, priceId: process.env.TAPCARD_BIZ_PRICE_51_100, annualGBP: 120 },
];

/// Free trial: one seat, no Stripe price at all — see
/// app/api/tapcard/biz/trial/route.ts, which activates the org directly
/// rather than going through Checkout.
export const TRIAL_SEAT_LIMIT = 1;
/// The free trial lasts this many days from sign-up; the admin gets a reminder a few days before it ends.
export const TRIAL_DAYS = 30;
export const TRIAL_REMINDER_DAYS = 3;

/// The Stripe price (volume tiers, yearly, GBP) for the per-location plan. Not offered until it is set.
export function locationPriceId(): string | undefined {
  return process.env.TAPCARD_BIZ_PRICE_LOCATION || undefined;
}

export function bandById(id: string): SeatBand | undefined {
  return SEAT_BANDS.find((b) => b.id === id);
}

let stripeClient: Stripe | null = null;
export function stripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("Missing STRIPE_SECRET_KEY environment variable");
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}
