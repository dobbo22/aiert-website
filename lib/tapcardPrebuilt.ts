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

export async function buildPrebuiltCard(name: string, website: string): Promise<PrebuiltCard> {
  const found = website ? await findSiteLinks(website, "", name).catch(() => null) : null;
  const d = found?.details ?? {};
  const single = !!found && found.branches.length === 0;
  const url = website && !/^https?:\/\//i.test(website) ? `https://${website}` : website;
  return {
    name,
    company: name,
    website: url,
    address: single ? d.address ?? "" : "",
    phone: single ? d.phone ?? "" : "",
    label: "Business",
    cardKind: "business",
    links: sanitizeLinks(found?.links ?? []).slice(0, 10),
    facebookUrl: d.facebook ?? "",
    instagramUrl: d.instagram ?? "",
    twitterUrl: d.twitter ?? "",
    linkedInUrl: d.linkedin ?? "",
    tiktokUrl: d.tiktok ?? "",
    branchCount: found?.branches.length ?? 0,
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
