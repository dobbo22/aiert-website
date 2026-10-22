import crypto from "crypto";
import sql from "@/lib/db";
import { getCard, type TapCardRecord } from "@/lib/tapcardDb";
import { send } from "@/lib/tapcardBizEmail";
import { readLimited, safeFetch } from "@/lib/siteIcon";

// Ownership checks for business cards.
//
// A business proves it controls its card by entering a 6-digit code sent to an email address on its own website's domain.
// One verified card per domain: a second card for the same business can follow, but not verify, unless support moves it.
// Posting offers and news needs a verified card once TAPCARD_VERIFY_ENFORCE=1 (company cards from TapCard for Business count
// as verified already). Reports of fake or wrong cards are saved here too and listed in the admin.

let ready: Promise<unknown> | null = null;
function ensureSchema(): Promise<unknown> {
  if (!ready) {
    ready = sql`ALTER TABLE tapcard_cards ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ`
      .then(() => sql`ALTER TABLE tapcard_cards ADD COLUMN IF NOT EXISTS verified_domain TEXT NOT NULL DEFAULT ''`)
      .then(() => sql`CREATE TABLE IF NOT EXISTS tapcard_verifications (
        id SERIAL PRIMARY KEY, card_id TEXT NOT NULL, email TEXT NOT NULL, domain TEXT NOT NULL, code_hash TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, used BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now())`)
      .then(() => sql`CREATE INDEX IF NOT EXISTS tapcard_verifications_card ON tapcard_verifications (card_id, created_at DESC)`)
      .then(() => sql`CREATE TABLE IF NOT EXISTS tapcard_reports (
        id SERIAL PRIMARY KEY, card_id TEXT NOT NULL, reason TEXT NOT NULL, details TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'open', created_at TIMESTAMPTZ NOT NULL DEFAULT now())`)
      .catch((e) => { ready = null; throw e; });
  }
  return ready;
}

export const verifyEnforced = () => process.env.TAPCARD_VERIFY_ENFORCE === "1";

// Websites that are not a business's own domain: a code to one of these addresses proves nothing about the business.
const NOT_OWN_DOMAIN = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "hotmail.co.uk", "live.com", "yahoo.com", "yahoo.co.uk", "icloud.com", "me.com",
  "btinternet.com", "btopenworld.com", "sky.com", "aol.com", "proton.me", "protonmail.com",
  "facebook.com", "fb.com", "instagram.com", "linktr.ee", "linkedin.com", "twitter.com", "x.com", "tiktok.com", "youtube.com", "google.com",
  "wixsite.com", "wordpress.com", "squarespace.com", "weebly.com", "godaddysites.com", "business.site", "sites.google.com", "carrd.co",
  "ubereats.com", "just-eat.co.uk", "deliveroo.co.uk", "opentable.com", "tripadvisor.co.uk", "tripadvisor.com", "yell.com", "yelp.com",
]);
const SECOND_LEVEL = new Set(["co.uk", "org.uk", "me.uk", "ltd.uk", "plc.uk", "gov.uk", "ac.uk", "sch.uk", "com.au", "co.nz", "co.za", "com.br", "co.in", "co.jp"]);

/// The domain a website belongs to ("www.maguro-restaurant.com" -> "maguro-restaurant.com"), or "" when it is missing or is not a
/// business's own domain (a social page, a free-mail address, a website-builder subdomain).
export function businessDomain(website: string): string {
  let host = "";
  try {
    host = new URL(/^[a-z]+:\/\//i.test(website.trim()) ? website.trim() : `https://${website.trim()}`).hostname.toLowerCase();
  } catch { return ""; }
  host = host.replace(/^www\./, "");
  const parts = host.split(".");
  if (parts.length < 2) return "";
  const two = parts.slice(-2).join(".");
  const reg = SECOND_LEVEL.has(two) && parts.length >= 3 ? parts.slice(-3).join(".") : two;
  if (NOT_OWN_DOMAIN.has(reg) || NOT_OWN_DOMAIN.has(host)) return "";
  return reg;
}

const emailDomainMatches = (email: string, domain: string): boolean => {
  const d = email.split("@")[1]?.toLowerCase() ?? "";
  return !!d && (d === domain || d.endsWith(`.${domain}`));
};

const hashCode = (cardId: string, code: string) => crypto.createHash("sha256").update(`${cardId}:${code}`).digest("hex");

export async function isCardVerified(cardId: string): Promise<boolean> {
  await ensureSchema();
  const rows = (await sql`SELECT verified_at, org_id FROM tapcard_cards WHERE id = ${cardId}`.catch(() => [])) as { verified_at: string | null; org_id?: string | null }[];
  return !!rows[0]?.verified_at || !!rows[0]?.org_id;
}

/// What the apps and the card page show: verified or not, and the domain it was verified for.
export async function verifyStatus(cardId: string): Promise<{ verified: boolean; domain: string; ownDomain: string; enforced: boolean; company: boolean }> {
  await ensureSchema();
  const rows = (await sql`SELECT verified_at, verified_domain, website, org_id FROM tapcard_cards WHERE id = ${cardId}`.catch(() => [])) as
    { verified_at: string | null; verified_domain: string; website: string; org_id?: string | null }[];
  const r = rows[0];
  return { verified: !!r?.verified_at || !!r?.org_id, domain: r?.verified_domain ?? "", ownDomain: businessDomain(r?.website ?? ""), enforced: verifyEnforced(), company: !!r?.org_id };
}

/// Posting offers or news needs a verified card, once the rule is switched on. Personal cards and company cards are not held to it.
export async function postingAllowed(cardId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!verifyEnforced()) return { ok: true };
  if (await isCardVerified(cardId)) return { ok: true };
  return { ok: false, error: "Verify your business first: we email a code to an address on your website's domain." };
}

export async function startVerification(card: TapCardRecord, emailRaw: string): Promise<{ ok: true; domain: string } | { ok: false; error: string; code?: string }> {
  await ensureSchema();
  // Codes and the addresses they were sent to are kept for 30 days, and closed reports for a year, then deleted.
  await sql`DELETE FROM tapcard_verifications WHERE created_at < now() - interval '30 days'`.catch(() => {});
  await sql`DELETE FROM tapcard_reports WHERE status <> 'open' AND created_at < now() - interval '365 days'`.catch(() => {});
  const email = emailRaw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { ok: false, error: "Enter a full email address.", code: "bad_email" };
  const domain = businessDomain(card.website);
  if (!domain) return { ok: false, error: "Add your own website to the card first (not a social page). The code goes to an address on that website's domain.", code: "no_domain" };
  if (!emailDomainMatches(email, domain)) return { ok: false, error: `The address must end in @${domain}, so we know the business is yours.`, code: "wrong_domain" };
  const taken = (await sql`SELECT id FROM tapcard_cards WHERE verified_domain = ${domain} AND id <> ${card.id} LIMIT 1`) as { id: string }[];
  if (taken.length) return { ok: false, error: "Another TapCard for this business is already verified. Contact TapCard support if it is yours.", code: "domain_taken" };
  const recent = (await sql`SELECT count(*)::int AS n FROM tapcard_verifications WHERE card_id = ${card.id} AND created_at > now() - interval '1 hour'`) as { n: number }[];
  if ((recent[0]?.n ?? 0) >= 3) return { ok: false, error: "Too many codes requested. Try again in an hour.", code: "rate" };
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  await sql`INSERT INTO tapcard_verifications (card_id, email, domain, code_hash, expires_at) VALUES (${card.id}, ${email}, ${domain}, ${hashCode(card.id, code)}, now() + interval '15 minutes')`;
  const name = (card.company || card.name || "your business").replace(/</g, "&lt;");
  await send(email, `Your TapCard code: ${code}`,
    `<p>Your code to verify <strong>${name}</strong> on TapCard is:</p><p style="font-size:28px;letter-spacing:4px"><strong>${code}</strong></p><p>It works for 15 minutes. If you did not ask for it, ignore this email.</p>`,
    `Your code to verify ${card.company || card.name} on TapCard is ${code}. It works for 15 minutes. If you did not ask for it, ignore this email.`);
  return { ok: true, domain };
}

export async function confirmVerification(card: TapCardRecord, codeRaw: string): Promise<{ ok: true; domain: string } | { ok: false; error: string; code?: string }> {
  await ensureSchema();
  const code = codeRaw.replace(/\D/g, "").slice(0, 6);
  const rows = (await sql`SELECT id, domain, code_hash, attempts FROM tapcard_verifications
    WHERE card_id = ${card.id} AND used = false AND expires_at > now() ORDER BY created_at DESC LIMIT 1`) as { id: number; domain: string; code_hash: string; attempts: number }[];
  const v = rows[0];
  if (!v) return { ok: false, error: "That code has expired. Ask for a new one.", code: "expired" };
  if (v.attempts >= 5) return { ok: false, error: "Too many wrong tries. Ask for a new code.", code: "attempts" };
  if (code.length !== 6 || !crypto.timingSafeEqual(Buffer.from(v.code_hash), Buffer.from(hashCode(card.id, code)))) {
    await sql`UPDATE tapcard_verifications SET attempts = attempts + 1 WHERE id = ${v.id}`;
    return { ok: false, error: "That code is not right.", code: "wrong" };
  }
  const taken = (await sql`SELECT id FROM tapcard_cards WHERE verified_domain = ${v.domain} AND id <> ${card.id} LIMIT 1`) as { id: string }[];
  if (taken.length) return { ok: false, error: "Another TapCard for this business was verified first. Contact TapCard support.", code: "domain_taken" };
  await sql`UPDATE tapcard_verifications SET used = true WHERE id = ${v.id}`;
  await sql`UPDATE tapcard_cards SET verified_at = now(), verified_domain = ${v.domain} WHERE id = ${card.id}`;
  return { ok: true, domain: v.domain };
}

export async function unverify(cardId: string): Promise<void> {
  await ensureSchema();
  await sql`UPDATE tapcard_cards SET verified_at = NULL, verified_domain = '' WHERE id = ${cardId}`;
}

/// Is this business already on TapCard? Matches a business card by its website's domain and then its phone number or name.
/// Returns public facts only (id, name, whether verified); a verified card wins over an unverified one.
export async function matchBusiness(input: { website?: string; phone?: string; name?: string }): Promise<{ id: string; name: string; verified: boolean } | null> {
  await ensureSchema();
  const domain = businessDomain(input.website ?? "");
  if (!domain) return null;
  const rows = (await sql`SELECT id, name, company, phone, website, verified_at, card_kind FROM tapcard_cards
    WHERE lower(website) LIKE ${"%" + domain + "%"} AND (card_kind = 'business' OR company <> '') ORDER BY (verified_at IS NULL), created_at LIMIT 20`) as
    { id: string; name: string; company: string; phone: string; website: string; verified_at: string | null }[];
  const digits = (s: string) => s.replace(/\D/g, "").slice(-9);
  const wantPhone = digits(input.phone ?? "");
  const wantName = (input.name ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const r of rows) {
    if (businessDomain(r.website) !== domain) continue;
    const phoneOk = wantPhone.length >= 7 && digits(r.phone) === wantPhone;
    const hay = `${r.company}${r.name}`.toLowerCase().replace(/[^a-z0-9]/g, "");
    const nameOk = wantName.length >= 4 && (hay.includes(wantName) || wantName.includes(hay.slice(0, Math.max(4, hay.length))));
    if (phoneOk || nameOk) return { id: r.id, name: r.company || r.name, verified: !!r.verified_at };
  }
  return null;
}

export const REPORT_REASONS = ["fake_business", "offensive", "wrong_details", "scam_offer", "other"] as const;

export async function saveReport(cardId: string, reason: string, details: string): Promise<boolean> {
  await ensureSchema();
  if (!(await getCard(cardId))) return false;
  const r = (REPORT_REASONS as readonly string[]).includes(reason) ? reason : "other";
  await sql`INSERT INTO tapcard_reports (card_id, reason, details) VALUES (${cardId}, ${r}, ${details.slice(0, 1000)})`;
  const open = (await sql`SELECT count(*)::int AS n FROM tapcard_reports WHERE card_id = ${cardId} AND status = 'open'`) as { n: number }[];
  await send("enquiries@aiert.co.uk", `TapCard report (${r}) for ${cardId}`,
    `<p>A card was reported: <a href="https://tapcard.aiert.co.uk/c/${cardId}">https://tapcard.aiert.co.uk/c/${cardId}</a></p><p>Reason: ${r}</p><p>${details.slice(0, 1000).replace(/</g, "&lt;")}</p><p>Open reports on this card: ${open[0]?.n ?? 1}. See the admin, Social, Verifications.</p>`,
    `Card ${cardId} reported (${r}). ${details.slice(0, 1000)}`).catch(() => {});
  return true;
}

export async function listVerificationAdmin(): Promise<{ verified: { id: string; company: string; name: string; domain: string; at: string }[]; reports: { id: number; card_id: string; reason: string; details: string; status: string; created_at: string; company: string; name: string }[] }> {
  await ensureSchema();
  const verified = (await sql`SELECT id, company, name, verified_domain AS domain, verified_at AS at FROM tapcard_cards WHERE verified_at IS NOT NULL ORDER BY verified_at DESC LIMIT 200`) as never;
  const reports = (await sql`SELECT r.id, r.card_id, r.reason, r.details, r.status, r.created_at, COALESCE(c.company,'') AS company, COALESCE(c.name,'') AS name
    FROM tapcard_reports r LEFT JOIN tapcard_cards c ON c.id = r.card_id ORDER BY (r.status = 'open') DESC, r.created_at DESC LIMIT 200`) as never;
  return { verified, reports };
}

export async function resolveReport(id: number, status: "resolved" | "dismissed"): Promise<void> {
  await ensureSchema();
  await sql`UPDATE tapcard_reports SET status = ${status} WHERE id = ${id}`;
}

// ---- Verifying from the website itself (no email needed) ----
// The owner adds one line to their own website: a <meta name="tapcard-verification"> tag, a file at /.well-known/tapcard.txt, or a link to
// their TapCard page. The token is derived from the card and its secret, so only the card's owner can ask for it. We check the page
// when the owner asks and, quietly, whenever they open the verify screen.

export function proofToken(card: TapCardRecord, domain: string): string {
  return crypto.createHash("sha256").update(`tapcard-proof:${card.id}:${domain}:${card.edit_token_hash ?? ""}`).digest("hex").slice(0, 20);
}

export function proofInstructions(card: TapCardRecord): { domain: string; token: string; metaTag: string; filePath: string; linkExample: string } | null {
  const domain = businessDomain(card.website);
  if (!domain) return null;
  const token = proofToken(card, domain);
  return {
    domain, token,
    metaTag: `<meta name="tapcard-verification" content="${token}">`,
    filePath: `https://${domain}/.well-known/tapcard.txt`,
    linkExample: `https://tapcard.aiert.co.uk/c/${card.id}`,
  };
}

const lastAuto = new Map<string, number>();

export async function checkWebsiteProof(card: TapCardRecord, opts: { quiet?: boolean } = {}): Promise<{ ok: true; domain: string } | { ok: false; error: string; code?: string }> {
  await ensureSchema();
  const domain = businessDomain(card.website);
  if (!domain) return { ok: false, error: "Add your own website to the card first (not a social page).", code: "no_domain" };
  if (opts.quiet) {
    const last = lastAuto.get(card.id) ?? 0;
    if (Date.now() - last < 15 * 60_000) return { ok: false, error: "recently checked", code: "recent" };
    lastAuto.set(card.id, Date.now());
  }
  const token = proofToken(card, domain);
  const hosts = [domain, `www.${domain}`];
  let found = false;
  for (const host of hosts) {
    for (const path of ["/.well-known/tapcard.txt", "/"]) {
      const got = await safeFetch(`https://${host}${path}`).catch(() => null);
      if (!got || !got.res.ok) continue;
      const body = (await readLimited(got.res, 1024 * 1024).catch(() => null))?.toString("utf8") ?? "";
      if (body.includes(token) || (path === "/" && body.toLowerCase().includes(`/c/${card.id}`.toLowerCase()))) { found = true; break; }
    }
    if (found) break;
  }
  if (!found) return { ok: false, error: "We couldn't find the line on your website yet. It can take a few minutes to appear.", code: "not_found" };
  const taken = (await sql`SELECT id FROM tapcard_cards WHERE verified_domain = ${domain} AND id <> ${card.id} LIMIT 1`) as { id: string }[];
  if (taken.length) return { ok: false, error: "Another TapCard for this business was verified first. Contact TapCard support.", code: "domain_taken" };
  await sql`UPDATE tapcard_cards SET verified_at = now(), verified_domain = ${domain} WHERE id = ${card.id}`;
  return { ok: true, domain };
}
