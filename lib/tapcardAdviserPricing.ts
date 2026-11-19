// What an adviser (an IR firm or broker) pays AIERT for each company it covers: a monthly price set by the company's market cap.
// Prices are per company per month in pence, ex VAT (VAT is added at checkout for UK buyers, as for TapCard for Business).
// Each tier has its own Stripe price (env TAPCARD_ADVISER_PRICE_T1 ... T8) so a subscription holds one line per tier in use,
// with the number of companies in that tier as the quantity. The prices here must match the Stripe prices.

export interface AdviserTier { tier: number; label: string; /** upper bound of the band in £ millions (exclusive); null = no upper bound */ upToM: number | null; monthlyPence: number }

export const ADVISER_TIERS: AdviserTier[] = [
  { tier: 1, label: "Under £10m", upToM: 10, monthlyPence: 2500 },
  { tier: 2, label: "£10m to £25m", upToM: 25, monthlyPence: 3000 },
  { tier: 3, label: "£25m to £50m", upToM: 50, monthlyPence: 4000 },
  { tier: 4, label: "£50m to £100m", upToM: 100, monthlyPence: 5000 },
  { tier: 5, label: "£100m to £250m", upToM: 250, monthlyPence: 6000 },
  { tier: 6, label: "£250m to £500m", upToM: 500, monthlyPence: 7000 },
  { tier: 7, label: "£500m to £1bn", upToM: 1000, monthlyPence: 8500 },
  { tier: 8, label: "Over £1bn", upToM: null, monthlyPence: 10000 },
];

/// Each company an adviser covers is committed for this many months from the day it is added.
export const MIN_TERM_MONTHS = 6;
/// One company free for this long, then the adviser signs and pays to cover more (or keep) companies.
export const ADVISER_TRIAL_DAYS = 30;
/// The adviser is emailed this many days before the trial ends (and so before the first charge).
export const TRIAL_REMINDER_DAYS_BEFORE = 14;
/// After paid cover ends or lapses, the company keeps working this long so it can take over billing. Nothing is deleted either way.
export const COVER_GRACE_DAYS = 30;
/// Bump when the adviser terms change; the accepted version is stored with who accepted and when.
export const ADVISER_TERMS_VERSION = "2026-11-draft-1";

export function tierForMarketCap(capM: number): AdviserTier {
  const c = Number.isFinite(capM) && capM > 0 ? capM : 0;
  return ADVISER_TIERS.find((t) => t.upToM === null || c < t.upToM) ?? ADVISER_TIERS[ADVISER_TIERS.length - 1];
}
export const tierByNumber = (n: number): AdviserTier | undefined => ADVISER_TIERS.find((t) => t.tier === n);
export const tierPriceId = (n: number): string | undefined => process.env[`TAPCARD_ADVISER_PRICE_T${n}`] || undefined;
export const poundsPerMonth = (pence: number) => `£${(pence / 100).toFixed(pence % 100 ? 2 : 0)}`;

/// Monthly total (pence, ex VAT) for companies in the given tiers.
export function monthlyTotalPence(tiers: number[]): number {
  return tiers.reduce((sum, n) => sum + (tierByNumber(n)?.monthlyPence ?? 0), 0);
}
/// Number of companies per tier, for the Stripe lines.
export function tierQuantities(tiers: number[]): Record<number, number> {
  const q: Record<number, number> = {};
  for (const n of tiers) q[n] = (q[n] ?? 0) + 1;
  return q;
}
