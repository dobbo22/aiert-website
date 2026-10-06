import Stripe from "stripe";

// Flat seat bands, like mailbroom-web's lib/billing-bands.ts — each band is
// its own fixed Stripe Price, always purchased at quantity 1, never true
// per-seat quantity metering. Price IDs are set up once in the Stripe
// dashboard and wired in via env vars; a band with no price id configured
// yet is simply not offered.
export interface SeatBand {
  id: string;
  label: string;
  minSeats: number;
  maxSeats: number;
  priceId: string | undefined;
  /// Display only — Stripe is the source of truth for what's actually charged.
  monthlyGBP: number;
}

export const SEAT_BANDS: SeatBand[] = [
  { id: "1-10", label: "1–10 people", minSeats: 1, maxSeats: 10, priceId: process.env.TAPCARD_BIZ_PRICE_1_10, monthlyGBP: 15 },
  { id: "11-25", label: "11–25 people", minSeats: 11, maxSeats: 25, priceId: process.env.TAPCARD_BIZ_PRICE_11_25, monthlyGBP: 35 },
  { id: "26-50", label: "26–50 people", minSeats: 26, maxSeats: 50, priceId: process.env.TAPCARD_BIZ_PRICE_26_50, monthlyGBP: 65 },
];

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
