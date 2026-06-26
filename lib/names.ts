function firstWord(s: string): string {
  return s.trim().split(/\s+/)[0] ?? s.trim();
}

export function firstNamesOnly(name: string): string {
  if (name.includes("&")) {
    const [a, b] = name.split("&").map((part) => firstWord(part));
    return `${a} & ${b}`;
  }
  return firstWord(name);
}

export function guestFirstNames(name: string): string[] {
  if (name.includes("&")) {
    return name.split("&").map((part) => firstWord(part));
  }
  return [firstWord(name)];
}

export function splitCoupleName(name: string): [string, string] {
  const [leftRaw, rightRaw] = name.split("&").map((part) => part.trim());
  const leftWords = leftRaw.split(/\s+/);
  const rightWords = rightRaw.split(/\s+/);
  const left = leftWords.length > 1 ? leftRaw : `${leftRaw} ${rightWords[rightWords.length - 1]}`;
  return [left, rightRaw];
}
