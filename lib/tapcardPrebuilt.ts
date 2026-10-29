import crypto from "crypto";
import { lookup } from "dns/promises";
import sql from "@/lib/db";
import { findSiteLinks } from "@/lib/siteLinks";
import { sanitizeLinks, type CardLink } from "@/lib/tapcardLinks";
import { dedupeKey, ensureInviteSchema } from "@/lib/tapcardInvites";

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
    `.then(async () => {
      // What happened after the email: opened the link, tapped a store button, opened the app with the card.
      await sql`ALTER TABLE tapcard_prebuilt ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT ''`;
      await sql`ALTER TABLE tapcard_prebuilt ADD COLUMN IF NOT EXISTS link_opened_at TIMESTAMPTZ`;
      await sql`ALTER TABLE tapcard_prebuilt ADD COLUMN IF NOT EXISTS link_opens INTEGER NOT NULL DEFAULT 0`;
      await sql`ALTER TABLE tapcard_prebuilt ADD COLUMN IF NOT EXISTS store_clicked_at TIMESTAMPTZ`;
      await sql`ALTER TABLE tapcard_prebuilt ADD COLUMN IF NOT EXISTS store_platform TEXT`;
      await sql`ALTER TABLE tapcard_prebuilt ADD COLUMN IF NOT EXISTS app_platform TEXT`;
      // Everyone who pressed "Build my TapCard": captured then, whether or not they ask for the emailed link.
      await sql`
        CREATE TABLE IF NOT EXISTS tapcard_demo_leads (
          id SERIAL PRIMARY KEY,
          email TEXT NOT NULL,
          business_name TEXT NOT NULL,
          website TEXT NOT NULL DEFAULT '',
          kind TEXT NOT NULL DEFAULT '',
          ip_hash TEXT,
          consent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          link_sent_at TIMESTAMPTZ
        )
      `;
      // They ticked the separate, optional box to hear about TapCard in future. Without it, only the link they asked for.
      await sql`ALTER TABLE tapcard_demo_leads ADD COLUMN IF NOT EXISTS marketing_ok BOOLEAN NOT NULL DEFAULT false`;
    }).catch((e) => { ready = null; throw e; });
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
// `checkSite`: the website came from a map listing rather than from the person, so a site that only lists other places (Google gives
// the Fulham Ocean Catch the Islington shop's site) is left out: `wrongSite` is then true and the card is built without a website.
export async function buildPrebuiltCard(name: string, website: string, address = "", checkSite = false): Promise<{ card: PrebuiltCard; branches: SiteBranchChoice[]; wrongSite?: boolean }> {
  let found = website ? await findSiteLinks(website, address, name).catch(() => null) : null;
  const wrongSite = !!(checkSite && found?.otherPlaceOnly);
  if (wrongSite) { found = null; website = ""; }
  const d = found?.details ?? {};
  const branches = found?.branches ?? [];
  const url = website && !/^https?:\/\//i.test(website) ? `https://${website}` : website;
  const links = sanitizeLinks(found?.links ?? []);
  return {
    branches,
    wrongSite,
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

export async function storePrebuilt(email: string, name: string, website: string, payload: PrebuiltCard, ipHash: string | null, kind = ""): Promise<string> {
  await ensureSchema();
  const token = crypto.randomBytes(16).toString("base64url");
  await sql`
    INSERT INTO tapcard_prebuilt (token, email, business_name, website, payload, ip_hash, kind)
    VALUES (${token}, ${email}, ${name}, ${website}, ${JSON.stringify(payload)}::jsonb, ${ipHash}, ${kind})
  `;
  // Keep nothing for long: a link is good for 30 days, rows go after 60.
  await sql`DELETE FROM tapcard_prebuilt WHERE created_at < now() - ${`${DEMO_RETENTION_DAYS} days`}::interval`;
  return token;
}

/// The card for a token, if it exists and is not older than 30 days. The email is never returned.
export async function getPrebuilt(token: string, userAgent = ""): Promise<PrebuiltCard | null> {
  if (!/^[A-Za-z0-9_-]{16,40}$/.test(token)) return null;
  await ensureSchema();
  const rows = (await sql`
    SELECT payload FROM tapcard_prebuilt WHERE token = ${token} AND created_at > now() - ${TTL_DAYS + " days"}::interval
  `) as { payload: PrebuiltCard }[];
  if (!rows[0]) return null;
  // Only the apps read this, so a read means TapCard is installed and was opened with this card.
  const platform = /android|okhttp|dalvik/i.test(userAgent) ? "android" : /cfnetwork|darwin|iphone|ios/i.test(userAgent) ? "ios" : "";
  await sql`UPDATE tapcard_prebuilt SET claimed_at = COALESCE(claimed_at, now()), app_platform = COALESCE(app_platform, NULLIF(${platform}, '')) WHERE token = ${token}`;
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


export type DemoEvent = "opened" | "store";

/// The emailed link was opened, or a store button on its page was tapped (first times are kept, opens are counted).
export async function recordDemoEvent(token: string, event: DemoEvent, platform: string): Promise<void> {
  if (!/^[A-Za-z0-9_-]{16,40}$/.test(token)) return;
  await ensureSchema();
  const plat = platform === "ios" || platform === "android" ? platform : "";
  if (event === "opened") {
    await sql`UPDATE tapcard_prebuilt SET link_opened_at = COALESCE(link_opened_at, now()), link_opens = link_opens + 1 WHERE token = ${token}`;
  } else {
    await sql`UPDATE tapcard_prebuilt SET store_clicked_at = COALESCE(store_clicked_at, now()), store_platform = COALESCE(store_platform, NULLIF(${plat}, '')) WHERE token = ${token}`;
  }
}

export interface DemoLeadRow {
  created_at: string; email: string; business_name: string; website: string; kind: string; link_sent_at: string | null; marketing_ok: boolean;
  link_opened_at: string | null; link_opens: number | null; store_clicked_at: string | null; store_platform: string | null;
  claimed_at: string | null; app_platform: string | null;
}

export async function listDemoLeads(): Promise<DemoLeadRow[]> {
  await ensureSchema();
  return (await sql`
    SELECT l.created_at, l.email, l.business_name, l.website, l.kind, l.link_sent_at, l.marketing_ok,
           p.link_opened_at, p.link_opens, p.store_clicked_at, p.store_platform, p.claimed_at, p.app_platform
    FROM tapcard_demo_leads l
    LEFT JOIN LATERAL (
      SELECT link_opened_at, link_opens, store_clicked_at, store_platform, claimed_at, app_platform
      FROM tapcard_prebuilt p WHERE lower(p.email) = lower(l.email) AND p.business_name = l.business_name
      ORDER BY p.created_at DESC LIMIT 1
    ) p ON true
    ORDER BY l.created_at DESC LIMIT 200
  `) as DemoLeadRow[];
}

/// The demo visitor's email goes into Links & Invites (admin/social/links) as a contact, kind "demo", so they can be
/// followed up from there. An existing contact for that email is left as it is.
export async function recordDemoContact(email: string, business: string, website: string, address: string, marketingOk = false): Promise<void> {
  const key = dedupeKey(email, "");
  if (!key) return;
  await ensureInviteSchema();
  await sql`
    INSERT INTO tapcard_invite_contacts (dedupe_key, name, email, company, website, address, kind, do_not_contact)
    VALUES (${key}, ${business}, ${email}, ${business}, ${website}, ${address}, 'demo', ${!marketingOk})
    ON CONFLICT (dedupe_key) DO NOTHING
  `;
  // A later build with the box ticked opens the contact up to marketing; unticking never closes it (they have to unsubscribe).
  if (marketingOk) await sql`UPDATE tapcard_invite_contacts SET do_not_contact = false WHERE dedupe_key = ${key} AND kind = 'demo'`;
}


// ---- Is the website real? -------------------------------------------------------------------------------------------

const TYPO_FIXES: [RegExp, string][] = [
  [/\.cco\.uk$/, ".co.uk"], [/\.coo\.uk$/, ".co.uk"], [/\.co\.ukk$/, ".co.uk"], [/\.co\.u$/, ".co.uk"], [/\.couk$/, ".co.uk"],
  [/\.c\.uk$/, ".co.uk"], [/\.cok\.uk$/, ".co.uk"], [/\.co\.uk\.$/, ".co.uk"], [/\.org\.ukk$/, ".org.uk"],
  [/\.con$/, ".com"], [/\.comm$/, ".com"], [/\.cmo$/, ".com"], [/\.ocm$/, ".com"], [/\.vom$/, ".com"], [/\.xom$/, ".com"],
  [/\.nett$/, ".net"], [/\.ent$/, ".net"],
];

async function resolves(host: string): Promise<boolean> {
  try {
    await Promise.race([lookup(host), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 4000))]);
    return true;
  } catch {
    return false;
  }
}

export function hostOfWebsite(raw: string): string {
  try {
    return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/// Does this website name exist at all (DNS)? If not, and it looks like a common typo, the corrected name when that one
/// exists. A site that refuses bots still counts as existing: only a name that does not resolve is rejected.
export async function checkWebsite(raw: string): Promise<{ ok: boolean; suggestion?: string }> {
  const host = hostOfWebsite(raw);
  if (!host || !host.includes(".")) return { ok: false };
  if (await resolves(host)) return { ok: true };
  for (const [re, fix] of TYPO_FIXES) {
    if (!re.test(host)) continue;
    const alt = host.replace(re, fix);
    if (alt !== host && (await resolves(alt))) return { ok: false, suggestion: alt.replace(/^www\./, "") };
  }
  return { ok: false };
}


// ---- Capture and retention -----------------------------------------------------------------------------------------

/// How long demo details are kept. The privacy page says the same number: change both together.
export const DEMO_RETENTION_DAYS = 60;

/// Builds per connection per day, so the form can't be used to fill the list with junk.
const MAX_BUILDS_PER_IP_PER_DAY = 20;

/// The visitor pressed Build my TapCard: keep their email, business and website (once per email + website + day).
/// Returns false when this connection has built too many today.
export async function recordDemoLead(email: string, business: string, website: string, kind: string, ipHash: string | null, marketingOk = false): Promise<boolean> {
  await ensureSchema();
  if (ipHash) {
    const n = ((await sql`SELECT COUNT(*)::int AS n FROM tapcard_demo_leads WHERE ip_hash = ${ipHash} AND created_at > now() - interval '1 day'`) as { n: number }[])[0]?.n ?? 0;
    if (n >= MAX_BUILDS_PER_IP_PER_DAY) return false;
  }
  const dup = (await sql`
    SELECT 1 FROM tapcard_demo_leads
    WHERE lower(email) = ${email.toLowerCase()} AND business_name = ${business} AND website = ${website} AND created_at > now() - interval '1 day'
  `) as unknown[];
  if (!dup.length) {
    await sql`INSERT INTO tapcard_demo_leads (email, business_name, website, kind, ip_hash, marketing_ok) VALUES (${email}, ${business}, ${website}, ${kind}, ${ipHash}, ${marketingOk})`;
  } else if (marketingOk) {
    await sql`UPDATE tapcard_demo_leads SET marketing_ok = true WHERE lower(email) = ${email.toLowerCase()} AND business_name = ${business} AND website = ${website}`;
  }
  return true;
}

export async function markDemoLinkSent(email: string, business: string): Promise<void> {
  await ensureSchema();
  await sql`
    UPDATE tapcard_demo_leads SET link_sent_at = now()
    WHERE id = (SELECT id FROM tapcard_demo_leads WHERE lower(email) = ${email.toLowerCase()} AND business_name = ${business} ORDER BY id DESC LIMIT 1)
  `;
}

/// Deletes everything older than the retention period: leads, built cards, and demo contacts nobody has since emailed.
export async function purgeDemoData(): Promise<{ leads: number; cards: number; contacts: number }> {
  await ensureSchema();
  await ensureInviteSchema();
  const days = `${DEMO_RETENTION_DAYS} days`;
  const leads = (await sql`DELETE FROM tapcard_demo_leads WHERE created_at < now() - ${days}::interval RETURNING id`) as unknown[];
  const cards = (await sql`DELETE FROM tapcard_prebuilt WHERE created_at < now() - ${days}::interval RETURNING token`) as unknown[];
  const contacts = (await sql`
    DELETE FROM tapcard_invite_contacts c
    WHERE c.kind = 'demo' AND c.created_at < now() - ${days}::interval
      AND NOT EXISTS (SELECT 1 FROM tapcard_invite_sends s WHERE s.contact_id = c.id)
    RETURNING c.id
  `) as unknown[];
  return { leads: leads.length, cards: cards.length, contacts: contacts.length };
}
