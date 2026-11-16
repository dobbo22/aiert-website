import type { DayPoint } from "@/lib/tapcardInsightsSeries";

// Small pure helpers for Insights: counts only, never a named person.

/// Who joined and left over the day an announcement was posted and the day after (about 48 hours). null when that is before
/// stopping-following was being counted, or outside the days we hold.
export function followChangeAfter(series: DayPoint[], postedDay: string, logStarted: string): { joined: number; left: number } | null {
  if (postedDay < logStarted) return null;
  const i = series.findIndex((p) => p.day === postedDay);
  if (i < 0) return null;
  const days = series.slice(i, i + 2);
  return { joined: days.reduce((n, p) => n + p.joined, 0), left: days.reduce((n, p) => n + p.left, 0) };
}

export interface InvestorMix { people: number; companies: number; private: number; top: { domain: string; people: number }[]; newOrgs30: number }

/// The people who shared their details, split into company email addresses and private ones (Gmail and the like), the biggest
/// organisations by number of people, and how many organisations first appeared in the last 30 days.
export function investorMix(rows: { domain: string | null; consentedAt: string }[], now = Date.now()): InvestorMix {
  const per = new Map<string, { n: number; first: number }>();
  let priv = 0;
  for (const r of rows) {
    if (!r.domain) { priv += 1; continue; }
    const t = new Date(r.consentedAt).getTime();
    const e = per.get(r.domain);
    if (e) { e.n += 1; e.first = Math.min(e.first, t); } else per.set(r.domain, { n: 1, first: t });
  }
  const top = [...per.entries()].sort((a, b) => b[1].n - a[1].n || a[0].localeCompare(b[0])).slice(0, 8).map(([domain, v]) => ({ domain, people: v.n }));
  const cutoff = now - 30 * 86400000;
  return { people: rows.length, companies: per.size, private: priv, top, newOrgs30: [...per.values()].filter((v) => v.first >= cutoff).length };
}

/// Per 100: how many of `of` became `n`, rounded; null when there is nothing to divide by.
export const per100 = (n: number, of: number): number | null => (of > 0 ? Math.round((n / of) * 100) : null);
