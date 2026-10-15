import crypto from "crypto";
import sql from "@/lib/db";
import { findSiteLinks } from "@/lib/siteLinks";
import { sanitizeLinks, type CardLink } from "@/lib/tapcardLinks";

// "Build my TapCard" demo: a visitor types a business name, website and email; we build the card from the
// business's own website (the same finder the apps use), keep it under a secret token, and email the link. The apps
// read it back on first launch, so the person starts with their card already made.

export interface PrebuiltCard {
  name: string;
  company: string;
  website: string;
  address: string;
  phone: string;
  label: string;
  cardKind: "business";
  links: CardLink[];
  facebookUrl: string;
  instagramUrl: string;
  twitterUrl: string;
  linkedInUrl: string;
  tiktokUrl: string;
  /// Several addresses on the site: the person chooses in the app, so none is filled in.
  branchCount: number;
}

const TTL_DAYS = 30;
let ready: Promise<unknown> | null = null;
function ensureSchema(): Promise<unknown> {
  if (!ready) {
    ready = sql`
      CREATE TABLE IF NOT EXISTS tapcard_prebuilt (
        token TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        business_name TEXT NOT NULL,
        website TEXT NOT NULL DEFAULT '',
        payload JSONB NOT NULL,
        ip_hash TEXT,
        consent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        claimed_at TIMESTAMPTZ
      )
    `.catch((e) => { ready = null; throw e; });
  }
  return ready;
}

export function hashIp(ip: string): string | null {
  return ip ? crypto.createHash("sha256").update(`tapcard-prebuilt|${ip}`).digest("hex").slice(0, 32) : null;
}

export interface SiteBranchChoice { name: string; address: string; phone: string; hours: string }

/// `address` is what the visitor chose or typed (a branch's address, a town or a postcode): it picks the branch on a
/// multi-address site, so the card gets that address, phone and opening hours. With several addresses and none chosen,
/// `branches` lists them for the visitor to pick from.
export async function buildPrebuiltCard(name: string, website: string, address = ""): Promise<{ card: PrebuiltCard; branches: SiteBranchChoice[] }> {
  const found = website ? await findSiteLinks(website, address, name).catch(() => null) : null;
  const d = found?.details ?? {};
  const branches = found?.branches ?? [];
  const url = website && !/^https?:\/\//i.test(website) ? `https://${website}` : website;
  const links = sanitizeLinks(found?.links ?? []);
  return {
    branches,
    card: {
      name,
      company: name,
      website: url,
      // One address (or the chosen one): use it; otherwise what the visitor typed, else nothing.
      address: branches.length ? address : d.address ?? address,
      phone: branches.length ? "" : d.phone ?? "",
      label: "Business",
      cardKind: "business",
      links: links.slice(0, 10),
      facebookUrl: d.facebook ?? "",
      instagramUrl: d.instagram ?? "",
      twitterUrl: d.twitter ?? "",
      linkedInUrl: d.linkedin ?? "",
      tiktokUrl: d.tiktok ?? "",
      branchCount: branches.length,
    },
  };
}

export async function recentCounts(ipHash: string | null, email: string): Promise<{ byIp: number; byEmail: number }> {
  await ensureSchema();
  const ip = ipHash
    ? ((await sql`SELECT COUNT(*)::int AS n FROM tapcard_prebuilt WHERE ip_hash = ${ipHash} AND created_at > now() - interval '1 day'`) as { n: number }[])[0]?.n ?? 0
    : 0;
  const em = ((await sql`SELECT COUNT(*)::int AS n FROM tapcard_prebuilt WHERE lower(email) = ${email.toLowerCase()} AND created_at > now() - interval '1 day'`) as { n: number }[])[0]?.n ?? 0;
  return { byIp: ip, byEmail: em };
}

export async function storePrebuilt(email: string, name: string, website: string, payload: PrebuiltCard, ipHash: string | null): Promise<string> {
  await ensureSchema();
  const token = crypto.randomBytes(16).toString("base64url");
  await sql`
    INSERT INTO tapcard_prebuilt (token, email, business_name, website, payload, ip_hash)
    VALUES (${token}, ${email}, ${name}, ${website}, ${JSON.stringify(payload)}::jsonb, ${ipHash})
  `;
  // Keep nothing for long: a link is good for 30 days, rows go after 60.
  await sql`DELETE FROM tapcard_prebuilt WHERE created_at < now() - interval '60 days'`;
  return token;
}

/// The card for a token, if it exists and is not older than 30 days. The email is never returned.
export async function getPrebuilt(token: string): Promise<PrebuiltCard | null> {
  if (!/^[A-Za-z0-9_-]{16,40}$/.test(token)) return null;
  await ensureSchema();
  const rows = (await sql`
    SELECT payload FROM tapcard_prebuilt WHERE token = ${token} AND created_at > now() - ${TTL_DAYS + " days"}::interval
  `) as { payload: PrebuiltCard }[];
  if (!rows[0]) return null;
  await sql`UPDATE tapcard_prebuilt SET claimed_at = COALESCE(claimed_at, now()) WHERE token = ${token}`;
  return rows[0].payload;
}


/// What the visitor chose to keep on the card, by id: "phone", "address", "website", "link:<kind>", "social:<name>".
/// Anything not listed is dropped. `extra` are links they added themselves (https only).
export function applyChoices(card: PrebuiltCard, keep: string[] | null, extra: { label: string; value: string }[]): PrebuiltCard {
  const out: PrebuiltCard = { ...card };
  if (keep) {
    const k = new Set(keep);
    if (!k.has("phone")) out.phone = "";
    if (!k.has("address")) out.address = "";
    if (!k.has("website")) out.website = "";
    out.links = card.links.filter((l) => k.has(`link:${l.kind}`));
    if (!k.has("social:facebook")) out.facebookUrl = "";
    if (!k.has("social:instagram")) out.instagramUrl = "";
    if (!k.has("social:twitter")) out.twitterUrl = "";
    if (!k.has("social:linkedin")) out.linkedInUrl = "";
    if (!k.has("social:tiktok")) out.tiktokUrl = "";
  }
  const added = extra
    .map((e) => ({ kind: "custom" as const, label: e.label.trim().slice(0, 40), value: e.value.trim().slice(0, 300) }))
    .filter((e) => e.label && /^https:\/\/[^\s]+\.[^\s]+$/i.test(e.value));
  out.links = sanitizeLinks([...out.links, ...added]).slice(0, 10);
  return out;
}
