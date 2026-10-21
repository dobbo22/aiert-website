// Looks a registered charity number up on the Charity Commission for England and Wales register (their public API).
// Needs CHARITY_COMMISSION_API_KEY (free: register at api-portal.charitycommission.gov.uk and subscribe to "Register of Charities").
// Never throws and never guesses: if the key is missing, the register is unreachable or the answer is unexpected, the result says so
// and nothing is granted automatically. Scottish (OSCR) and Northern Irish charities are not on this register: those are approved by hand.
const BASE = process.env.CHARITY_COMMISSION_API_BASE ?? "https://api.charitycommission.gov.uk/register/api";

export type CharityResult =
  | { ok: true; number: string; name: string; registered: boolean; web: string; removedOn: string | null }
  | { ok: false; error: "not_configured" | "bad_number" | "not_found" | "unavailable" };

export function cleanCharityNumber(raw: string): string | null {
  const n = raw.replace(/[\s-]/g, "");
  return /^\d{5,8}$/.test(n) ? n : null;
}

export async function lookupCharity(raw: string): Promise<CharityResult> {
  const key = process.env.CHARITY_COMMISSION_API_KEY;
  if (!key) return { ok: false, error: "not_configured" };
  const number = cleanCharityNumber(raw);
  if (!number) return { ok: false, error: "bad_number" };
  try {
    const res = await fetch(`${BASE}/charitydetails/${number}/0`, { headers: { "Ocp-Apim-Subscription-Key": key, Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
    if (res.status === 404) return { ok: false, error: "not_found" };
    if (!res.ok) return { ok: false, error: "unavailable" };
    const d = (await res.json()) as { charity_name?: string; reg_status?: string; web?: string | null; date_of_removal?: string | null };
    if (!d.charity_name) return { ok: false, error: "not_found" };
    return { ok: true, number, name: d.charity_name, registered: d.reg_status === "R", web: d.web ?? "", removedOn: d.date_of_removal ?? null };
  } catch {
    return { ok: false, error: "unavailable" };
  }
}

const hostOf = (u: string) => {
  try { return new URL(/^[a-z]+:\/\//i.test(u.trim()) ? u.trim() : `https://${u.trim()}`).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; }
};

/// The charity's registered website and the card's website are the same site (www and path ignored). Empty never matches.
export function sameSite(a: string, b: string): boolean {
  const x = hostOf(a), y = hostOf(b);
  return !!x && !!y && x === y;
}
