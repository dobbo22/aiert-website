// LinkedIn poll shape and limits. No imports, so the browser and the server can both use it.
export type PollInput = { question: string; options: string[]; duration: "ONE_DAY" | "THREE_DAYS" | "SEVEN_DAYS" | "FOURTEEN_DAYS" };

// LinkedIn poll limits: question 140 chars, 2 to 4 options of up to 30 chars each.
export function validatePoll(p: PollInput): string | null {
  if (!p.question.trim()) return "A poll needs a question";
  if (p.question.trim().length > 140) return "A poll question can be at most 140 characters";
  const options = p.options.map((o) => o.trim()).filter(Boolean);
  if (options.length < 2 || options.length > 4) return "A poll needs between 2 and 4 options";
  if (options.some((o) => o.length > 30)) return "Each poll option can be at most 30 characters";
  return null;
}
