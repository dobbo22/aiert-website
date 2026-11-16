// Pure rules for "follow and share" (no database), so they can be tested on their own.

export interface ShareDetails {
  name: string;
  email: string;
  phone: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/// Checks what the app sent as the shareholder's details. Pure, so it can be tested without a database.
export function validateShare(input: unknown): { ok: true; details: ShareDetails } | { ok: false; error: string } {
  if (!input || typeof input !== "object") return { ok: false, error: "Details are required." };
  const o = input as Record<string, unknown>;
  const name = typeof o.name === "string" ? o.name.trim().replace(/\s+/g, " ") : "";
  const email = typeof o.email === "string" ? o.email.trim().toLowerCase() : "";
  if (name.length < 2 || name.length > 120) return { ok: false, error: "Please give your name." };
  if (email.length > 200 || !EMAIL.test(email)) return { ok: false, error: "Please give a valid email address." };
  // A phone number is deliberately never taken: only a name and an email are shared. (Older app builds may still send one; it is ignored.)
  return { ok: true, details: { name, email, phone: "" } };
}

/// "AGM 2026, London roadshow (event window)": the events one follower came through, oldest first.
export function formatEventList(rows: { label: string; via: string }[]): string {
  return rows.map((r) => (r.via === "window" ? `${r.label} (event window)` : r.label)).join(", ");
}

/// Which slot of an event a moment falls in: starts inclusive, ends exclusive; if slots overlap, the one that started last. null if none.
export function pickSlot<T extends { startsAt: string; endsAt: string }>(slots: T[], at: Date): T | null {
  const t = at.getTime();
  let best: T | null = null;
  for (const s of slots) {
    const a = new Date(s.startsAt).getTime(), b = new Date(s.endsAt).getTime();
    if (t >= a && t < b && (!best || a > new Date(best.startsAt).getTime())) best = s;
  }
  return best;
}

/// The moment a scan happened, as the app reports it: only a real time in the last 60 days and not in the future (5 minutes of slack).
export function cleanScanTime(v: unknown, now: Date = new Date()): Date | null {
  const d = typeof v === "number" ? new Date(v) : typeof v === "string" && v ? new Date(v) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  if (d.getTime() > now.getTime() + 5 * 60_000 || d.getTime() < now.getTime() - 60 * 86_400_000) return null;
  return d;
}
