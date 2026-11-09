// Rules for the LinkedIn comment assistant. Pure functions, no network, so they can be tested.
//
// Policy (decided with Martin 2026-11-09):
//  - Basic factual questions about pricing or downloading get an automatic reply from the FIXED templates below.
//    A comment can never change what the page says, because the model is not involved on this path.
//  - Any other question, or a substantial comment, is queued for Martin to approve (with a Claude draft if configured).
//  - Short acknowledgements ("Great post!") are ignored.
// Keep the facts in step with tapcard.aiert.co.uk/promote, /business and www.aiert.co.uk/get-app.

export type CommentKind = "faq" | "review" | "ignore";

export const PRICING_REPLY =
  "Thanks for asking. Making and sharing a TapCard card is free, and customers never pay to follow a business or claim an offer. " +
  "TapCard Promote, which lets a business post offers, news and stamp cards, is free for the first 3 months, then £49.99 a year or £9.99 a month for one business card. " +
  "For several locations, TapCard for Business is priced per location. More here: https://tapcard.aiert.co.uk/promote";

export const DOWNLOAD_REPLY =
  "Thanks for asking. You can get TapCard for iPhone and Android here: https://www.aiert.co.uk/get-app. " +
  "Anyone can view and save a card from its QR code in a browser, and the TapCard app is what lets people follow a business to get its offers and news.";

const QUESTION_START = /^\s*(how|what|where|when|why|can|could|does|do|is|are|will|would|which|who|any)\b/i;
const PRICING = /\b(price|prices|pricing|cost|costs|how much|fee|fees|charge|charges|subscription|per month|per year|£|\$|€)/i;
const DOWNLOAD = /\b(download|downloads|app store|play store|google play|android|iphone|ios|where (can|do|could) (i|we) (get|find)|link to (the )?app|available on)\b/i;

export function isQuestion(text: string): boolean {
  return text.includes("?") || QUESTION_START.test(text);
}

const words = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

export type Classification = { kind: CommentKind; faq?: "pricing" | "download" | "both" };

export function classify(text: string): Classification {
  const t = text.trim();
  if (!t || words(t) < 3) return { kind: "ignore" };
  const q = isQuestion(t);
  const pricing = q && PRICING.test(t);
  const download = q && DOWNLOAD.test(t);
  if (pricing || download) return { kind: "faq", faq: pricing && download ? "both" : pricing ? "pricing" : "download" };
  if (q || words(t) >= 15) return { kind: "review" };
  return { kind: "ignore" };
}

export function faqReply(faq: "pricing" | "download" | "both"): string {
  return faq === "pricing" ? PRICING_REPLY : faq === "download" ? DOWNLOAD_REPLY : `${PRICING_REPLY}\n\n${DOWNLOAD_REPLY}`;
}

export const MAX_AUTO_REPLIES_PER_DAY = 5;
