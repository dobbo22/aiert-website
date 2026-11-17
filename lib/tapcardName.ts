// The name to use when talking to someone ("Save Alexandrina to contacts", "Hi Alexandrina,"): the first given name, never a title.
// "Dr Alexandrina Featherstonehaugh" gives "Alexandrina"; "Dr Smith" (a title and one name) gives "Dr Smith"; "Sam Patel" gives "Sam".

const TITLES = new Set([
  "mr", "mrs", "ms", "miss", "mx", "dr", "prof", "professor", "sir", "dame", "lord", "lady", "rev", "reverend", "fr", "hon", "capt", "captain",
  "col", "colonel", "maj", "major", "lt", "sgt", "cllr", "judge",
]);

const isTitle = (word: string) => TITLES.has(word.replace(/\./g, "").toLowerCase());

export function firstNameOf(full: string | null | undefined): string {
  const words = (full ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  let i = 0;
  while (i < words.length && isTitle(words[i])) i++;
  const rest = words.slice(i);
  if (rest.length === 0) return words.join(" "); // only titles: use what was typed
  if (rest.length === 1 && i > 0) return `${words[i - 1]} ${rest[0]}`; // "Dr Smith": a title and one name
  return rest[0];
}

const SMALL_WORDS = new Set(["and", "of", "the", "plc", "ltd", "limited", "llp", "inc", "co", "&"]);

/// Up to two capital letters for a card with no photo or logo: "Corner Cafe" gives "CC", "Meridian Resources plc" gives "MR", "Sam Patel" gives "SP".
export function initialsOf(display: string | null | undefined): string {
  const words = (display ?? "").trim().split(/\s+/).filter((w) => w && !isTitle(w) && !SMALL_WORDS.has(w.toLowerCase()));
  const letters = words.map((w) => Array.from(w.replace(/^[^\p{L}\p{N}]+/u, ""))[0]).filter(Boolean) as string[];
  if (letters.length === 0) return "?";
  return (letters.length === 1 ? letters[0] : letters[0] + letters[1]).toUpperCase();
}
