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
  const phone = typeof o.phone === "string" ? o.phone.trim() : "";
  if (name.length < 2 || name.length > 120) return { ok: false, error: "Please give your name." };
  if (email.length > 200 || !EMAIL.test(email)) return { ok: false, error: "Please give a valid email address." };
  if (phone && (phone.length > 40 || phone.replace(/\D/g, "").length < 7)) return { ok: false, error: "That phone number doesn't look right." };
  return { ok: true, details: { name, email, phone } };
}
