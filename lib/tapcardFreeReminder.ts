// Free-months reminders: days before the end at which the admins are emailed.
export const REMINDER_STEPS = [30, 14, 7];

/** Which step is due: the smallest step the days left has reached that has not been sent. null = nothing to send. */
export function dueStep(daysLeft: number, sent: number[]): number | null {
  if (daysLeft < 0) return null;
  const reached = REMINDER_STEPS.filter((d) => daysLeft <= d);
  if (!reached.length) return null;
  const step = Math.min(...reached);
  return sent.includes(step) ? null : step;
}

