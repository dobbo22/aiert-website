// The day-by-day follower picture for the Insights charts. Pure, so it can be tested without a database.
//
// Before the follow log started (`started`), only people who still follow are known, so those days count them as joined and nobody as left.
// From `started` on, every follow and every unfollow is logged. The total on each day is worked backwards from today's total.
export interface DayPoint { day: string; joined: number; left: number; total: number; viaEvents: number }

export function lastDays(n: number, today: Date = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i)).toISOString().slice(0, 10));
  return out;
}

export function buildSeries(
  days: string[],
  input: { survivors: Record<string, number>; logJoined: Record<string, number>; logLeft: Record<string, number>; viaEvents: Record<string, number>; started: string; totalNow: number },
): DayPoint[] {
  const pts: DayPoint[] = days.map((day) => {
    const logged = day >= input.started;
    return {
      day,
      joined: logged ? input.logJoined[day] ?? 0 : input.survivors[day] ?? 0,
      left: logged ? input.logLeft[day] ?? 0 : 0,
      total: 0,
      viaEvents: input.viaEvents[day] ?? 0,
    };
  });
  let total = input.totalNow;
  for (let i = pts.length - 1; i >= 0; i--) {
    pts[i].total = Math.max(0, total);
    total -= pts[i].joined - pts[i].left;
  }
  return pts;
}
