// Facebook/Instagram post text is plain-text only — no HTML or markdown
// renders. The closest thing to "bold"/"italic" that actually displays
// styled on those platforms is swapping letters for their Unicode
// Mathematical Alphanumeric Symbol equivalents, which are real distinct
// characters (𝗹𝗶𝗸𝗲 𝘁𝗵𝗶𝘀), not markup.
const BOLD_UPPER = 0x1d400;
const BOLD_LOWER = 0x1d41a;
const BOLD_DIGIT = 0x1d7ce;
const ITALIC_UPPER = 0x1d434;
const ITALIC_LOWER = 0x1d44e;
const ITALIC_H = 0x210e; // U+1D455 is unassigned; italic "h" lives at PLANCK CONSTANT instead

export type TextStyle = "bold" | "italic";

function styleChar(ch: string, style: TextStyle): string {
  const code = ch.charCodeAt(0);

  if (style === "italic" && ch === "h") return String.fromCodePoint(ITALIC_H);

  if (code >= 65 && code <= 90) {
    return String.fromCodePoint((style === "bold" ? BOLD_UPPER : ITALIC_UPPER) + (code - 65));
  }
  if (code >= 97 && code <= 122) {
    return String.fromCodePoint((style === "bold" ? BOLD_LOWER : ITALIC_LOWER) + (code - 97));
  }
  if (style === "bold" && code >= 48 && code <= 57) {
    return String.fromCodePoint(BOLD_DIGIT + (code - 48));
  }
  return ch;
}

export function toStyledUnicode(text: string, style: TextStyle): string {
  return Array.from(text)
    .map((ch) => styleChar(ch, style))
    .join("");
}
