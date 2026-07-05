import { headers } from "next/headers";

export type Currency = "gbp" | "usd" | "eur";

export const CURRENCY_SYMBOL: Record<Currency, string> = { gbp: "£", usd: "$", eur: "€" };

// Same 5 bands as mailbroom-web's lib/billing-bands.ts — kept in sync manually
// since this is a separate repo/deployment. Display only: actual checkout and
// billing always happens in the app at app.mailbroom.app, which is the
// source of truth for what a customer is actually charged.
export const BANDS = [
  { key: "1-5", label: "1–5 seats", amounts: { gbp: 25, usd: 32, eur: 29 } },
  { key: "6-10", label: "6–10 seats", amounts: { gbp: 45, usd: 59, eur: 52 } },
  { key: "11-25", label: "11–25 seats", amounts: { gbp: 105, usd: 139, eur: 125 } },
  { key: "26-50", label: "26–50 seats", amounts: { gbp: 200, usd: 269, eur: 235 } },
  { key: "51-100", label: "51–100 seats", amounts: { gbp: 350, usd: 469, eur: 409 } },
] as const;

// EU member states — priced in EUR. Everywhere else (including non-euro
// European countries) falls back to GBP.
const EU_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
  "SI", "ES", "SE",
]);

export function currencyForCountry(countryCode: string | null | undefined): Currency {
  const cc = (countryCode ?? "").toUpperCase();
  if (cc === "GB") return "gbp";
  if (cc === "US") return "usd";
  if (EU_COUNTRIES.has(cc)) return "eur";
  return "gbp";
}

// Vercel's edge network sets this header on every request — no third-party
// geolocation service needed. Falls back to GBP if it's ever absent.
export async function detectCurrency(): Promise<Currency> {
  const h = await headers();
  const country = h.get("x-vercel-ip-country");
  return currencyForCountry(country);
}

export function formatAmount(currency: Currency, amount: number): string {
  return `${CURRENCY_SYMBOL[currency]}${amount}`;
}
