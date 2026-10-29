// Reads an opening-hours line such as "Mon-Thu 11:30-15:00 / 17:30-22:30; Fri & Sat 11:30-22:30; Sun 11:30-22:00" (or "Mon-Fri 9-5, Sat 10-2")
// into days and times, so the demo card can show today's hours and expand to the whole week, like the apps' OpeningHours. Null when the text
// isn't clearly in that shape; the card then shows it as written.
export interface Segment { days: Set<number>; label: string; times: string } // 0 = Monday ... 6 = Sunday

const NAMES = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const isSeparator = (s: string) => ["-", "&", ",", "and", "to"].includes(s.trim().toLowerCase());

export function parseHours(text: string): Segment[] | null {
  const clean = text.replace(/[\u2013\u2014]/g, "-");
  const matches = [...clean.matchAll(/\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*\b/gi)];
  if (!matches.length) return null;
  const end = (m: RegExpMatchArray) => (m.index ?? 0) + m[0].length;
  const groups: RegExpMatchArray[][] = [];
  for (const m of matches) {
    const lastGroup = groups[groups.length - 1];
    const last = lastGroup?.[lastGroup.length - 1];
    if (last && isSeparator(clean.slice(end(last), m.index ?? 0))) { lastGroup.push(m); continue; }
    groups.push([m]);
  }
  const segments: Segment[] = [];
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    const startLoc = end(group[group.length - 1]);
    const endLoc = i + 1 < groups.length ? groups[i + 1][0].index ?? clean.length : clean.length;
    const times = clean.slice(startLoc, endLoc).replace(/^[ ;,:]+|[ ;,:]+$/g, "").replace(/\s*-\s*/g, "\u2013").replace(/\s+/g, " ");
    if (!times || !/\d/.test(times)) return null;
    const idx = group.map((m) => Math.max(0, NAMES.indexOf(m[0].toLowerCase().slice(0, 3))));
    const days = new Set<number>();
    for (let k = 0; k < idx.length; k++) {
      const between = k + 1 < idx.length ? clean.slice(end(group[k]), group[k + 1].index ?? 0).trim().toLowerCase() : "";
      if (k + 1 < idx.length && (between === "-" || between === "to")) {
        let d = idx[k];
        for (;;) { days.add(d); if (d === idx[k + 1]) break; d = (d + 1) % 7; }
      } else days.add(idx[k]);
    }
    let label = "";
    group.forEach((m, n) => {
      const name = SHORT[Math.max(0, NAMES.indexOf(m[0].toLowerCase().slice(0, 3)))];
      if (n === 0) { label = name; return; }
      const between = clean.slice(end(group[n - 1]), m.index ?? 0).trim().toLowerCase();
      label += (between === "-" || between === "to" ? "\u2013" : between === "&" || between === "and" ? " & " : ", ") + name;
    });
    segments.push({ days, label, times });
  }
  return segments;
}

/** 0 = Monday ... 6 = Sunday, in UK time. */
export function todayIndex(): number {
  const wd = new Date().toLocaleDateString("en-GB", { weekday: "short", timeZone: "Europe/London" }).slice(0, 3).toLowerCase();
  return Math.max(0, NAMES.indexOf(wd));
}

export function todayLine(segments: Segment[], today = todayIndex()): string {
  const hit = segments.find((s) => s.days.has(today));
  return hit ? `Today (${SHORT[today]}) ${hit.times}` : `Closed today (${SHORT[today]})`;
}

export const weekText = (segments: Segment[]): string => segments.map((s) => `${s.label}  ${s.times}`).join("\n");
