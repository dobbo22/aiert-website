import sql from "@/lib/db";

// Daily and monthly limits on the free place providers, set below each one's free tier so the website can never be billed or cut off by
// overuse. Counted in the database (shared by every server instance); a provider over its limit is skipped and the next one is tried.
// Defaults can be changed with env vars named PROVIDER_CAP_<NAME>_DAY / _MONTH (a number; 0 means no limit for that period).
export type Provider = "apple" | "tomtom" | "here";

const DEFAULTS: Record<Provider, { day: number; month: number }> = {
  apple: { day: 20_000, month: 0 },   // Apple Maps Server API: 25,000 service calls a day for the team
  tomtom: { day: 2_000, month: 0 },   // TomTom free tier: 2,500 requests a day
  here: { day: 7_000, month: 200_000 }, // HERE free tier: 250,000 transactions a month
};

export function capFor(provider: Provider, period: "day" | "month"): number {
  const fromEnv = process.env[`PROVIDER_CAP_${provider.toUpperCase()}_${period.toUpperCase()}`];
  const n = fromEnv === undefined ? NaN : Number(fromEnv);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULTS[provider][period];
}

let ready: Promise<unknown> | null = null;
function ensureSchema(): Promise<unknown> {
  if (!ready) {
    ready = sql`CREATE TABLE IF NOT EXISTS tapcard_provider_cap (provider TEXT NOT NULL, period TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (provider, period))`
      .catch((e) => { ready = null; throw e; });
  }
  return ready;
}

const bump = async (provider: Provider, period: string): Promise<number> => {
  const r = (await sql`
    INSERT INTO tapcard_provider_cap (provider, period, n) VALUES (${provider}, ${period}, 1)
    ON CONFLICT (provider, period) DO UPDATE SET n = tapcard_provider_cap.n + 1 RETURNING n
  `) as { n: number }[];
  return r[0]?.n ?? 0;
};

/// Counts one call to the provider and says whether it is still within its daily and monthly limits. Fails closed: if the count cannot
/// be made, the provider is not called.
export async function underProviderCap(provider: Provider): Promise<boolean> {
  try {
    await ensureSchema();
    const now = new Date().toISOString();
    const day = capFor(provider, "day"), month = capFor(provider, "month");
    if (day > 0 && (await bump(provider, now.slice(0, 10))) > day) { console.warn(`${provider}: daily limit reached`); return false; }
    if (month > 0 && (await bump(provider, now.slice(0, 7))) > month) { console.warn(`${provider}: monthly limit reached`); return false; }
    return true;
  } catch {
    return false;
  }
}

/// Today's and this month's counts, for the admin to see.
export async function providerUsage(): Promise<{ provider: string; period: string; n: number }[]> {
  await ensureSchema();
  const now = new Date().toISOString();
  return (await sql`SELECT provider, period, n FROM tapcard_provider_cap WHERE period IN (${now.slice(0, 10)}, ${now.slice(0, 7)}) ORDER BY provider, period`) as never;
}
