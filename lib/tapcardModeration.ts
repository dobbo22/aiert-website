// A gate every offer and news item passes before it is saved or sent to followers' phones. It sits on the server so no app,
// web page or older app version can bypass it. Three outcomes:
//   block  - clearly abusive, or a gambling offer: refused with a plain explanation (the owner can fix the wording or email us)
//   review - allowed, but logged for a person to look at (a raffle or bingo night can be legitimate, a prize draw may not be)
//   ok     - nothing found
// Word lists are conservative on purpose: whole words only, with the common "looks rude but isn't" cases (cocktail, Scunthorpe,
// better, class...) tested. Anything blocked is kept for 30 days so a mistaken block can be reviewed and the list improved.
import sql from "@/lib/db";

export type ModerationKind = "offer" | "reward" | "news" | "link";
export type ModerationCategory = "abuse" | "gambling" | "scam" | "unsafe-link";

export type Verdict =
  | { decision: "ok" }
  | { decision: "review"; category: ModerationCategory; term: string }
  | { decision: "block"; category: ModerationCategory; term: string };

// ---- Text normalising: lower case, accents off, common look-alike characters mapped back, long repeats shortened.
const LOOKALIKES: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i", "£": "e" };

// Letters from other alphabets that look like Latin ones (Cyrillic and Greek), mapped back so they cannot be used to dodge the lists.
const CONFUSABLES: Record<string, string> = {
  "\u0430": "a", "\u0435": "e", "\u043e": "o", "\u0440": "p", "\u0441": "c", "\u0445": "x", "\u0443": "y", "\u0456": "i", "\u0458": "j", "\u0455": "s",
  "\u0501": "d", "\u043a": "k", "\u043c": "m", "\u0442": "t", "\u043d": "h", "\u0432": "b", "\u0433": "r", "\u0438": "u", "\u0461": "w",
  "\u03b1": "a", "\u03b5": "e", "\u03bf": "o", "\u03c1": "p", "\u03bd": "v", "\u03b9": "i", "\u03ba": "k", "\u03c4": "t", "\u03c5": "u", "\u03c7": "x",
};
// Zero-width and other invisible characters that can be slipped inside a word.
const INVISIBLE = /[\u00ad\u034f\u061c\u115f\u1160\u17b4\u17b5\u180e\u200b-\u200f\u202a-\u202e\u2060-\u206f\u3164\ufe00-\ufe0f\ufeff\uffa0]/g;
const COMBINING = /[\u0300-\u036f]/g;

export function normalise(text: string): string {
  const base = text.replace(INVISIBLE, "").normalize("NFKD").replace(COMBINING, "").toLowerCase();
  const mapped = Array.from(base, (c) => CONFUSABLES[c] ?? LOOKALIKES[c] ?? c).join("");
  return mapped.replace(/(.)\1{2,}/g, "$1$1");
}

/// Every run of a repeated letter shortened to one ("fuuuuck" -> "fuck"), for matching abuse words written the same way.
const collapseAll = (text: string) => normalise(text).replace(/(.)\1+/g, "$1");

/// The same text with every separator removed, for catching "c.a.s.i.n.o" and "f u c k". Used only for longer, unambiguous terms.
const squash = (text: string) => normalise(text).replace(/[^a-z]/g, "");

// ---- Word lists
// Whole-word matches on the normalised text.
const ABUSE_WORDS = [
  "fuck", "fucking", "fucker", "fucked", "motherfucker", "shit", "shite", "bullshit", "cunt", "twat", "wanker", "wank", "prick", "bastard",
  "dickhead", "arsehole", "asshole", "bitch", "slut", "whore", "pussy", "nigger", "nigga", "faggot", "fag", "paki", "retard", "spastic",
  "tranny", "chink", "gook", "kike", "coon", "porn", "porno", "nazi", "hitler", "isis",
];
// Phrases (normalised): threats and harassment.
const ABUSE_PHRASES = [
  "kill you", "kill yourself", "kill them", "hope you die", "go die", "shoot you", "stab you", "rape you", "burn you", "blow you up",
  "death to", "gas the", "fuck off", "piss off you", "shut your mouth",
];

const GAMBLING_WORDS = [
  "casino", "casinos", "gambling", "gamble", "gambler", "bookmaker", "bookie", "betting", "bet", "bets", "wager", "wagers", "poker", "roulette",
  "blackjack", "jackpot", "sportsbook", "scratchcard", "scratchcards", "parlay", "bingo",
];
const GAMBLING_PHRASES = [
  "free bet", "place a bet", "place your bet", "bet on", "betting shop", "betting odds", "best odds", "slot machine", "slot machines", "fruit machine",
  "free spins", "free spin", "online slots", "slots bonus", "slots game", "play slots", "deposit bonus", "welcome bonus", "online casino", "win big", "play and win", "cash prize draw", "lucky draw",
];
// Long distinctive terms, also caught run together or with the letters spaced out ("onlinecasino", "c.a.s.i.n.o").
const GAMBLING_LONG = ["casino", "bookmaker", "sportsbook", "roulette", "blackjack", "jackpot", "gambling"];
// Betting brands, matched on the lower-cased text (some have digits) with an optional space inside the name.
const GAMBLING_BRANDS = [
  /\bbet ?365\b/, /\bpaddy ?power\b/, /\bwilliam ?hill\b/, /\bladbrokes\b/, /\bbet ?fair\b/, /\bsky ?bet\b/, /\bbet ?fred\b/, /\bunibet\b/,
  /\bdraft ?kings\b/, /\bfan ?duel\b/, /\bbet ?way\b/, /\bpoker ?stars\b/, /\bbet ?victor\b/, /\b888 ?casino\b/, /\bstake ?casino\b/, /\bgrosvenor casino/,
];
// Legitimate but regulated or worth a look: allowed, logged for review.
const REVIEW_WORDS = ["raffle", "tombola", "lottery", "lotto", "election", "candidate", "referendum", "donate", "donation", "donations", "fundraiser", "crowdfunding"];
const REVIEW_PHRASES = ["prize draw", "free draw", "win a ", "win your ", "vote for", "vote now", "sort code", "account number", "bank details", "paypal.me", "send money"];

const SCAM_PHRASES = [
  "guaranteed returns", "double your money", "get rich quick", "crypto investment", "forex signals", "send me your bank", "send us your bank",
  "payday loan", "no credit check loan", "make money from home", "binary options",
];

// Words allowed even though a looser match might catch them.
const SAFE_WORDS = new Set(["cocktail", "cocktails", "scunthorpe", "assess", "class", "classic", "bass", "passion", "shiitake", "penistone", "analysis", "button", "buttons", "essex", "sussex", "middlesex", "dickens", "cockburn", "cockburns", "hancock", "peacock", "babcock", "bethnal", "betty", "bettys", "better", "alphabet", "abet", "betsy", "bethany", "beth", "rebet", "bookshop", "bookmark", "bookings", "booking", "bookable", "coralie", "scoralle"]);

const wordRe = (words: string[]) => new RegExp(`(?:^|[^a-z])(${words.join("|")})(?=$|[^a-z])`);
const ABUSE_RE = wordRe(ABUSE_WORDS);
const ABUSE_COLLAPSED = [...new Set(ABUSE_WORDS.map((w) => w.replace(/(.)\1+/g, "$1")))];
const ABUSE_COLLAPSED_RE = wordRe(ABUSE_COLLAPSED);
const GAMBLING_RE = wordRe(GAMBLING_WORDS);
const REVIEW_RE = wordRe(REVIEW_WORDS);
// "spaced out" letters, e.g. "f u c k": four or more single letters separated by spaces or punctuation.
const SPACED_RE = /(?:^|[^a-z])((?:[a-z][\s.\-_*]+){3,}[a-z])(?=$|[^a-z])/g;

function hit(text: string, re: RegExp): string | null {
  const m = text.match(re);
  return m ? m[1] : null;
}

export function checkText(raw: string): Verdict {
  const text = normalise(raw);
  if (!text.trim()) return { decision: "ok" };

  for (const p of ABUSE_PHRASES) if (text.includes(p)) return { decision: "block", category: "abuse", term: p };
  const abuse = hit(text, ABUSE_RE);
  if (abuse && !SAFE_WORDS.has(abuse)) return { decision: "block", category: "abuse", term: abuse };
  // Letters stretched out ("fuuuuck").
  const stretched = hit(collapseAll(raw), ABUSE_COLLAPSED_RE);
  if (stretched && !SAFE_WORDS.has(stretched)) return { decision: "block", category: "abuse", term: stretched };
  // Spaced-out profanity ("f u c k", "c.u.n.t").
  for (const m of text.matchAll(SPACED_RE)) {
    const letters = m[1].replace(/[^a-z]/g, "");
    if (ABUSE_WORDS.includes(letters)) return { decision: "block", category: "abuse", term: letters };
    if (GAMBLING_WORDS.includes(letters) || GAMBLING_LONG.includes(letters)) return { decision: "block", category: "gambling", term: letters };
  }

  for (const p of GAMBLING_PHRASES) if (text.includes(p)) return { decision: "block", category: "gambling", term: p };
  const gambling = hit(text, GAMBLING_RE);
  if (gambling) return { decision: "block", category: "gambling", term: gambling };
  const lower = raw.toLowerCase();
  for (const re of GAMBLING_BRANDS) { const m = lower.match(re); if (m) return { decision: "block", category: "gambling", term: m[0] }; }
  // Run together or spaced out: long, unambiguous terms only, and never inside a known safe word.
  const squashed = squash(raw);
  for (const g of GAMBLING_LONG) {
    if (squashed.includes(g) && !text.split(/[^a-z]+/).some((w) => SAFE_WORDS.has(w) && w.includes(g))) return { decision: "block", category: "gambling", term: g };
  }

  for (const p of SCAM_PHRASES) if (text.includes(p)) return { decision: "block", category: "scam", term: p };

  const review = hit(text, REVIEW_RE);
  if (review) return { decision: "review", category: "gambling", term: review };
  for (const p of REVIEW_PHRASES) if (text.includes(p)) return { decision: "review", category: "gambling", term: p.trim() };
  return { decision: "ok" };
}

// ---- Links (the optional "Read more" on news)
const SHORTENERS = new Set(["bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly", "rebrand.ly", "cutt.ly", "shorturl.at", "tiny.cc", "rb.gy"]);

export function checkLink(raw: string): Verdict {
  let u: URL;
  try { u = new URL(raw); } catch { return { decision: "block", category: "unsafe-link", term: "address" }; }
  const host = u.hostname.toLowerCase();
  if (u.protocol !== "https:") return { decision: "block", category: "unsafe-link", term: "not https" };
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":") || host === "localhost" || !host.includes(".")) return { decision: "block", category: "unsafe-link", term: "ip or local address" };
  if (host.split(".").some((p) => p.startsWith("xn--"))) return { decision: "block", category: "unsafe-link", term: "lookalike domain" };
  if (SHORTENERS.has(host.replace(/^www\./, ""))) return { decision: "block", category: "unsafe-link", term: "link shortener" };
  const v = checkText(`${host} ${decodeURIComponent(u.pathname).replace(/[-_/]/g, " ")}`);
  if (v.decision === "block" && v.category === "gambling") return { decision: "block", category: "gambling", term: v.term };
  return { decision: "ok" };
}

// ---- Log and strikes
let ready: Promise<unknown> | null = null;
function ensureSchema(): Promise<unknown> {
  if (!ready) {
    ready = sql`
      CREATE TABLE IF NOT EXISTS tapcard_moderation_log (
        id BIGSERIAL PRIMARY KEY,
        card_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        decision TEXT NOT NULL,
        category TEXT NOT NULL,
        term TEXT NOT NULL,
        excerpt TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        reviewed BOOLEAN NOT NULL DEFAULT false
      )
    `.then(() => sql`CREATE INDEX IF NOT EXISTS tapcard_moderation_card ON tapcard_moderation_log (card_id, created_at)`)
      .catch((e) => {
        ready = null;
        throw e;
      });
  }
  return ready;
}

const MAX_BLOCKS_PER_DAY = 5;

export async function recordModeration(cardId: string, kind: ModerationKind, v: Exclude<Verdict, { decision: "ok" }>, text: string): Promise<void> {
  await ensureSchema();
  await sql`INSERT INTO tapcard_moderation_log (card_id, kind, decision, category, term, excerpt) VALUES (${cardId}, ${kind}, ${v.decision}, ${v.category}, ${v.term}, ${text.slice(0, 300)})`;
  await sql`DELETE FROM tapcard_moderation_log WHERE created_at < now() - interval '30 days'`;
}

/// True when this card has had too many blocked posts today: posting pauses for the rest of the day, so the filter cannot be probed.
export async function tooManyBlocks(cardId: string): Promise<boolean> {
  await ensureSchema();
  const r = (await sql`SELECT COUNT(*)::int AS n FROM tapcard_moderation_log WHERE card_id = ${cardId} AND decision = 'block' AND created_at > now() - interval '24 hours'`) as { n: number }[];
  return Number(r[0]?.n ?? 0) >= MAX_BLOCKS_PER_DAY;
}

export const PLAIN_REASON: Record<ModerationCategory, string> = {
  abuse: "That wording looks abusive or offensive, so it can't be posted. Please reword it.",
  gambling: "TapCard doesn't allow gambling offers (betting, casinos, poker, slots and similar), so that can't be posted.",
  scam: "That looks like a money-making or lending offer that TapCard doesn't allow, so it can't be posted.",
  "unsafe-link": "That link can't be used. Use a normal https:// web address (no link shorteners) that isn't gambling.",
};

export const APPEAL = " If you think this is a mistake, email enquiries@aiert.co.uk and we will look at it.";

/// Checks everything a post will show to people. Records blocks (and reviews) for the admin page.
export async function moderate(cardId: string, items: { kind: ModerationKind; text: string }[]): Promise<{ ok: true } | { ok: false; error: string }> {
  if (await tooManyBlocks(cardId).catch(() => false)) {
    return { ok: false, error: "Several posts for this card were refused today, so posting is paused until tomorrow." + APPEAL };
  }
  for (const item of items) {
    if (!item.text.trim()) continue;
    const v = item.kind === "link" ? checkLink(item.text) : checkText(item.text);
    if (v.decision === "ok") continue;
    await recordModeration(cardId, item.kind, v, item.text).catch(() => {});
    if (v.decision === "block") return { ok: false, error: PLAIN_REASON[v.category] + APPEAL };
  }
  return { ok: true };
}
