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
