// Picks the best-matching TapCard FAQ answer for a LinkedIn comment. Pure functions, no network.
// Answers come from lib/tapcardFaq.ts, the same text the website shows, so replies match the site.
import { PROMOTE_FAQ, BUSINESS_FAQ, HOW_IT_WORKS_FAQ, SOCIETIES_FAQ } from "./tapcardFaq";

export type FaqMatch = { question: string; answer: string; page: string; score: number };

const SOURCES: Array<[string, readonly (readonly [string, string])[]]> = [
  ["https://tapcard.aiert.co.uk/promote", PROMOTE_FAQ],
  ["https://tapcard.aiert.co.uk/business", BUSINESS_FAQ],
  ["https://tapcard.aiert.co.uk/how-it-works", HOW_IT_WORKS_FAQ],
  ["https://tapcard.aiert.co.uk/societies", SOCIETIES_FAQ],
];

const STOP = new Set(["the", "and", "for", "that", "this", "with", "you", "your", "can", "does", "do", "how", "what", "will", "have", "are", "from", "they", "their", "about", "would", "could", "there", "any", "our", "not", "but", "its", "into", "need", "get", "use", "tapcard"]);
const tokens = (t: string) => new Set(t.toLowerCase().replace(/[^a-z0-9£\s]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)));

// Wording rule: never "free app" and never an unqualified "no app needed" (see the blog and pitch wording notes).
export function sanitise(text: string): string {
  return text.replace(/\bthe free TapCard app\b/gi, "the TapCard app").replace(/\ba free app\b/gi, "an app").replace(/\bfree TapCard app\b/gi, "TapCard app");
}

export function topFaq(comment: string, n = 3): FaqMatch[] {
  const c = tokens(comment);
  const scored: FaqMatch[] = [];
  for (const [page, faq] of SOURCES) {
    for (const [question, answer] of faq) {
      const q = tokens(question);
      const a = tokens(answer);
      let score = 0;
      for (const w of c) {
        if (q.has(w)) score += 3;
        else if (a.has(w)) score += 1;
      }
      scored.push({ question, answer, page, score });
    }
  }
  return scored.filter((m) => m.score > 0).sort((a, b) => b.score - a.score).slice(0, n);
}

// A usable draft only when the best match is clearly relevant; otherwise null (Martin writes it, or Claude drafts it).
export const MIN_SCORE = 6;

export function faqDraft(comment: string): { text: string; match: FaqMatch } | null {
  const [best] = topFaq(comment, 1);
  if (!best || best.score < MIN_SCORE) return null;
  return { text: `Thanks for the question. ${sanitise(best.answer)} More here: ${best.page}`, match: best };
}
