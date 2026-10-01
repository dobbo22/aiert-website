import crypto from "crypto";
import sql from "@/lib/db";

// TapCard invite campaign: personalised "free gift" messages sent to Martin's
// own contacts by email (Resend) or WhatsApp (wa.me, sent by hand), each
// with its own tracked link — tapcard.aiert.co.uk/i/<token> — so the admin
// Invites tab can show who was sent what, by which medium, and who clicked
// through to the App Store / Play Store. Installs can't be tied to a person
// (the stores don't expose that); they're compared per campaign + medium
// instead, via App Store campaign tokens (ct=) and Play referrer UTMs.

export const TAPCARD_APP_STORE_ID = "6816003159";
export const TAPCARD_PLAY_PACKAGE = "com.mailbroom.tapcard";
export const INVITE_LINK_ORIGIN = "https://tapcard.aiert.co.uk";

export {
  DEFAULT_CAMPAIGN,
  DEFAULT_EMAIL_SUBJECT,
  DEFAULT_EMAIL_TEMPLATE,
  DEFAULT_WHATSAPP_TEMPLATE,
  HOW_IT_WORKS_URL,
  INVITE_CHANNELS,
  PERSONAL_NOTE_MARKER,
  personalise,
  whatsappNumber,
} from "@/lib/inviteTemplates";
export type { InviteChannel } from "@/lib/inviteTemplates";
import { whatsappNumber } from "@/lib/inviteTemplates";

export type InviteContact = {
  id: number;
  name: string;
  first_name: string;
  email: string;
  phone: string;
  company: string;
  do_not_contact: boolean;
};

let schemaReady: Promise<unknown> | null = null;
// Same self-creating schema approach as lib/tapcardDb.ts: production's
// DATABASE_URL can't be read out to run migrations from outside the app.
export function ensureInviteSchema(): Promise<unknown> {
  if (!schemaReady) {
    schemaReady = sql`
      CREATE TABLE IF NOT EXISTS tapcard_invite_contacts (
        id SERIAL PRIMARY KEY,
        dedupe_key TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL DEFAULT '',
        first_name TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        company TEXT NOT NULL DEFAULT '',
        do_not_contact BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `
      .then(() => sql`
        CREATE TABLE IF NOT EXISTS tapcard_invite_sends (
          id SERIAL PRIMARY KEY,
          token TEXT NOT NULL UNIQUE,
          contact_id INTEGER NOT NULL REFERENCES tapcard_invite_contacts(id) ON DELETE CASCADE,
          channel TEXT NOT NULL,
          campaign TEXT NOT NULL,
          subject TEXT NOT NULL DEFAULT '',
          message TEXT NOT NULL,
          resend_id TEXT,
          sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          delivered_at TIMESTAMPTZ,
          opened_at TIMESTAMPTZ,
          bounced_at TIMESTAMPTZ,
          first_click_at TIMESTAMPTZ,
          last_click_at TIMESTAMPTZ,
          click_count INTEGER NOT NULL DEFAULT 0,
          last_platform TEXT
        )
      `)
      .then(() => sql`
        CREATE TABLE IF NOT EXISTS tapcard_invite_clicks (
          id BIGSERIAL PRIMARY KEY,
          send_id INTEGER NOT NULL REFERENCES tapcard_invite_sends(id) ON DELETE CASCADE,
          clicked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          platform TEXT NOT NULL,
          country TEXT
        )
      `)
      .then(() => sql`
        CREATE TABLE IF NOT EXISTS tapcard_invite_store_stats (
          campaign_token TEXT NOT NULL,
          store TEXT NOT NULL,
          installs INTEGER NOT NULL DEFAULT 0,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          PRIMARY KEY (campaign_token, store)
        )
      `)
      // Telling the recipient's own clicks from forwarded ones: each click
      // carries a visitor cookie id and a fallback fingerprint (truncated IP
      // + browser), and is_forward marks clicks by anyone other than the
      // first clicker. source = 'share' is the separate pass-it-on link.
      .then(() => sql`ALTER TABLE tapcard_invite_clicks ADD COLUMN IF NOT EXISTS visitor_id TEXT`)
      .then(() => sql`ALTER TABLE tapcard_invite_clicks ADD COLUMN IF NOT EXISTS fingerprint TEXT`)
      .then(() => sql`ALTER TABLE tapcard_invite_clicks ADD COLUMN IF NOT EXISTS is_forward BOOLEAN NOT NULL DEFAULT false`)
      .then(() => sql`ALTER TABLE tapcard_invite_clicks ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'direct'`)
      // "Tell me when TapCard is on Android": one row per person (dedupe_key
      // is c:<contact id> from an invite link, or e:<email> from the public
      // form), with notified_at set once they've been told.
      .then(() => sql`
        CREATE TABLE IF NOT EXISTS tapcard_android_waitlist (
          id SERIAL PRIMARY KEY,
          dedupe_key TEXT NOT NULL UNIQUE,
          contact_id INTEGER REFERENCES tapcard_invite_contacts(id) ON DELETE CASCADE,
          send_id INTEGER REFERENCES tapcard_invite_sends(id) ON DELETE SET NULL,
          email TEXT NOT NULL DEFAULT '',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          notified_at TIMESTAMPTZ
        )
      `)
      .catch((err) => {
        schemaReady = null;
        throw err;
      });
  }
  return schemaReady;
}

export function newInviteToken(): string {
  // Short enough for a tidy WhatsApp link, unguessable enough that nobody
  // can walk the token space and inflate someone else's click count.
  return crypto.randomBytes(6).toString("base64url");
}

export function inviteLink(token: string): string {
  return `${INVITE_LINK_ORIGIN}/i/${token}`;
}

/// The "pass it on" link in the same message: same token, different path,
/// so clicks on it count as referrals by this person rather than their own
/// clicks — and get their own App Store campaign token (<campaign>-share).
export function shareLink(token: string): string {
  return `${INVITE_LINK_ORIGIN}/p/${token}`;
}

export type InviteSource = "direct" | "share";

/// "Tell me when TapCard is on Android" in the email: same token, so a
/// sign-up is tied to the person it was sent to.
export function androidWaitlistLink(token: string): string {
  return `${INVITE_LINK_ORIGIN}/w/${token}`;
}

/// Adds someone to the Android waitlist. Returns false for a bad email.
export async function joinAndroidWaitlist(entry: { email: string; contactId?: number; sendId?: number }): Promise<boolean> {
  const email = entry.email.trim().toLowerCase().slice(0, 200);
  if (!entry.contactId && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  await ensureInviteSchema();
  const key = entry.contactId ? `c:${entry.contactId}` : `e:${email}`;
  await sql`
    INSERT INTO tapcard_android_waitlist (dedupe_key, contact_id, send_id, email)
    VALUES (${key}, ${entry.contactId ?? null}, ${entry.sendId ?? null}, ${email})
    ON CONFLICT (dedupe_key) DO UPDATE
      SET email = CASE WHEN EXCLUDED.email <> '' THEN EXCLUDED.email ELSE tapcard_android_waitlist.email END
  `;
  return true;
}


/// App Store campaign token (ct=, max 40 chars) — what App Store Connect →
/// Analytics → Acquisition → Campaigns reports installs against.
export function campaignToken(campaign: string, channel: string): string {
  return `${campaign}-${channel}`
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .slice(0, 40);
}

export function appStoreUrl(campaign: string, channel: string): string {
  // Campaign links need the App Store Connect provider token (Analytics →
  // Campaigns → "Generate a campaign link" shows it as pt=). Without it the
  // link still works, it just isn't attributed.
  const pt = process.env.TAPCARD_APPSTORE_PROVIDER_TOKEN;
  if (!pt) return `https://apps.apple.com/app/id${TAPCARD_APP_STORE_ID}`;
  const params = new URLSearchParams({ pt, ct: campaignToken(campaign, channel), mt: "8" });
  return `https://apps.apple.com/app/apple-store/id${TAPCARD_APP_STORE_ID}?${params}`;
}

export function playStoreUrl(campaign: string, channel: string): string {
  const referrer = `utm_source=invite&utm_medium=${channel}&utm_campaign=${campaign}`;
  return `https://play.google.com/store/apps/details?id=${TAPCARD_PLAY_PACKAGE}&referrer=${encodeURIComponent(referrer)}`;
}

/// Flip TAPCARD_PLAY_LIVE=1 in Vercel once Google approves the listing —
/// until then Android clicks get the landing page rather than a Play 404.
export function playStoreLive(): boolean {
  return process.env.TAPCARD_PLAY_LIVE === "1";
}

export type InvitePlatform = "ios" | "android" | "desktop";

export function platformFromUserAgent(ua: string): InvitePlatform {
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

/// Link-preview fetchers (WhatsApp, iMessage, email security scanners)
/// request the link the moment it's sent — those aren't the person clicking.
export function isBotUserAgent(ua: string): boolean {
  if (!ua) return true;
  return /bot|crawler|spider|preview|WhatsApp|facebookexternalhit|Facebot|Slackbot|TelegramBot|Twitterbot|LinkedInBot|Discordbot|Applebot|Google-PageRenderer|GoogleImageProxy|curl|wget|python|node-fetch|axios|HeadlessChrome|Barracuda|Mimecast|Proofpoint|ZScaler/i.test(
    ua,
  );
}

export function dedupeKey(email: string, phone: string): string | null {
  if (email.trim()) return `e:${email.trim().toLowerCase()}`;
  const wa = whatsappNumber(phone);
  return wa ? `p:${wa}` : null;
}

/// Zeroes the host part of the IP (as /api/track-click does) before it's
/// hashed into the fallback fingerprint — no raw IP is used or stored.
function truncateIp(ip: string): string {
  if (ip.includes(":")) return ip.split(":").slice(0, 4).join(":");
  return ip.split(".").slice(0, 3).join(".");
}

export function clickFingerprint(ip: string, ua: string): string {
  return crypto.createHash("sha256").update(`${truncateIp(ip)}|${ua}`).digest("hex").slice(0, 16);
}

/// Logs one click on an invite link. On the main link (/i/) the first
/// person to click is taken to be the recipient; later clicks from a
/// different visitor (no matching cookie id and no matching fingerprint)
/// are forwarded clicks, counted separately. Pass-it-on (/p/) clicks are
/// always referrals.
export async function recordInviteClick(
  token: string,
  click: { ua: string; country: string | null; visitorId: string; fingerprint: string; source: InviteSource },
) {
  const platform = platformFromUserAgent(click.ua);
  await ensureInviteSchema();
  const send = ((await sql`SELECT id FROM tapcard_invite_sends WHERE token = ${token}`) as { id: number }[])[0];
  if (!send) return;

  let isForward = false;
  if (click.source === "direct") {
    const first = ((await sql`
      SELECT visitor_id, fingerprint FROM tapcard_invite_clicks
      WHERE send_id = ${send.id} AND source = 'direct'
      ORDER BY clicked_at LIMIT 1
    `) as { visitor_id: string | null; fingerprint: string | null }[])[0];
    // Clicks logged before visitor ids existed have neither — treat those
    // as the recipient's rather than guessing.
    if (first && (first.visitor_id || first.fingerprint)) {
      const sameVisitor = first.visitor_id === click.visitorId || first.fingerprint === click.fingerprint;
      isForward = !sameVisitor;
    }
  }

  await sql`
    INSERT INTO tapcard_invite_clicks (send_id, platform, country, visitor_id, fingerprint, is_forward, source)
    VALUES (${send.id}, ${platform}, ${click.country}, ${click.visitorId}, ${click.fingerprint}, ${isForward}, ${click.source})
  `;
  if (click.source === "direct" && !isForward) {
    await sql`
      UPDATE tapcard_invite_sends
      SET click_count = click_count + 1,
          first_click_at = COALESCE(first_click_at, now()),
          last_click_at = now(),
          last_platform = ${platform}
      WHERE id = ${send.id}
    `;
  }
}

export async function getSendByToken(token: string) {
  await ensureInviteSchema();
  const rows = (await sql`
    SELECT s.id, s.channel, s.campaign, s.contact_id, c.first_name, c.name, c.email
    FROM tapcard_invite_sends s JOIN tapcard_invite_contacts c ON c.id = s.contact_id
    WHERE s.token = ${token}
  `) as { id: number; channel: string; campaign: string; contact_id: number; first_name: string; name: string; email: string }[];
  return rows[0] ?? null;
}
