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

/// A usable web address for the company's privacy notice: https only, no spaces, short.
export function cleanPrivacyUrl(v: unknown): string {
  if (typeof v !== "string") return "";
  const t = v.trim();
  if (t.length > 300 || /\s/.test(t)) return "";
  try { const u = new URL(t); return u.protocol === "https:" && u.hostname.includes(".") ? u.toString() : ""; } catch { return ""; }
}

// Personal mail providers: a follower using one of these is a private (retail) investor, not someone writing from a company.
const PRIVATE_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "icloud.com", "me.com", "mac.com", "aol.com", "aol.co.uk", "proton.me", "protonmail.com", "pm.me", "mail.com", "gmx.com", "gmx.co.uk", "gmx.net",
  "btinternet.com", "btopenworld.com", "bt.com", "sky.com", "talktalk.net", "virginmedia.com", "ntlworld.com", "blueyonder.co.uk", "tiscali.co.uk", "plus.net", "fastmail.com", "fastmail.fm", "zoho.com",
  "yandex.com", "qq.com", "163.com", "126.com", "tutanota.com", "hey.com",
]);
const PRIVATE_FIRST_LABELS = new Set(["hotmail", "outlook", "live", "msn", "yahoo", "ymail", "rocketmail", "googlemail", "icloud"]);

export type EmailGroup = { kind: "private" } | { kind: "company"; domain: string };

/// Which group an email address belongs to for the Followers filter: "private" for a personal mail address (gmail, hotmail, outlook, yahoo, icloud, BT and so on),
/// otherwise the company's web domain (the part after the @, without www or mail).
export function emailGroup(email: string): EmailGroup {
  const at = email.lastIndexOf("@");
  const domain = (at >= 0 ? email.slice(at + 1) : "").trim().toLowerCase().replace(/^(www|mail)\./, "");
  if (!domain || !domain.includes(".")) return { kind: "private" };
  if (PRIVATE_DOMAINS.has(domain) || PRIVATE_FIRST_LABELS.has(domain.split(".")[0])) return { kind: "private" };
  return { kind: "company", domain };
}

