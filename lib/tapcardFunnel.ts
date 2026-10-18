// Anonymous setup funnel for the TapCard apps: how many people reach each step of setup. Counts only. No device id,
// IP address or card id is stored with an event, so a count can never be tied back to a person.
import sql from "@/lib/db";

export const FUNNEL_STEPS = [
  "setup_started", "route_business", "route_person", "card_built", "card_shared", "offer_tapped", "paywall_seen", "promote_started",
  // Shortcuts that make setup faster: how often each is used.
  "lookup_used", "lookup_picked", "scan_used", "phone_hint_used", "apple_signin_used", "contacts_used",
] as const;
export type FunnelStep = (typeof FUNNEL_STEPS)[number];

let ready: Promise<unknown> | null = null;
function ensureSchema(): Promise<unknown> {
  if (!ready) {
    ready = sql`
      CREATE TABLE IF NOT EXISTS tapcard_funnel (
        day DATE NOT NULL,
        platform TEXT NOT NULL,
        route TEXT NOT NULL,
        step TEXT NOT NULL,
        n INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (day, platform, route, step)
      )
    `.catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

export async function recordFunnel(step: string, platform: string, route: string): Promise<boolean> {
  if (!(FUNNEL_STEPS as readonly string[]).includes(step)) return false;
  const plat = platform === "ios" || platform === "android" ? platform : "other";
  const rt = route === "business" || route === "person" ? route : "";
  await ensureSchema();
  await sql`
    INSERT INTO tapcard_funnel (day, platform, route, step, n) VALUES (CURRENT_DATE, ${plat}, ${rt}, ${step}, 1)
    ON CONFLICT (day, platform, route, step) DO UPDATE SET n = tapcard_funnel.n + 1
  `;
  return true;
}

export interface FunnelRow { step: string; platform: string; route: string; n: number }

export async function funnelTotals(days: number): Promise<FunnelRow[]> {
  await ensureSchema();
  return (await sql`
    SELECT step, platform, route, SUM(n)::int AS n FROM tapcard_funnel
    WHERE day > CURRENT_DATE - ${days}::int GROUP BY step, platform, route
  `) as FunnelRow[];
}
